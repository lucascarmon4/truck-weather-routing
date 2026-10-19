import hashlib
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone

from django.core.cache import cache

from . import risk
from .alternatives import find_routes
from .analysis import analyze, build_checkpoints
from .errors import PlanningError
from .geo import METERS_PER_MILE, thin_indices
from .heatmap import HEATMAP_HOURS, build_heatmap, corridor_grid
from .hos import elapsed_time
from .providers import RouteQuery, get_provider
from .recommend import recommend
from .weather import OpenMeteoClient, floor_hour, forecast_horizon

logger = logging.getLogger(__name__)

PLAN_CACHE_TTL_SECONDS = 10 * 60
GEOMETRY_STEP_M = 400
ROUTE_IDS = "ABC"


@dataclass(frozen=True)
class Place:
    label: str
    lat: float
    lon: float


@dataclass(frozen=True)
class PlanRequest:
    origin: Place
    destination: Place
    departure: datetime
    load_lb: float
    interval_mi: int
    hos: bool = False

    def cache_key(self, provider_name):
        raw = json.dumps(
            {
                "o": [round(self.origin.lat, 4), round(self.origin.lon, 4)],
                "d": [round(self.destination.lat, 4), round(self.destination.lon, 4)],
                "t": self.departure.astimezone(timezone.utc).strftime("%Y%m%d%H%M"),
                "w": self.load_lb,
                "i": self.interval_mi,
                "h": self.hos,
                "p": provider_name,
            },
            sort_keys=True,
        )
        return "plan:" + hashlib.sha1(raw.encode()).hexdigest()


def plan(request: PlanRequest, provider=None, weather_client=None):
    provider = provider or get_provider()
    key = request.cache_key(provider.name)
    if (cached := cache.get(key)) is not None:
        return cached
    result = Planner(request, provider, weather_client or OpenMeteoClient()).run()
    cache.set(key, result, PLAN_CACHE_TTL_SECONDS)
    return result


class Planner:
    def __init__(self, request, provider, weather_client):
        self.request = request
        self.provider = provider
        self.weather = weather_client

    def run(self):
        req = self.request
        if req.departure < datetime.now(timezone.utc) - timedelta(hours=1):
            raise PlanningError("Departure time is in the past.")

        query = RouteQuery(
            origin=(req.origin.lat, req.origin.lon),
            destination=(req.destination.lat, req.destination.lon),
            departure=req.departure,
            load_lb=req.load_lb,
        )
        routes = find_routes(self.provider, query)
        checkpoints = [build_checkpoints(r, req.interval_mi, req.departure, req.hos) for r in routes]

        start_hour = floor_hour(req.departure)
        last_eta = max(cp[-1].eta for cp in checkpoints)
        window_end = max(start_hour + timedelta(hours=HEATMAP_HOURS), last_eta) + timedelta(hours=1)
        if last_eta > forecast_horizon():
            raise PlanningError("The trip ends beyond the 16-day forecast range. Choose an earlier departure.")

        grid, spacing = corridor_grid(routes)
        points = [(cp.lat, cp.lon) for route_cps in checkpoints for cp in route_cps] + grid
        weather = self.weather.hourly(points, start_hour - timedelta(hours=1), window_end)

        analyses = [analyze(r, cps, weather, req.load_lb, req.hos) for r, cps in zip(routes, checkpoints)]
        labels = [f"Route {ROUTE_IDS[i]}" for i in range(len(analyses))]
        recommendation = recommend(analyses, labels)

        return {
            "request": {
                "origin": asdict(req.origin),
                "destination": asdict(req.destination),
                "departure": req.departure.isoformat(),
                "load_lb": req.load_lb,
                "interval_mi": req.interval_mi,
                "hos": req.hos,
            },
            "provider": self.provider.name,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "routes": [
                self._serialize_route(a, label, recommendation["ranking"].index(label) + 1)
                for a, label in zip(analyses, labels)
            ],
            "recommendation": recommendation,
            "heatmap": build_heatmap(grid, spacing, weather, start_hour, req.load_lb),
            "rules": rules_payload(),
        }

    def _serialize_route(self, analysis, label, rank):
        route, req = analysis.route, self.request
        keep = thin_indices(route.polyline.cum_m, GEOMETRY_STEP_M)
        coords = route.polyline.coords
        return {
            "id": label,
            "name": route.name,
            "rank": rank,
            "recommended": rank == 1,
            "distance_mi": round(analysis.distance_mi, 1),
            "drive_s": round(route.duration_s),
            "trip_s": round(analysis.trip_s),
            "arrival": (req.departure + timedelta(seconds=round(analysis.trip_s))).isoformat(),
            "miles_by_level": {lvl.name.lower(): round(mi, 1) for lvl, mi in analysis.miles_by_level.items()},
            "avg_risk": round(analysis.avg_risk, 2),
            "max_level": int(analysis.max_level),
            "geometry": {
                "coordinates": [[round(coords[i][1], 5), round(coords[i][0], 5)] for i in keep],
                "miles": [round(route.polyline.cum_m[i] / METERS_PER_MILE, 2) for i in keep],
                "elapsed_s": [round(elapsed_time(route.cum_time_s[i], req.hos)) for i in keep],
            },
            "checkpoints": [
                {
                    "index": cp.index,
                    "mile": round(cp.mile, 1),
                    "lat": round(cp.lat, 5),
                    "lon": round(cp.lon, 5),
                    "eta": cp.eta.replace(microsecond=0).isoformat(),
                    "drive_s": round(cp.drive_s),
                    "covered_mi": round(cp.covered_mi, 2),
                    "weather": cp.weather.as_dict(),
                    "level": int(cp.assessment.level),
                    "score": cp.assessment.score,
                    "drivers": cp.assessment.drivers,
                    "load_rule": cp.assessment.load_rule,
                }
                for cp in analysis.checkpoints
            ],
        }


def rules_payload():
    def band(b):
        return {
            "factor": b.factor,
            "unit": b.unit,
            "thresholds": [b.moderate, b.high, b.severe, b.no_travel],
            "no_travel_inclusive": b.no_travel_inclusive,
        }

    return {
        "levels": [{"value": int(lvl), "label": lvl.label} for lvl in risk.Level],
        "bands": [band(risk.WIND), band(risk.RAIN), band(risk.SNOW)],
        "load_rules": [
            "≥55 mph wind → No Travel for any load",
            f"45–54 mph wind and load over {risk.HEAVY_LOAD_NO_TRAVEL_LB:,} lb → No Travel",
            f"35–44 mph wind and load over {risk.HEAVY_LOAD_SEVERE_LB:,} lb → Severe",
        ],
    }

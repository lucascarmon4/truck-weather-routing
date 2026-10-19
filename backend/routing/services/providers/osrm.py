import logging

import requests
from django.conf import settings

from ..errors import NoRouteError, UpstreamError
from ..geo import Polyline
from .base import ProviderRoute, RouteQuery

logger = logging.getLogger(__name__)

TRUCK_MAX_SPEED_MPS = 65 * 0.44704


class OsrmProvider:
    """Fallback for local development without a TomTom key. OSRM routes cars, so segment durations are
    slowed down to a 65 mph truck cap."""

    name = "osrm"

    def __init__(self, base_url="https://router.project-osrm.org", session=None):
        self.base_url = base_url.rstrip("/")
        self.session = session or requests.Session()

    def routes(self, query: RouteQuery):
        stops = [query.origin, *([query.via] if query.via else []), query.destination]
        path = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in stops)
        params = {
            "alternatives": str(query.alternatives + 1) if query.alternatives and not query.via else "false",
            "overview": "full",
            "geometries": "geojson",
            "annotations": "distance,duration",
            "steps": "true",
        }
        try:
            response = self.session.get(
                f"{self.base_url}/route/v1/driving/{path}", params=params, timeout=settings.HTTP_TIMEOUT_SECONDS
            )
        except requests.RequestException as exc:
            raise UpstreamError("Routing service is unreachable.") from exc
        payload = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
        if payload.get("code") == "NoRoute":
            raise NoRouteError("No drivable route was found between these locations.")
        if not response.ok or payload.get("code") != "Ok":
            logger.warning("OSRM %s: %s", response.status_code, response.text[:300])
            raise UpstreamError("Routing service returned an error.")
        return [self._parse(route) for route in payload["routes"]]

    def _parse(self, route):
        coords = [(lat, lon) for lon, lat in route["geometry"]["coordinates"]]
        cum_time = [0.0]
        for leg in route["legs"]:
            annotation = leg["annotation"]
            for distance, duration in zip(annotation["distance"], annotation["duration"]):
                cum_time.append(cum_time[-1] + max(duration, distance / TRUCK_MAX_SPEED_MPS))
        polyline = Polyline.from_coords(coords)
        cum_time = cum_time[: len(coords)] + [cum_time[-1]] * (len(coords) - len(cum_time))
        roads = [road.strip().replace("I ", "I-") for leg in route["legs"] for road in leg.get("summary", "").split(",")]
        name = " · ".join(list(dict.fromkeys(road for road in roads if road))[:2])
        return ProviderRoute(polyline=polyline, cum_time_s=cum_time, name=name, source=self.name)

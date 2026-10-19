import logging
from datetime import datetime, timedelta, timezone

import requests
from django.conf import settings

from ..errors import NoRouteError, UpstreamError
from ..geo import Polyline, interpolate
from .base import ProviderRoute, RouteQuery, summarize_road_names

logger = logging.getLogger(__name__)


class TomTomProvider:
    name = "tomtom"
    base_url = "https://api.tomtom.com/routing/1/calculateRoute"

    def __init__(self, api_key, session=None):
        self.api_key = api_key
        self.session = session or requests.Session()

    def _params(self, query: RouteQuery):
        params = [
            ("key", self.api_key),
            ("travelMode", "truck"),
            ("vehicleCommercial", "true"),
            ("vehicleWeight", query.gross_weight_kg),
            ("routeType", "fastest"),
            ("traffic", "true"),
            ("routeRepresentation", "polyline"),
            ("extendedRouteRepresentation", "distance"),
            ("extendedRouteRepresentation", "travelTime"),
            ("instructionsType", "coded"),
            ("maxAlternatives", 0 if query.via else query.alternatives),
        ]
        if query.departure > datetime.now(timezone.utc) + timedelta(minutes=1):
            params.append(("departAt", query.departure.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")))
        return params

    def routes(self, query: RouteQuery):
        stops = [query.origin, *([query.via] if query.via else []), query.destination]
        path = ":".join(f"{lat:.6f},{lon:.6f}" for lat, lon in stops)
        try:
            response = self.session.get(
                f"{self.base_url}/{path}/json", params=self._params(query), timeout=settings.HTTP_TIMEOUT_SECONDS
            )
        except requests.RequestException as exc:
            raise UpstreamError("Routing service is unreachable.") from exc
        if response.status_code in (400, 404):
            detail = response.json().get("detailedError", {}) if response.content else {}
            if detail.get("code") in ("NO_ROUTE_FOUND", "MAP_MATCHING_FAILURE", "CANNOT_RESTORE_BASEROUTE"):
                raise NoRouteError("No truck route was found between these locations.")
        if response.status_code == 403:
            raise UpstreamError("Routing service rejected the API key.")
        if response.status_code == 429:
            raise UpstreamError("Routing service rate limit reached. Please try again shortly.")
        if not response.ok:
            logger.warning("TomTom %s: %s", response.status_code, response.text[:300])
            raise UpstreamError("Routing service returned an error.")
        return [self._parse(route) for route in response.json().get("routes", [])]

    def _parse(self, route):
        coords = [(p["latitude"], p["longitude"]) for leg in route["legs"] for p in leg["points"]]
        polyline = Polyline.from_coords(coords)
        progress = sorted(route.get("progress") or [], key=lambda p: p["pointIndex"])
        total_time = route["summary"]["travelTimeInSeconds"]
        if len(progress) >= 2:
            known_m = [polyline.cum_m[min(p["pointIndex"], len(coords) - 1)] for p in progress]
            known_s = [p["travelTimeInSeconds"] for p in progress]
            cum_time = [interpolate(known_m, known_s, d) for d in polyline.cum_m]
        else:
            cum_time = [total_time * d / polyline.length_m for d in polyline.cum_m]
        return ProviderRoute(polyline=polyline, cum_time_s=cum_time, name=self._name(route), source=self.name)

    @staticmethod
    def _name(route):
        instructions = route.get("guidance", {}).get("instructions", [])
        segments = []
        for current, following in zip(instructions, instructions[1:]):
            road = (current.get("roadNumbers") or [None])[0] or current.get("street")
            segments.append((road, following["routeOffsetInMeters"] - current["routeOffsetInMeters"]))
        return summarize_road_names(segments)

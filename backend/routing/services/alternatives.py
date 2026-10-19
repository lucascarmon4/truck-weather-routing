import logging
import math
from dataclasses import replace

from .errors import NoRouteError, PlanningError
from .geo import SpatialIndex, bearing_rad, haversine_m, offset_point

logger = logging.getLogger(__name__)

WANTED_ROUTES = 3
OVERLAP_SAMPLE_M = 2_000
OVERLAP_RADIUS_M = 1_500
MAX_OVERLAP = 0.8
MAX_DURATION_RATIO = 1.6
DETOUR_FRACTIONS = (0.15, -0.15, 0.3, -0.3)


def overlap(route_a, route_b):
    index = SpatialIndex(route_b.polyline.sample_every(OVERLAP_SAMPLE_M), cell_deg=0.1)
    samples = route_a.polyline.sample_every(OVERLAP_SAMPLE_M)
    return sum(index.within(lat, lon, OVERLAP_RADIUS_M) for lat, lon in samples) / len(samples)


def is_distinct(candidate, accepted):
    return all(overlap(candidate, r) < MAX_OVERLAP and overlap(r, candidate) < MAX_OVERLAP for r in accepted)


def detour_vias(primary, origin, destination):
    """Pushes a via point sideways from the middle of the fastest route, which makes the router find
    a different corridor when it only returns one or two options."""
    mid_lat, mid_lon = primary.polyline.point_at(primary.distance_m / 2)
    span = haversine_m(*origin, *destination)
    heading = bearing_rad(*origin, *destination)
    for fraction in DETOUR_FRACTIONS:
        distance = min(max(abs(fraction) * span, 15_000), 200_000)
        side = math.pi / 2 if fraction > 0 else -math.pi / 2
        yield offset_point(mid_lat, mid_lon, heading + side, distance)


def find_routes(provider, query, wanted=WANTED_ROUTES):
    routes = provider.routes(query)
    if not routes:
        raise NoRouteError("No route was found between these locations.")
    accepted = []
    for route in routes:
        if is_distinct(route, accepted):
            accepted.append(route)
    primary = accepted[0]
    for via in detour_vias(primary, query.origin, query.destination):
        if len(accepted) >= wanted:
            break
        try:
            candidates = provider.routes(replace(query, via=via, alternatives=0))
        except PlanningError as exc:
            logger.info("detour via %s skipped: %s", via, exc.message)
            continue
        for candidate in candidates[:1]:
            if candidate.duration_s <= MAX_DURATION_RATIO * primary.duration_s and is_distinct(candidate, accepted):
                accepted.append(candidate)
    return sorted(accepted[:wanted], key=lambda r: r.duration_s)

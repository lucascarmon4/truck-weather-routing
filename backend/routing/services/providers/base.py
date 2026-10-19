from dataclasses import dataclass
from datetime import datetime
from typing import Protocol

from ..geo import METERS_PER_MILE, Polyline, interpolate

TRUCK_TARE_LB = 33_000
KG_PER_LB = 0.45359237


@dataclass
class ProviderRoute:
    polyline: Polyline
    cum_time_s: list
    name: str
    source: str

    @property
    def distance_m(self):
        return self.polyline.length_m

    @property
    def distance_mi(self):
        return self.distance_m / METERS_PER_MILE

    @property
    def duration_s(self):
        return self.cum_time_s[-1]

    def drive_time_at(self, distance_m):
        return interpolate(self.polyline.cum_m, self.cum_time_s, distance_m)


@dataclass(frozen=True)
class RouteQuery:
    origin: tuple
    destination: tuple
    departure: datetime
    load_lb: float
    via: tuple | None = None
    alternatives: int = 2

    @property
    def gross_weight_kg(self):
        return round((TRUCK_TARE_LB + self.load_lb) * KG_PER_LB)


class RoutingProvider(Protocol):
    name: str

    def routes(self, query: RouteQuery) -> list[ProviderRoute]: ...


def summarize_road_names(segments, limit=2):
    totals = {}
    for name, length in segments:
        if name:
            totals[name] = totals.get(name, 0) + length
    top = sorted(totals.items(), key=lambda item: -item[1])[:limit]
    return " · ".join(name for name, _ in top)

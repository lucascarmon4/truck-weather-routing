from dataclasses import dataclass, field
from datetime import datetime, timedelta

from .geo import METERS_PER_MILE
from .hos import elapsed_time
from .providers import ProviderRoute
from .risk import Assessment, Conditions, Level, assess
from .weather import WeatherSample

SAMPLE_INTERVALS_MI = (10, 25, 50)


@dataclass
class Checkpoint:
    index: int
    mile: float
    lat: float
    lon: float
    drive_s: float
    eta: datetime
    covered_mi: float = 0.0
    weather: WeatherSample | None = None
    assessment: Assessment | None = None


@dataclass
class RouteAnalysis:
    route: ProviderRoute
    checkpoints: list
    trip_s: float
    miles_by_level: dict = field(default_factory=dict)
    avg_risk: float = 0.0
    max_level: Level = Level.LOW

    @property
    def distance_mi(self):
        return self.route.distance_mi

    def miles(self, level):
        return self.miles_by_level.get(level, 0.0)


def checkpoint_distances_m(length_m, interval_mi):
    step = interval_mi * METERS_PER_MILE
    distances = []
    d = 0.0
    while d < length_m - 0.5 * METERS_PER_MILE:
        distances.append(d)
        d += step
    distances.append(length_m)
    return distances


def coverage_m(distances):
    covered = []
    for i, d in enumerate(distances):
        left = 0.0 if i == 0 else (distances[i - 1] + d) / 2
        right = distances[-1] if i == len(distances) - 1 else (d + distances[i + 1]) / 2
        covered.append(right - left)
    return covered


def build_checkpoints(route: ProviderRoute, interval_mi, departure, hos=True):
    distances = checkpoint_distances_m(route.distance_m, interval_mi)
    checkpoints = []
    for i, (d, covered) in enumerate(zip(distances, coverage_m(distances))):
        lat, lon = route.polyline.point_at(d)
        drive_s = route.drive_time_at(d)
        checkpoints.append(
            Checkpoint(
                index=i,
                mile=d / METERS_PER_MILE,
                lat=lat,
                lon=lon,
                drive_s=drive_s,
                eta=departure + timedelta(seconds=elapsed_time(drive_s, hos)),
                covered_mi=covered / METERS_PER_MILE,
            )
        )
    return checkpoints


def analyze(route, checkpoints, weather_by_point, load_lb, hos=True):
    for cp in checkpoints:
        cp.weather = weather_by_point[(cp.lat, cp.lon)].at(cp.eta)
        cp.assessment = assess(
            Conditions(cp.weather.wind_mph, cp.weather.rain_in_hr, cp.weather.snow_in_hr), load_lb
        )
    miles = {level: 0.0 for level in Level}
    for cp in checkpoints:
        miles[cp.assessment.level] += cp.covered_mi
    total = sum(miles.values()) or 1.0
    return RouteAnalysis(
        route=route,
        checkpoints=checkpoints,
        trip_s=elapsed_time(route.duration_s, hos),
        miles_by_level=miles,
        avg_risk=sum(level * mi for level, mi in miles.items()) / total,
        max_level=max(cp.assessment.level for cp in checkpoints),
    )

from datetime import datetime, timedelta, timezone

from routing.services.geo import Polyline
from routing.services.providers import ProviderRoute
from routing.services.weather import HourlySeries

START = datetime(2030, 1, 15, 12, tzinfo=timezone.utc)


def straight_route(start=(40.0, -100.0), lon_step=0.01, points=200, speed_mps=26.8, name="Test road"):
    coords = [(start[0], start[1] + i * lon_step) for i in range(points)]
    polyline = Polyline.from_coords(coords)
    return ProviderRoute(polyline=polyline, cum_time_s=[d / speed_mps for d in polyline.cum_m], name=name, source="fake")


def series(hours=72, start=START - timedelta(hours=1), wind=5.0, rain=0.0, snow=0.0, overrides=None):
    wind_values = [wind] * hours
    rain_values = [rain] * hours
    snow_values = [snow] * hours
    for hour, values in (overrides or {}).items():
        i = int((hour - start).total_seconds() // 3600)
        wind_values[i] = values.get("wind", wind_values[i])
        rain_values[i] = values.get("rain", rain_values[i])
        snow_values[i] = values.get("snow", snow_values[i])
    return HourlySeries(
        start=start,
        wind=wind_values,
        gust=[w * 1.3 for w in wind_values],
        rain=rain_values,
        snow=snow_values,
        temperature=[40.0] * hours,
        code=[0] * hours,
    )


class FakeProvider:
    name = "fake"

    def __init__(self, routes, detours=()):
        self._routes = routes
        self._detours = list(detours)
        self.calls = []

    def routes(self, query):
        self.calls.append(query)
        if query.via is None:
            return list(self._routes)
        return [self._detours.pop(0)] if self._detours else []


class FakeWeather:
    def __init__(self, pick):
        self.pick = pick

    def hourly(self, points, start, end):
        return {p: self.pick(p) for p in points}

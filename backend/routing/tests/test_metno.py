from datetime import timedelta

import pytest

from routing.services.errors import UpstreamError
from routing.services.metno import parse_timeseries
from routing.services.weather import FallbackWeatherClient

from .factories import START, series


def entry(moment, wind_mps=5.0, temp_c=10.0, next_1=None, next_6=None, symbol="rain"):
    data = {"instant": {"details": {"wind_speed": wind_mps, "air_temperature": temp_c}}}
    if next_1 is not None:
        data["next_1_hours"] = {"summary": {"symbol_code": symbol}, "details": {"precipitation_amount": next_1}}
    if next_6 is not None:
        data["next_6_hours"] = {"summary": {"symbol_code": symbol}, "details": {"precipitation_amount": next_6}}
    return {"time": moment.strftime("%Y-%m-%dT%H:%M:%SZ"), "data": data}


def test_precipitation_moves_to_the_hour_it_ends():
    timeseries = [entry(START, next_1=12.7), entry(START + timedelta(hours=1), wind_mps=20, next_1=0.0)]
    result = parse_timeseries(timeseries, START, START + timedelta(hours=1))
    assert result.rain == pytest.approx([0.0, 0.5])
    assert result.wind == pytest.approx([11.18, 44.74], abs=0.01)
    assert result.gust == [None, None]


def test_six_hour_totals_are_spread_and_cold_precip_is_snow():
    timeseries = [entry(START, temp_c=-3, next_6=15.24, symbol="snow")]
    result = parse_timeseries(timeseries, START, START + timedelta(hours=6))
    assert result.snow[1:] == pytest.approx([1.0] * 6)
    assert result.rain == [0.0] * 7


class Failing:
    name = "down"

    def hourly(self, points, start, end):
        raise UpstreamError("down")


class Working:
    name = "up"

    def hourly(self, points, start, end):
        return {p: series() for p in points}


@pytest.fixture(autouse=True)
def local_cache(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "metno"}}
    from django.core.cache import cache

    cache.clear()


def test_fallback_uses_the_next_source_and_records_it():
    client = FallbackWeatherClient(Failing(), Working())
    assert client.hourly([(1.0, 2.0)], START, START)
    assert client.source == "up"


def test_a_failed_source_is_skipped_for_a_while():
    calls = []

    class Counting(Failing):
        def hourly(self, points, start, end):
            calls.append(1)
            return super().hourly(points, start, end)

    client = FallbackWeatherClient(Counting(), Working())
    client.hourly([(1.0, 2.0)], START, START)
    client.hourly([(1.0, 2.0)], START, START)
    assert len(calls) == 1


def test_fallback_raises_when_every_source_fails():
    with pytest.raises(UpstreamError):
        FallbackWeatherClient(Failing(), Failing()).hourly([(1.0, 2.0)], START, START)

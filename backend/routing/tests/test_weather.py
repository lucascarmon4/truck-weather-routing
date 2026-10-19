from datetime import timedelta

import pytest
import responses

from routing.services.errors import UpstreamError
from routing.services.weather import OpenMeteoClient, snap

from .factories import START, series


def test_wind_is_interpolated_and_precip_uses_the_hour_bucket():
    s = series(overrides={START + timedelta(hours=1): {"wind": 30, "rain": 0.4}})
    sample = s.at(START + timedelta(minutes=30))
    assert sample.wind_mph == pytest.approx(17.5)
    assert sample.rain_in_hr == 0.4


def test_snap_rounds_to_grid():
    assert snap(41.8781, -87.6298) == (41.9, -87.65)


@responses.activate
def test_client_batches_locations_and_caches(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "t"}}
    hourly = {
        "time": ["2030-01-15T11:00", "2030-01-15T12:00"],
        "wind_speed_10m": [10, 20],
        "wind_gusts_10m": [15, 25],
        "rain": [0.1, None],
        "showers": [0.05, 0.0],
        "snowfall": [0, 0],
        "temperature_2m": [30, 31],
        "weather_code": [61, 3],
    }
    responses.get("https://api.open-meteo.com/v1/forecast", json=[{"hourly": hourly}, {"hourly": hourly}])
    client = OpenMeteoClient()
    points = [(40.0, -100.0), (41.0, -101.0)]
    result = client.hourly(points, START, START + timedelta(hours=1))
    client.hourly(points, START, START + timedelta(hours=1))
    assert len(responses.calls) == 1
    assert result[(40.0, -100.0)].rain == pytest.approx([0.15, 0.0])


@responses.activate
def test_client_retries_transient_failures(settings, monkeypatch):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}}
    monkeypatch.setattr("routing.services.weather.time.sleep", lambda _: None)
    hourly = {
        "time": ["2030-01-15T11:00"], "wind_speed_10m": [10], "wind_gusts_10m": [15], "rain": [0],
        "showers": [0], "snowfall": [0], "temperature_2m": [30], "weather_code": [0],
    }
    url = "https://api.open-meteo.com/v1/forecast"
    responses.get(url, body="")
    responses.get(url, status=503)
    responses.get(url, json={"hourly": hourly})
    result = OpenMeteoClient().hourly([(40.0, -100.0)], START, START)
    assert len(responses.calls) == 3
    assert result[(40.0, -100.0)].wind == [10]


@responses.activate
def test_client_gives_up_with_a_clear_message(settings, monkeypatch):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}}
    monkeypatch.setattr("routing.services.weather.time.sleep", lambda _: None)
    responses.get("https://api.open-meteo.com/v1/forecast", status=429)
    with pytest.raises(UpstreamError, match="rate limit"):
        OpenMeteoClient().hourly([(40.0, -100.0)], START, START)

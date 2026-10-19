from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from routing.services import planner

from .factories import FakeProvider, FakeWeather, series, straight_route


@pytest.fixture
def client(monkeypatch, settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}}
    start = timezone.now().replace(minute=0, second=0, microsecond=0) - timedelta(hours=2)
    windy, calm = series(start=start, wind=48), series(start=start, wind=5)
    routes = [
        straight_route(start=(40.0, -100.0), speed_mps=30, name="fast"),
        straight_route(start=(41.0, -100.0), speed_mps=25, name="calm"),
    ]
    monkeypatch.setattr(planner, "get_provider", lambda: FakeProvider(routes))
    monkeypatch.setattr(planner, "default_weather_client", lambda: FakeWeather(lambda p: windy if p[0] < 40.5 else calm))
    return APIClient()


def payload(**overrides):
    body = {
        "origin": {"label": "A", "lat": 40.0, "lon": -100.0},
        "destination": {"label": "B", "lat": 40.0, "lon": -98.0},
        "departure": (timezone.now() + timedelta(hours=1)).isoformat(),
        "load_lb": 35_000,
        "interval_mi": 10,
    }
    body.update(overrides)
    return body


def route_named(data, name):
    return next(r for r in data["routes"] if r["name"] == name)


def test_plan_recommends_the_route_without_no_travel_miles(client):
    response = client.post("/api/plan", payload(), format="json")
    assert response.status_code == 200, response.json()
    data = response.json()
    fast = route_named(data, "fast")
    assert data["recommendation"]["route_id"] == route_named(data, "calm")["id"]
    assert fast["miles_by_level"]["no_travel"] == pytest.approx(fast["distance_mi"], abs=0.2)
    assert all(cp["load_rule"] for cp in fast["checkpoints"])
    assert len(data["heatmap"]["risk"][0]) == data["heatmap"]["hours"] + 1


def test_lighter_load_turns_the_same_wind_into_severe(client):
    data = client.post("/api/plan", payload(load_lb=20_000), format="json").json()
    assert route_named(data, "fast")["max_level"] == 3


@pytest.mark.parametrize("field, value", [("load_lb", -5), ("interval_mi", 15), ("departure", "nope")])
def test_invalid_input_is_rejected(client, field, value):
    assert client.post("/api/plan", payload(**{field: value}), format="json").status_code == 400


def test_departure_in_the_past_is_rejected(client):
    past = (timezone.now() - timedelta(days=1)).isoformat()
    response = client.post("/api/plan", payload(departure=past), format="json")
    assert response.status_code == 400
    assert "past" in response.json()["detail"]


def test_rest_stops_are_placed_on_the_route_when_enabled(client, monkeypatch):
    slow = straight_route(speed_mps=4, name="slow")
    monkeypatch.setattr(planner, "get_provider", lambda: FakeProvider([slow]))
    route = route_named(client.post("/api/plan", payload(hos=True), format="json").json(), "slow")
    assert [s["kind"] for s in route["stops"]] == ["break", "rest"]
    assert route["stops"][0]["start_s"] == 8 * 3600
    assert route["stops"][1]["mile"] == pytest.approx(11 * 3600 * 4 / 1609.344, abs=0.2)
    assert route["trip_s"] == route["drive_s"] + 30 * 60 + 10 * 3600

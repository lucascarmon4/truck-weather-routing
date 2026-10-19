from datetime import timedelta

import pytest

from routing.services.analysis import analyze, build_checkpoints, checkpoint_distances_m, coverage_m
from routing.services.geo import METERS_PER_MILE
from routing.services.risk import Level

from .factories import START, series, straight_route


@pytest.mark.parametrize("interval", [10, 25, 50])
def test_checkpoints_are_evenly_spaced_and_include_destination(interval):
    route = straight_route(points=300)
    checkpoints = build_checkpoints(route, interval, START, hos=False)
    miles = [cp.mile for cp in checkpoints]
    assert miles[0] == 0
    assert all(b - a == pytest.approx(interval) for a, b in zip(miles[:-2], miles[1:-1]))
    assert miles[-1] == pytest.approx(route.distance_mi)


def test_coverage_adds_up_to_route_length():
    distances = checkpoint_distances_m(103 * METERS_PER_MILE, 10)
    assert sum(coverage_m(distances)) == pytest.approx(103 * METERS_PER_MILE)


def test_eta_follows_route_travel_time():
    route = straight_route(points=300, speed_mps=26.8224)
    checkpoints = build_checkpoints(route, 10, START, hos=False)
    assert (checkpoints[1].eta - START).total_seconds() == pytest.approx(600, abs=5)


def test_eta_includes_rest_breaks_when_enabled():
    route = straight_route(points=300, speed_mps=1.0)
    checkpoints = build_checkpoints(route, 10, START, hos=True)
    late = next(cp for cp in checkpoints if cp.drive_s > 12 * 3600)
    assert (late.eta - START).total_seconds() == pytest.approx(late.drive_s + 10.5 * 3600)


def test_weather_is_read_at_each_checkpoint_eta():
    route = straight_route(points=300, speed_mps=26.8224)
    checkpoints = build_checkpoints(route, 10, START, hos=False)
    storm_hour = START + timedelta(hours=1)
    storm = series(overrides={storm_hour: {"wind": 60}})
    weather = {(cp.lat, cp.lon): storm for cp in checkpoints}
    analysis = analyze(route, checkpoints, weather, load_lb=0, hos=False)
    flagged = [cp for cp in analysis.checkpoints if cp.assessment.level == Level.NO_TRAVEL]
    assert flagged
    assert all(START < cp.eta < storm_hour + timedelta(hours=1) for cp in flagged)
    assert analysis.miles(Level.NO_TRAVEL) == pytest.approx(sum(cp.covered_mi for cp in flagged))

import pytest

from routing.services.hos import elapsed_time, rest_stops

H = 3600


@pytest.mark.parametrize(
    "drive_h, expected_h",
    [(0, 0), (5, 5), (8, 8), (9, 9.5), (11, 11.5), (12, 22.5), (22, 33), (23, 44)],
)
def test_rest_schedule(drive_h, expected_h):
    assert elapsed_time(drive_h * H) == pytest.approx(expected_h * H)


def test_disabled_returns_drive_time():
    assert elapsed_time(30 * H, enabled=False) == 30 * H


def test_rest_stops_line_up_with_the_schedule():
    stops = rest_stops(23 * H)
    assert [(s["kind"], s["drive_s"] / H, s["start_s"] / H) for s in stops] == [
        ("break", 8, 8), ("rest", 11, 11.5), ("break", 19, 29.5), ("rest", 22, 33),
    ]
    for s in stops:
        assert elapsed_time(s["drive_s"] + 1) == pytest.approx(s["start_s"] + s["duration_s"] + 1)


def test_short_trips_have_no_stops():
    assert rest_stops(8 * H) == []
    assert [s["kind"] for s in rest_stops(9 * H)] == ["break"]

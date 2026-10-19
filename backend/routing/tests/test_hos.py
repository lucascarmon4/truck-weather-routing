import pytest

from routing.services.hos import elapsed_time

H = 3600


@pytest.mark.parametrize(
    "drive_h, expected_h",
    [(0, 0), (5, 5), (8, 8), (9, 9.5), (11, 11.5), (12, 22.5), (22, 33), (23, 44)],
)
def test_rest_schedule(drive_h, expected_h):
    assert elapsed_time(drive_h * H) == pytest.approx(expected_h * H)


def test_disabled_returns_drive_time():
    assert elapsed_time(30 * H, enabled=False) == 30 * H

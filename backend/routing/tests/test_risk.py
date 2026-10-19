import pytest

from routing.services.risk import RAIN, SNOW, WIND, Conditions, Level, assess


@pytest.mark.parametrize(
    "wind, expected",
    [(0, Level.LOW), (24.9, Level.LOW), (25, Level.MODERATE), (34.9, Level.MODERATE), (35, Level.HIGH),
     (44.9, Level.HIGH), (45, Level.SEVERE), (54.9, Level.SEVERE), (55, Level.NO_TRAVEL), (80, Level.NO_TRAVEL)],
)
def test_wind_bands(wind, expected):
    assert WIND.level(wind) == expected


@pytest.mark.parametrize(
    "rain, expected",
    [(0.09, Level.LOW), (0.10, Level.MODERATE), (0.25, Level.HIGH), (0.50, Level.SEVERE),
     (1.00, Level.SEVERE), (1.01, Level.NO_TRAVEL)],
)
def test_rain_bands_treat_upper_limit_as_exclusive(rain, expected):
    assert RAIN.level(rain) == expected


@pytest.mark.parametrize(
    "snow, expected",
    [(0.4, Level.LOW), (0.5, Level.MODERATE), (1.0, Level.HIGH), (2.0, Level.SEVERE), (3.0, Level.SEVERE),
     (3.1, Level.NO_TRAVEL)],
)
def test_snow_bands(snow, expected):
    assert SNOW.level(snow) == expected


@pytest.mark.parametrize("value", [0, 12, 25, 30, 34.99, 35, 44, 45, 54.9, 55, 70])
def test_continuous_score_stays_inside_its_level(value):
    assert int(WIND.score(value)) == WIND.level(value)


def test_worst_factor_wins_and_is_reported():
    result = assess(Conditions(wind_mph=27, rain_in_hr=0.3, snow_in_hr=0), load_lb=10_000)
    assert result.level == Level.HIGH
    assert result.drivers == ["rain"]


def test_wind_over_55_is_no_travel_even_when_empty():
    assert assess(Conditions(55, 0, 0), load_lb=0).level == Level.NO_TRAVEL


@pytest.mark.parametrize(
    "wind, load, expected",
    [(47, 30_000, Level.SEVERE), (47, 30_001, Level.NO_TRAVEL), (38, 40_000, Level.HIGH),
     (38, 40_001, Level.SEVERE), (30, 80_000, Level.MODERATE)],
)
def test_load_rules(wind, load, expected):
    result = assess(Conditions(wind, 0, 0), load_lb=load)
    assert result.level == expected
    assert (result.load_rule is not None) == (expected != WIND.level(wind))


def test_load_rule_does_not_downgrade_worse_weather():
    result = assess(Conditions(wind_mph=38, rain_in_hr=1.5, snow_in_hr=0), load_lb=45_000)
    assert result.level == Level.NO_TRAVEL
    assert result.load_rule is None

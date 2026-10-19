from dataclasses import dataclass, field
from enum import IntEnum


class Level(IntEnum):
    LOW = 0
    MODERATE = 1
    HIGH = 2
    SEVERE = 3
    NO_TRAVEL = 4

    @property
    def label(self):
        return self.name.replace("_", " ").title()


@dataclass(frozen=True)
class Band:
    factor: str
    unit: str
    moderate: float
    high: float
    severe: float
    no_travel: float
    no_travel_inclusive: bool

    def level(self, value):
        if value > self.no_travel or (self.no_travel_inclusive and value == self.no_travel):
            return Level.NO_TRAVEL
        if value >= self.severe:
            return Level.SEVERE
        if value >= self.high:
            return Level.HIGH
        if value >= self.moderate:
            return Level.MODERATE
        return Level.LOW

    def score(self, value):
        level = self.level(value)
        if level == Level.NO_TRAVEL:
            return 4.0
        edges = (0.0, self.moderate, self.high, self.severe, self.no_travel)
        lo, hi = edges[level], edges[level + 1]
        fraction = (value - lo) / (hi - lo) if hi > lo else 0.0
        return min(level + max(fraction, 0.0), level + 0.999)


WIND = Band("wind", "mph", 25, 35, 45, 55, no_travel_inclusive=True)
RAIN = Band("rain", "in/hr", 0.10, 0.25, 0.50, 1.00, no_travel_inclusive=False)
SNOW = Band("snow", "in/hr", 0.5, 1.0, 2.0, 3.0, no_travel_inclusive=False)

HEAVY_LOAD_NO_TRAVEL_LB = 30_000
HEAVY_LOAD_SEVERE_LB = 40_000


@dataclass(frozen=True)
class Conditions:
    wind_mph: float
    rain_in_hr: float
    snow_in_hr: float


@dataclass
class Assessment:
    level: Level
    score: float
    drivers: list = field(default_factory=list)
    load_rule: str | None = None


def load_rule_level(wind_mph, load_lb):
    if WIND.severe <= wind_mph < WIND.no_travel and load_lb > HEAVY_LOAD_NO_TRAVEL_LB:
        return Level.NO_TRAVEL, f"45–54 mph wind with load over {HEAVY_LOAD_NO_TRAVEL_LB:,} lb"
    if WIND.high <= wind_mph < WIND.severe and load_lb > HEAVY_LOAD_SEVERE_LB:
        return Level.SEVERE, f"35–44 mph wind with load over {HEAVY_LOAD_SEVERE_LB:,} lb"
    return None, None


def assess(conditions: Conditions, load_lb: float) -> Assessment:
    readings = {
        WIND.factor: (WIND, conditions.wind_mph),
        RAIN.factor: (RAIN, conditions.rain_in_hr),
        SNOW.factor: (SNOW, conditions.snow_in_hr),
    }
    levels = {name: band.level(value) for name, (band, value) in readings.items()}
    level = max(levels.values())
    score = max(band.score(value) for band, value in readings.values())
    drivers = [name for name, lvl in levels.items() if lvl == level and lvl > Level.LOW]

    rule_level, rule = load_rule_level(conditions.wind_mph, load_lb)
    if rule_level is not None and rule_level > level:
        level, drivers = rule_level, ["wind", "load"]
        score = 4.0 if rule_level == Level.NO_TRAVEL else max(score, float(rule_level))
    else:
        rule = None
    return Assessment(level=level, score=round(score, 3), drivers=drivers, load_rule=rule)

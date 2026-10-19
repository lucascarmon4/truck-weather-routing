from dataclasses import dataclass

from routing.services.recommend import recommend
from routing.services.risk import Level


@dataclass
class StubAnalysis:
    severe: float = 0
    high: float = 0
    no_travel: float = 0
    avg_risk: float = 0
    trip_s: float = 3600
    max_level: Level = Level.LOW

    def miles(self, level):
        return {Level.SEVERE: self.severe, Level.HIGH: self.high, Level.NO_TRAVEL: self.no_travel}.get(level, 0)


LABELS = ["Route A", "Route B", "Route C"]


def test_fewest_severe_miles_beats_faster_route():
    result = recommend([StubAnalysis(severe=20, trip_s=3600), StubAnalysis(severe=0, high=50, trip_s=9000)], LABELS)
    assert result["route_id"] == "Route B"
    assert result["comparisons"][0]["decided_by"] == "severe_mi"


def test_high_miles_break_severe_ties():
    result = recommend([StubAnalysis(high=30), StubAnalysis(high=10, trip_s=7200)], LABELS)
    assert result["route_id"] == "Route B"


def test_average_risk_then_travel_time():
    analyses = [
        StubAnalysis(avg_risk=0.4, trip_s=3000),
        StubAnalysis(avg_risk=0.2, trip_s=5000),
        StubAnalysis(avg_risk=0.2, trip_s=4000),
    ]
    result = recommend(analyses, LABELS)
    assert result["ranking"] == ["Route C", "Route B", "Route A"]
    assert result["comparisons"][0]["decided_by"] == "trip_min"


def test_no_travel_miles_rank_above_severe():
    result = recommend([StubAnalysis(no_travel=5), StubAnalysis(severe=100)], LABELS)
    assert result["route_id"] == "Route B"


def test_warns_when_every_route_is_blocked():
    blocked = StubAnalysis(no_travel=5, max_level=Level.NO_TRAVEL)
    result = recommend([blocked, StubAnalysis(no_travel=8, max_level=Level.NO_TRAVEL)], LABELS)
    assert result["warning"]

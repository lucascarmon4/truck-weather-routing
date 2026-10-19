from dataclasses import dataclass

from .risk import Level


@dataclass(frozen=True)
class Criterion:
    key: str
    label: str
    value: callable
    unit: str


def _fmt_duration(minutes):
    hours, mins = divmod(int(round(minutes)), 60)
    return f"{hours} h {mins:02d} min" if hours else f"{mins} min"


CRITERIA = (
    Criterion("no_travel_mi", "No Travel miles", lambda a: round(a.miles(Level.NO_TRAVEL), 1), "mi"),
    Criterion("severe_mi", "Severe miles", lambda a: round(a.miles(Level.SEVERE), 1), "mi"),
    Criterion("high_mi", "High miles", lambda a: round(a.miles(Level.HIGH), 1), "mi"),
    Criterion("avg_risk", "average risk", lambda a: round(a.avg_risk, 2), ""),
    Criterion("trip_min", "travel time", lambda a: round(a.trip_s / 60), "min"),
)


def rank_key(analysis):
    return tuple(c.value(analysis) for c in CRITERIA)


def _describe(criterion, better, worse):
    if criterion.key == "trip_min":
        return f"{_fmt_duration(worse - better)} faster"
    if criterion.key == "avg_risk":
        return f"lower average risk ({better:.2f} vs {worse:.2f})"
    return f"{better:g} {criterion.label} vs {worse:g}"


def recommend(analyses, labels):
    order = sorted(range(len(analyses)), key=lambda i: rank_key(analyses[i]))
    best = order[0]
    best_key = rank_key(analyses[best])
    comparisons = []
    for i in order[1:]:
        other_key = rank_key(analyses[i])
        for criterion, mine, theirs in zip(CRITERIA, best_key, other_key):
            if mine != theirs:
                comparisons.append(
                    {"route_id": labels[i], "decided_by": criterion.key, "text": _describe(criterion, mine, theirs)}
                )
                break
        else:
            comparisons.append({"route_id": labels[i], "decided_by": None, "text": "tied on every criterion"})

    winner = analyses[best]
    if comparisons:
        reasons = "; ".join(f"vs {c['route_id']}: {c['text']}" for c in comparisons)
        summary = f"{labels[best]} is recommended ({reasons})."
    else:
        summary = f"{labels[best]} is the only route available."
    warning = None
    if winner.max_level == Level.NO_TRAVEL:
        warning = "Every route crosses No Travel conditions at the planned time. Consider delaying departure."
    elif winner.max_level == Level.SEVERE:
        warning = "The recommended route still has Severe segments. Drive with extra caution."
    return {
        "route_id": labels[best],
        "ranking": [labels[i] for i in order],
        "summary": summary,
        "comparisons": comparisons,
        "warning": warning,
        "criteria": [c.label for c in CRITERIA],
    }

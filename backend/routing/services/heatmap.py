import math
from datetime import timedelta

from .geo import METERS_PER_MILE, SpatialIndex
from .risk import Conditions, assess

HEATMAP_HOURS = 48
MAX_GRID_POINTS = 260
SPACINGS_DEG = (0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 1.0, 1.25, 1.5)
MIN_BUFFER_MI = 25
ROUTE_SAMPLE_STEP_M = 5 * METERS_PER_MILE


def corridor_grid(routes, max_points=MAX_GRID_POINTS):
    samples = [p for route in routes for p in route.polyline.sample_every(ROUTE_SAMPLE_STEP_M)]
    index = SpatialIndex(samples)
    lats = [p[0] for p in samples]
    lons = [p[1] for p in samples]
    grid, spacing = [], SPACINGS_DEG[-1]
    for spacing in SPACINGS_DEG:
        buffer_m = max(MIN_BUFFER_MI * METERS_PER_MILE, 1.2 * spacing * 111_000)
        pad_lat = buffer_m / 111_000
        pad_lon = pad_lat / max(0.2, math.cos(math.radians(sum(lats) / len(lats))))
        lat0 = math.floor((min(lats) - pad_lat) / spacing) * spacing
        lon0 = math.floor((min(lons) - pad_lon) / spacing) * spacing
        rows = int((max(lats) + pad_lat - lat0) / spacing) + 1
        cols = int((max(lons) + pad_lon - lon0) / spacing) + 1
        if rows * cols > 60 * max_points:
            continue
        grid = [
            (round(lat0 + r * spacing, 4), round(lon0 + c * spacing, 4))
            for r in range(rows)
            for c in range(cols)
            if index.within(lat0 + r * spacing, lon0 + c * spacing, buffer_m)
        ]
        if len(grid) <= max_points:
            break
    return grid, spacing


def build_heatmap(grid, spacing, weather_by_point, start_hour, load_lb, hours=HEATMAP_HOURS):
    risk, wind, precip = [], [], []
    for point in grid:
        series = weather_by_point[point]
        r_row, w_row, p_row = [], [], []
        for h in range(hours + 1):
            sample = series.at_hour(start_hour + timedelta(hours=h))
            assessment = assess(Conditions(sample.wind_mph, sample.rain_in_hr, sample.snow_in_hr), load_lb)
            r_row.append(round(assessment.score, 2))
            w_row.append(round(sample.wind_mph, 1))
            p_row.append(round(sample.rain_in_hr + sample.snow_in_hr, 3))
        risk.append(r_row)
        wind.append(w_row)
        precip.append(p_row)
    return {
        "start": start_hour.isoformat(),
        "hours": hours,
        "spacing_deg": spacing,
        "points": [[lat, lon] for lat, lon in grid],
        "risk": risk,
        "wind": wind,
        "precip": precip,
    }

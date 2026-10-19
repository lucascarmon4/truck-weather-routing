import math
from bisect import bisect_left
from dataclasses import dataclass

EARTH_RADIUS_M = 6_371_008.8
METERS_PER_MILE = 1609.344


def haversine_m(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def fast_distance_m(lat1, lon1, lat2, lon2):
    x = math.radians(lon2 - lon1) * math.cos(math.radians((lat1 + lat2) / 2))
    y = math.radians(lat2 - lat1)
    return EARTH_RADIUS_M * math.hypot(x, y)


def cumulative_distances(coords):
    cum = [0.0]
    for (a_lat, a_lon), (b_lat, b_lon) in zip(coords, coords[1:]):
        cum.append(cum[-1] + haversine_m(a_lat, a_lon, b_lat, b_lon))
    return cum


def interpolate(xs, ys, x):
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    i = bisect_left(xs, x)
    x0, x1 = xs[i - 1], xs[i]
    if x1 == x0:
        return ys[i]
    t = (x - x0) / (x1 - x0)
    return ys[i - 1] + t * (ys[i] - ys[i - 1])


@dataclass
class Polyline:
    coords: list
    cum_m: list

    @classmethod
    def from_coords(cls, coords):
        return cls(coords=list(coords), cum_m=cumulative_distances(coords))

    @property
    def length_m(self):
        return self.cum_m[-1]

    def point_at(self, distance_m):
        if distance_m <= 0:
            return self.coords[0]
        if distance_m >= self.length_m:
            return self.coords[-1]
        i = bisect_left(self.cum_m, distance_m)
        d0, d1 = self.cum_m[i - 1], self.cum_m[i]
        t = 0.0 if d1 == d0 else (distance_m - d0) / (d1 - d0)
        (lat0, lon0), (lat1, lon1) = self.coords[i - 1], self.coords[i]
        return lat0 + t * (lat1 - lat0), lon0 + t * (lon1 - lon0)

    def sample_every(self, step_m):
        count = max(1, int(self.length_m // step_m))
        points = [self.point_at(i * step_m) for i in range(count + 1)]
        if self.length_m - count * step_m > 1:
            points.append(self.coords[-1])
        return points


def thin_indices(cum_m, min_step_m):
    keep = [0]
    for i in range(1, len(cum_m) - 1):
        if cum_m[i] - cum_m[keep[-1]] >= min_step_m:
            keep.append(i)
    if len(cum_m) > 1:
        keep.append(len(cum_m) - 1)
    return keep


def offset_point(lat, lon, bearing_rad, distance_m):
    dlat = distance_m * math.cos(bearing_rad) / EARTH_RADIUS_M
    dlon = distance_m * math.sin(bearing_rad) / (EARTH_RADIUS_M * math.cos(math.radians(lat)))
    return lat + math.degrees(dlat), lon + math.degrees(dlon)


def bearing_rad(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return math.atan2(x, y)


class SpatialIndex:
    def __init__(self, points, cell_deg=0.5):
        self.cell_deg = cell_deg
        self.cells = {}
        for lat, lon in points:
            self.cells.setdefault(self._key(lat, lon), []).append((lat, lon))

    def _key(self, lat, lon):
        return int(math.floor(lat / self.cell_deg)), int(math.floor(lon / self.cell_deg))

    def within(self, lat, lon, radius_m):
        reach_lat = radius_m / 111_000 / self.cell_deg
        reach_lon = reach_lat / max(0.2, math.cos(math.radians(lat)))
        ci, cj = self._key(lat, lon)
        ri, rj = math.ceil(reach_lat), math.ceil(reach_lon)
        for i in range(ci - ri, ci + ri + 1):
            for j in range(cj - rj, cj + rj + 1):
                for p in self.cells.get((i, j), ()):
                    if fast_distance_m(lat, lon, p[0], p[1]) <= radius_m:
                        return True
        return False

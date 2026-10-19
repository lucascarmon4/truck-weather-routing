import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import type { Level, Route, RouteGeometry } from '../api/types'

type LonLat = [number, number]

function upperIndex(values: number[], x: number) {
  let lo = 0
  let hi = values.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (values[mid] < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function pointAlong(coords: LonLat[], measures: number[], x: number): LonLat {
  if (x <= measures[0]) return coords[0]
  const last = measures.length - 1
  if (x >= measures[last]) return coords[last]
  const i = upperIndex(measures, x)
  const span = measures[i] - measures[i - 1]
  const t = span === 0 ? 0 : (x - measures[i - 1]) / span
  const [lon0, lat0] = coords[i - 1]
  const [lon1, lat1] = coords[i]
  return [lon0 + t * (lon1 - lon0), lat0 + t * (lat1 - lat0)]
}

export function sliceByMiles(geometry: RouteGeometry, from: number, to: number): LonLat[] {
  const { coordinates, miles } = geometry
  const inner = coordinates.filter((_, i) => miles[i] > from && miles[i] < to)
  return [pointAlong(coordinates, miles, from), ...inner, pointAlong(coordinates, miles, to)]
}

export function truckPosition(route: Route, secondsAfterDeparture: number) {
  const { coordinates, elapsed_s } = route.geometry
  const status =
    secondsAfterDeparture < 0 ? 'waiting' : secondsAfterDeparture >= route.trip_s ? 'arrived' : 'driving'
  return { position: pointAlong(coordinates, elapsed_s, secondsAfterDeparture), status } as const
}

export function checkpointWindows(route: Route) {
  const miles = route.checkpoints.map((cp) => cp.mile)
  return route.checkpoints.map((cp, i) => ({
    level: cp.level,
    from: i === 0 ? 0 : (miles[i - 1] + cp.mile) / 2,
    to: i === miles.length - 1 ? route.distance_mi : (cp.mile + miles[i + 1]) / 2,
  }))
}

export function riskSegments(route: Route): FeatureCollection<LineString, { routeId: string; level: Level }> {
  const merged: { level: Level; from: number; to: number }[] = []
  for (const window of checkpointWindows(route)) {
    const previous = merged[merged.length - 1]
    if (previous && previous.level === window.level) previous.to = window.to
    else merged.push({ ...window })
  }
  return {
    type: 'FeatureCollection',
    features: merged.map(({ level, from, to }) => ({
      type: 'Feature',
      properties: { routeId: route.id, level },
      geometry: { type: 'LineString', coordinates: sliceByMiles(route.geometry, from, to) },
    })),
  }
}

export function routeLines(routes: Route[]): FeatureCollection<LineString, { routeId: string; rank: number }> {
  return {
    type: 'FeatureCollection',
    features: routes.map((route) => ({
      type: 'Feature',
      properties: { routeId: route.id, rank: route.rank },
      geometry: { type: 'LineString', coordinates: route.geometry.coordinates },
    })),
  }
}

export function checkpointPoints(route: Route): FeatureCollection<Point, { index: number; level: Level }> {
  return {
    type: 'FeatureCollection',
    features: route.checkpoints.map(
      (cp): Feature<Point, { index: number; level: Level }> => ({
        type: 'Feature',
        id: cp.index,
        properties: { index: cp.index, level: cp.level },
        geometry: { type: 'Point', coordinates: [cp.lon, cp.lat] },
      }),
    ),
  }
}

export function routesBounds(routes: Route[]): [LonLat, LonLat] {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const route of routes) {
    for (const [lon, lat] of route.geometry.coordinates) {
      minLon = Math.min(minLon, lon)
      minLat = Math.min(minLat, lat)
      maxLon = Math.max(maxLon, lon)
      maxLat = Math.max(maxLat, lat)
    }
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ]
}

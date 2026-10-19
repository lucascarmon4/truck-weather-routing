import { describe, expect, it } from 'vitest'
import type { Checkpoint, Level, Route } from '../api/types'
import { pointAlong, riskSegments, sliceByMiles, truckPosition } from './geometry'

function checkpoint(mile: number, level: Level): Checkpoint {
  return {
    index: 0, mile, lat: 0, lon: mile, eta: '', drive_s: 0, covered_mi: 0, level, score: level,
    drivers: [], load_rule: null,
    weather: { wind_mph: 0, gust_mph: 0, rain_in_hr: 0, snow_in_hr: 0, temperature_f: null, weather_code: null },
  }
}

const route: Route = {
  id: 'Route A', name: '', rank: 1, recommended: true, distance_mi: 100, drive_s: 7200, trip_s: 7200,
  arrival: '', avg_risk: 0, max_level: 3,
  miles_by_level: { low: 0, moderate: 0, high: 0, severe: 0, no_travel: 0 },
  geometry: {
    coordinates: [[0, 0], [50, 0], [100, 0]],
    miles: [0, 50, 100],
    elapsed_s: [0, 3600, 7200],
  },
  stops: [],
  checkpoints: [checkpoint(0, 0), checkpoint(25, 0), checkpoint(50, 3), checkpoint(75, 0), checkpoint(100, 0)],
}

describe('pointAlong', () => {
  it('interpolates between vertices and clamps at the ends', () => {
    expect(pointAlong(route.geometry.coordinates, route.geometry.miles, 25)).toEqual([25, 0])
    expect(pointAlong(route.geometry.coordinates, route.geometry.miles, -5)).toEqual([0, 0])
    expect(pointAlong(route.geometry.coordinates, route.geometry.miles, 500)).toEqual([100, 0])
  })
})

describe('sliceByMiles', () => {
  it('cuts the line exactly at both miles', () => {
    expect(sliceByMiles(route.geometry, 30, 70)).toEqual([[30, 0], [50, 0], [70, 0]])
  })
})

describe('truckPosition', () => {
  it('follows elapsed time and reports status', () => {
    expect(truckPosition(route, 1800)).toEqual({ position: [25, 0], mile: 25, status: 'driving' })
    expect(truckPosition(route, -60).status).toBe('waiting')
    expect(truckPosition(route, 9000)).toEqual({ position: [100, 0], mile: 100, status: 'arrived' })
  })

  it('parks the truck during a rest stop', () => {
    const resting = { ...route, stops: [{ kind: 'rest' as const, mile: 60, lat: 0, lon: 60, start_s: 4000, end_s: 40000 }] }
    expect(truckPosition(resting, 5000)).toEqual({ position: [60, 0], mile: 60, status: 'rest', until: 40000 })
  })
})

describe('riskSegments', () => {
  it('colors each checkpoint window and merges equal neighbours', () => {
    const features = riskSegments(route).features
    expect(features.map((f) => f.properties.level)).toEqual([0, 3, 0])
    expect(features[1].geometry.coordinates[0]).toEqual([37.5, 0])
    expect(features[1].geometry.coordinates.at(-1)).toEqual([62.5, 0])
  })
})

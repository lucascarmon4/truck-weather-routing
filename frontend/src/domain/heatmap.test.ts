import { describe, expect, it } from 'vitest'
import type { Heatmap } from '../api/types'
import { buildGrid, colorAt, type ColorStop } from './heatmap'

const stops: ColorStop[] = [
  [0, [0, 0, 0, 0]],
  [10, [100, 200, 50, 1]],
]

describe('colorAt', () => {
  it('interpolates between stops and clamps outside them', () => {
    expect(colorAt(stops, 5)).toEqual([50, 100, 25, 0.5])
    expect(colorAt(stops, -1)).toEqual([0, 0, 0, 0])
    expect(colorAt(stops, 99)).toEqual([100, 200, 50, 1])
  })
})

describe('buildGrid', () => {
  const heatmap: Heatmap = {
    start: '', hours: 0, spacing_deg: 0.5, risk: [], wind: [], precip: [],
    points: [[40, -100], [40, -99.5], [41, -99]],
  }

  it('places every point in its lattice cell and leaves the rest empty', () => {
    const grid = buildGrid(heatmap)
    expect([grid.rows, grid.cols]).toEqual([3, 3])
    expect(Array.from(grid.cellIndex)).toEqual([0, 1, -1, -1, -1, -1, -1, -1, 2])
  })

  it('extends the image half a cell past the outer points', () => {
    const [[west, north], , [east, south]] = buildGrid(heatmap).coordinates
    expect([west, north, east, south]).toEqual([-100.25, 41.25, -98.75, 39.75])
  })

  it('gives full weight to a point at its own cell center', () => {
    const grid = buildGrid(heatmap)
    const scale = grid.width / grid.cols
    const px = Math.floor(scale / 2)
    const py = grid.height - 1 - Math.floor(scale / 2)
    const base = (py * grid.width + px) * 4
    const taps = Array.from(grid.taps.slice(base, base + 4))
    const weights = Array.from(grid.weights.slice(base, base + 4))
    expect(weights[taps.indexOf(0)]).toBeGreaterThan(0.7)
  })
})

import type { Heatmap } from '../api/types'
import { LEVEL_COLOR } from './risk'

export type HeatmapLayer = 'risk' | 'wind' | 'precip'

type Rgba = [number, number, number, number]
export type ColorStop = [value: number, color: Rgba]

function hex(color: string, alpha: number): Rgba {
  const n = parseInt(color.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha]
}

type Scale = { label: string; unit: string; ticks: string[]; stops: ColorStop[] }

export const HEATMAP_SCALES: Record<HeatmapLayer, Scale> = {
  risk: {
    label: 'Risk',
    unit: 'level 0–4',
    ticks: ['Low', 'Mod', 'High', 'Sev', 'No Trv'],
    stops: [
      [0, hex(LEVEL_COLOR[0], 0.24)],
      [1, hex(LEVEL_COLOR[1], 0.46)],
      [2, hex(LEVEL_COLOR[2], 0.64)],
      [3, hex(LEVEL_COLOR[3], 0.8)],
      [4, hex(LEVEL_COLOR[4], 0.86)],
    ],
  },
  wind: {
    label: 'Wind',
    unit: 'mph',
    ticks: ['0', '15', '30', '45', '60+'],
    stops: [
      [0, hex('#B5CCE6', 0.2)],
      [15, hex('#8DB0DA', 0.42)],
      [30, hex('#6E9BCB', 0.6)],
      [45, hex('#3462A4', 0.76)],
      [60, hex('#14306B', 0.88)],
    ],
  },
  precip: {
    label: 'Precipitation',
    unit: 'in/hr',
    ticks: ['0', '0.1', '0.25', '0.5', '1+'],
    stops: [
      [0, hex('#9ED8C6', 0)],
      [0.01, hex('#9ED8C6', 0.32)],
      [0.1, hex('#6CC3B0', 0.48)],
      [0.25, hex('#46AFA0', 0.62)],
      [0.5, hex('#1B7C86', 0.76)],
      [1, hex('#0D4560', 0.88)],
    ],
  },
}

export function scaleGradient(layer: HeatmapLayer) {
  const colors = HEATMAP_SCALES[layer].stops.map(([, [r, g, b]]) => `rgb(${r},${g},${b})`)
  return `linear-gradient(90deg, ${colors.join(', ')})`
}

export function colorAt(stops: ColorStop[], value: number): Rgba {
  if (value <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [v1, c1] = stops[i]
    if (value <= v1) {
      const [v0, c0] = stops[i - 1]
      const t = (value - v0) / (v1 - v0)
      return c0.map((channel, k) => channel + t * (c1[k] - channel)) as Rgba
    }
  }
  return stops[stops.length - 1][1]
}

const MAX_IMAGE_WIDTH = 480

function mercatorY(lat: number) {
  const rad = (lat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + rad / 2))
}

function latFromMercator(y: number) {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI
}

export type HeatmapGrid = {
  rows: number
  cols: number
  cellIndex: Int32Array
  width: number
  height: number
  taps: Int32Array
  weights: Float32Array
  coordinates: [[number, number], [number, number], [number, number], [number, number]]
}

export function buildGrid(heatmap: Heatmap): HeatmapGrid {
  const s = heatmap.spacing_deg
  const lats = heatmap.points.map((p) => p[0])
  const lons = heatmap.points.map((p) => p[1])
  const lat0 = Math.min(...lats)
  const lon0 = Math.min(...lons)
  const rows = Math.round((Math.max(...lats) - lat0) / s) + 1
  const cols = Math.round((Math.max(...lons) - lon0) / s) + 1
  const cellIndex = new Int32Array(rows * cols).fill(-1)
  heatmap.points.forEach(([lat, lon], i) => {
    cellIndex[Math.round((lat - lat0) / s) * cols + Math.round((lon - lon0) / s)] = i
  })
  const cell = (r: number, c: number) => (r < 0 || c < 0 || r >= rows || c >= cols ? -1 : cellIndex[r * cols + c])

  const north = lat0 + (rows - 0.5) * s
  const south = lat0 - 0.5 * s
  const west = lon0 - 0.5 * s
  const east = lon0 + (cols - 0.5) * s
  const scale = Math.max(2, Math.min(8, Math.floor(MAX_IMAGE_WIDTH / cols)))
  const width = cols * scale
  const height = rows * scale
  const yNorth = mercatorY(north)
  const ySouth = mercatorY(south)

  const taps = new Int32Array(width * height * 4).fill(-1)
  const weights = new Float32Array(width * height * 4)
  for (let py = 0; py < height; py++) {
    const lat = latFromMercator(yNorth + ((py + 0.5) / height) * (ySouth - yNorth))
    const gy = (lat - lat0) / s
    const r0 = Math.floor(gy)
    const ty = gy - r0
    for (let px = 0; px < width; px++) {
      const gx = (west + ((px + 0.5) / width) * (east - west) - lon0) / s
      const c0 = Math.floor(gx)
      const tx = gx - c0
      const base = (py * width + px) * 4
      const corners: [number, number][] = [
        [cell(r0, c0), (1 - tx) * (1 - ty)],
        [cell(r0, c0 + 1), tx * (1 - ty)],
        [cell(r0 + 1, c0), (1 - tx) * ty],
        [cell(r0 + 1, c0 + 1), tx * ty],
      ]
      corners.forEach(([index, weight], k) => {
        taps[base + k] = index
        weights[base + k] = weight
      })
    }
  }
  return {
    rows,
    cols,
    cellIndex,
    width,
    height,
    taps,
    weights,
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
  }
}

export function createFrameRenderer(heatmap: Heatmap, grid: HeatmapGrid, layer: HeatmapLayer) {
  const values = heatmap[layer]
  const { stops } = HEATMAP_SCALES[layer]
  const cache = new Map<number, ImageData>()

  return (hour: number) => {
    const hit = cache.get(hour)
    if (hit) return hit
    const image = new ImageData(grid.width, grid.height)
    const pixels = grid.width * grid.height
    for (let p = 0; p < pixels; p++) {
      let coverage = 0
      let sum = 0
      for (let k = p * 4; k < p * 4 + 4; k++) {
        const index = grid.taps[k]
        if (index < 0) continue
        coverage += grid.weights[k]
        sum += grid.weights[k] * values[index][hour]
      }
      if (coverage < 0.02) continue
      const [r, g, b, a] = colorAt(stops, sum / coverage)
      const offset = p * 4
      image.data[offset] = r
      image.data[offset + 1] = g
      image.data[offset + 2] = b
      image.data[offset + 3] = Math.round(a * Math.min(1, coverage * 1.5) * 255)
    }
    cache.set(hour, image)
    return image
  }
}

import type { LayerProps } from 'react-map-gl/maplibre'
import { LEVEL_COLOR, LEVELS } from '../domain/risk'

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

const levelColor = ['match', ['get', 'level'], ...LEVELS.flatMap((l) => [l, LEVEL_COLOR[l]]), '#888'] as unknown as string
const round = { 'line-cap': 'round', 'line-join': 'round' } as const

export const routesHitLayer: LayerProps = {
  id: 'routes-hit',
  type: 'line',
  paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 18 },
  layout: round,
}

export function routesLayer(selectedId: string | null): LayerProps {
  return {
    id: 'routes',
    type: 'line',
    filter: ['!=', ['get', 'routeId'], selectedId ?? ''],
    paint: { 'line-color': '#8F96A0', 'line-opacity': 0.9, 'line-width': 4 },
    layout: round,
  }
}

export const selectedOuterCasingLayer: LayerProps = {
  id: 'selected-casing-outer',
  type: 'line',
  paint: { 'line-color': 'rgba(26,31,38,0.45)', 'line-width': 12 },
  layout: round,
}

export const selectedCasingLayer: LayerProps = {
  id: 'selected-casing',
  type: 'line',
  paint: { 'line-color': '#FFFFFF', 'line-width': 10 },
  layout: round,
}

export const riskSegmentsLayer: LayerProps = {
  id: 'risk-segments',
  type: 'line',
  paint: { 'line-color': levelColor, 'line-width': 6 },
  layout: round,
}

export const checkpointsLayer: LayerProps = {
  id: 'checkpoints',
  type: 'circle',
  paint: {
    'circle-color': levelColor,
    'circle-radius': 5.5,
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-width': 1.5,
  },
}

export function checkpointHighlightLayer(index: number | null): LayerProps {
  return {
    id: 'checkpoint-highlight',
    type: 'circle',
    filter: ['==', ['get', 'index'], index ?? -1],
    paint: {
      'circle-color': levelColor,
      'circle-radius': 8,
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 3,
    },
  }
}

export function checkpointRingLayer(index: number | null): LayerProps {
  return {
    id: 'checkpoint-ring',
    type: 'circle',
    filter: ['==', ['get', 'index'], index ?? -1],
    paint: {
      'circle-color': 'rgba(0,0,0,0)',
      'circle-radius': 11,
      'circle-stroke-color': '#1A1F26',
      'circle-stroke-width': 2,
    },
  }
}

export function heatmapLayer(opacity: number): LayerProps {
  return {
    id: 'heatmap',
    type: 'raster',
    paint: { 'raster-opacity': opacity, 'raster-resampling': 'linear', 'raster-fade-duration': 0 },
  }
}

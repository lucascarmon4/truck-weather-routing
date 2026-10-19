import type { LayerProps } from 'react-map-gl/maplibre'
import { LEVEL_COLOR, LEVELS } from '../domain/risk'

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

const levelColor = ['match', ['get', 'level'], ...LEVELS.flatMap((l) => [l, LEVEL_COLOR[l]]), '#888'] as unknown as string

export const routesHitLayer: LayerProps = {
  id: 'routes-hit',
  type: 'line',
  paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 16 },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
}

export function routesLayer(selectedId: string | null): LayerProps {
  return {
    id: 'routes',
    type: 'line',
    filter: ['!=', ['get', 'routeId'], selectedId ?? ''],
    paint: { 'line-color': '#7b8794', 'line-opacity': 0.75, 'line-width': 4 },
    layout: { 'line-cap': 'round', 'line-join': 'round' },
  }
}

export const selectedCasingLayer: LayerProps = {
  id: 'selected-casing',
  type: 'line',
  paint: { 'line-color': '#ffffff', 'line-width': 10 },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
}

export const riskSegmentsLayer: LayerProps = {
  id: 'risk-segments',
  type: 'line',
  paint: { 'line-color': levelColor, 'line-width': 6 },
  layout: { 'line-cap': 'round', 'line-join': 'round' },
}

export const checkpointsLayer: LayerProps = {
  id: 'checkpoints',
  type: 'circle',
  paint: {
    'circle-color': levelColor,
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3.5, 10, 7],
    'circle-stroke-color': '#ffffff',
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
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 7, 10, 11],
      'circle-stroke-color': '#111827',
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

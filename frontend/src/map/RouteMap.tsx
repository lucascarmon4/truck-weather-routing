import 'maplibre-gl/dist/maplibre-gl.css'
import './worker'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from 'react-map-gl/maplibre'
import type { Checkpoint, PlanResponse, Route } from '../api/types'
import { checkpointPoints, riskSegments, routeLines, routesBounds, truckPosition } from '../domain/geometry'
import type { HeatmapLayer } from '../domain/heatmap'
import { useHeatmapFrames } from '../hooks/useHeatmapFrames'
import {
  MAP_STYLE,
  checkpointHighlightLayer,
  checkpointsLayer,
  heatmapLayer,
  riskSegmentsLayer,
  routesHitLayer,
  routesLayer,
  selectedCasingLayer,
} from './layers'

const INITIAL_VIEW = { longitude: -98.5, latitude: 39.5, zoom: 3.6 }
const FIT_PADDING = { top: 60, bottom: 160, left: 60, right: 60 }

export type RouteMapProps = {
  plan?: PlanResponse
  selectedRouteId: string | null
  onSelectRoute: (id: string) => void
  hour: number
  heatmapLayer: HeatmapLayer
  heatmapVisible: boolean
  heatmapOpacity: number
  highlightedCheckpoint: number | null
  onHighlightCheckpoint: (index: number | null) => void
  renderCheckpoint?: (checkpoint: Checkpoint, route: Route) => ReactNode
  renderTruck?: (route: Route, status: 'waiting' | 'driving' | 'arrived') => ReactNode
  renderPlace?: (kind: 'origin' | 'destination') => ReactNode
}

export function RouteMap({
  plan,
  selectedRouteId,
  onSelectRoute,
  hour,
  heatmapLayer: layer,
  heatmapVisible,
  heatmapOpacity,
  highlightedCheckpoint,
  onHighlightCheckpoint,
  renderCheckpoint,
  renderTruck,
  renderPlace,
}: RouteMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [cursor, setCursor] = useState('')
  const routes = useMemo(() => plan?.routes ?? [], [plan])
  const selected = routes.find((r) => r.id === selectedRouteId) ?? null

  const lines = useMemo(() => routeLines(routes), [routes])
  const segments = useMemo(() => (selected ? riskSegments(selected) : null), [selected])
  const points = useMemo(() => (selected ? checkpointPoints(selected) : null), [selected])
  const heatmap = useHeatmapFrames(plan?.heatmap, layer)

  useEffect(() => {
    if (!routes.length) return
    mapRef.current?.fitBounds(routesBounds(routes), { padding: FIT_PADDING, duration: 800 })
  }, [routes])

  const secondsAfterDeparture = useMemo(() => {
    if (!plan) return 0
    const at = new Date(plan.heatmap.start).getTime() + hour * 3_600_000
    return (at - new Date(plan.request.departure).getTime()) / 1000
  }, [plan, hour])

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0]
    if (!feature) return
    if (feature.layer.id === 'checkpoints') onHighlightCheckpoint(feature.properties.index as number)
    else onSelectRoute(feature.properties.routeId as string)
  }

  const handleMove = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0]
    setCursor(feature ? 'pointer' : '')
    if (feature?.layer.id === 'checkpoints') onHighlightCheckpoint(feature.properties.index as number)
  }

  const highlighted = selected && highlightedCheckpoint !== null ? selected.checkpoints[highlightedCheckpoint] : null

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      mapStyle={MAP_STYLE}
      style={{ width: '100%', height: '100%' }}
      interactiveLayerIds={['checkpoints', 'routes-hit']}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={() => setCursor('')}
      cursor={cursor}
      dragRotate={false}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {heatmapVisible && heatmap.coordinates && heatmap.frameUrl && (
        <Source id="heatmap" type="image" url={heatmap.frameUrl(hour)} coordinates={heatmap.coordinates}>
          <Layer {...heatmapLayer(heatmapOpacity)} />
        </Source>
      )}

      <Source id="routes" type="geojson" data={lines}>
        <Layer {...routesLayer(selectedRouteId)} />
        <Layer {...routesHitLayer} />
      </Source>

      {segments && (
        <Source id="risk-segments" type="geojson" data={segments}>
          <Layer {...selectedCasingLayer} />
          <Layer {...riskSegmentsLayer} />
        </Source>
      )}

      {points && (
        <Source id="checkpoints" type="geojson" data={points}>
          <Layer {...checkpointsLayer} />
          <Layer {...checkpointHighlightLayer(highlightedCheckpoint)} />
        </Source>
      )}

      {routes.map((route) => {
        const { position, status } = truckPosition(route, secondsAfterDeparture)
        return (
          <Marker key={route.id} longitude={position[0]} latitude={position[1]} anchor="center">
            {renderTruck ? renderTruck(route, status) : <DefaultDot color={route.id === selectedRouteId ? '#111827' : '#7b8794'} />}
          </Marker>
        )
      })}

      {plan && (
        <>
          <Marker longitude={plan.request.origin.lon} latitude={plan.request.origin.lat} anchor="bottom">
            {renderPlace ? renderPlace('origin') : <DefaultDot color="#2563eb" />}
          </Marker>
          <Marker longitude={plan.request.destination.lon} latitude={plan.request.destination.lat} anchor="bottom">
            {renderPlace ? renderPlace('destination') : <DefaultDot color="#111827" />}
          </Marker>
        </>
      )}

      {highlighted && selected && (
        <Popup
          longitude={highlighted.lon}
          latitude={highlighted.lat}
          closeButton={false}
          closeOnClick={false}
          offset={12}
          onClose={() => onHighlightCheckpoint(null)}
        >
          {renderCheckpoint ? renderCheckpoint(highlighted, selected) : `Mile ${highlighted.mile}`}
        </Popup>
      )}
    </Map>
  )
}

function DefaultDot({ color }: { color: string }) {
  return <div style={{ width: 14, height: 14, borderRadius: 7, background: color, border: '2px solid #fff' }} />
}

import 'maplibre-gl/dist/maplibre-gl.css'
import './worker'
import { Box, ButtonBase } from '@mui/material'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { ImageSource } from 'maplibre-gl'
import Map, { Layer, Marker, Popup, Source, useMap, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre'
import type { Checkpoint, PlanResponse, Route } from '../api/types'
import { FitIcon, MinusIcon, PlusIcon } from '../components/icons'
import { routeLetter, shortPlace } from '../domain/format'
import { checkpointPoints, pointAlong, riskSegments, routeLines, routesBounds, truckPosition } from '../domain/geometry'
import type { HeatmapLayer } from '../domain/heatmap'
import { truckStatusText } from '../domain/truckStatus'
import { useHeatmapFrames } from '../hooks/useHeatmapFrames'
import { ui } from '../theme'
import {
  MAP_STYLE,
  checkpointHighlightLayer,
  checkpointRingLayer,
  checkpointsLayer,
  heatmapLayer,
  riskSegmentsLayer,
  routesHitLayer,
  routesLayer,
  selectedCasingLayer,
  selectedOuterCasingLayer,
} from './layers'
import { DestinationMarker, OriginMarker, RestMarker, RouteBadge, TruckMarker } from './markers'

const INITIAL_VIEW = { longitude: -98.5, latitude: 39.5, zoom: 3.6 }
const BADGE_AT = [0.5, 0.62, 0.38]

export type Padding = { top: number; bottom: number; left: number; right: number }

export type RouteMapProps = {
  plan?: PlanResponse
  selectedRouteId: string | null
  onSelectRoute: (id: string) => void
  hour: number
  heatmapLayer: HeatmapLayer
  heatmapVisible: boolean
  heatmapOpacity: number
  activeCheckpoint: number | null
  onHoverCheckpoint: (index: number | null) => void
  onPickCheckpoint: (index: number) => void
  renderCheckpoint: (checkpoint: Checkpoint, route: Route) => ReactNode
  padding: Padding
  showControls?: boolean
  children?: ReactNode
}

export function RouteMap({
  plan,
  selectedRouteId,
  onSelectRoute,
  hour,
  heatmapLayer: layer,
  heatmapVisible,
  heatmapOpacity,
  activeCheckpoint,
  onHoverCheckpoint,
  onPickCheckpoint,
  renderCheckpoint,
  padding,
  showControls = true,
  children,
}: RouteMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [cursor, setCursor] = useState('')
  const routes = useMemo(() => plan?.routes ?? [], [plan])
  const selected = routes.find((r) => r.id === selectedRouteId) ?? null

  const lines = useMemo(() => routeLines(routes), [routes])
  const segments = useMemo(() => (selected ? riskSegments(selected) : null), [selected])
  const points = useMemo(() => (selected ? checkpointPoints(selected) : null), [selected])
  const badges = useMemo(
    () =>
      [...routes]
        .sort((a, b) => a.rank - b.rank)
        .map((route, i) => ({
          route,
          at: pointAlong(route.geometry.coordinates, route.geometry.miles, route.distance_mi * BADGE_AT[i % BADGE_AT.length]),
        })),
    [routes],
  )
  const heatmap = useHeatmapFrames(plan?.heatmap, layer)
  const paddingRef = useRef(padding)
  useEffect(() => {
    paddingRef.current = padding
  })

  useEffect(() => {
    if (routes.length) mapRef.current?.fitBounds(routesBounds(routes), { padding: paddingRef.current, duration: 800 })
  }, [routes])

  const secondsAfterDeparture = plan
    ? (new Date(plan.heatmap.start).getTime() + hour * 3_600_000 - new Date(plan.request.departure).getTime()) / 1000
    : 0

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0]
    if (!feature) return
    if (feature.layer.id === 'checkpoints') onPickCheckpoint(feature.properties.index as number)
    else onSelectRoute(feature.properties.routeId as string)
  }

  const handleMove = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0]
    setCursor(feature ? 'pointer' : '')
    onHoverCheckpoint(feature?.layer.id === 'checkpoints' ? (feature.properties.index as number) : null)
  }

  const active = selected && activeCheckpoint !== null ? selected.checkpoints[activeCheckpoint] : null
  const destination = plan ? shortPlace(plan.request.destination.label).split(',')[0] : ''

  return (
    <Box sx={{ position: 'absolute', inset: 0, bgcolor: ui.basemap }}>
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['checkpoints', 'routes-hit']}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => {
          setCursor('')
          onHoverCheckpoint(null)
        }}
        cursor={cursor}
        dragRotate={false}
        attributionControl={{ compact: true }}
      >
        {heatmapVisible && heatmap.coordinates && heatmap.frame && (
          <HeatmapImage frame={heatmap.frame(Math.round(hour))} coordinates={heatmap.coordinates} opacity={heatmapOpacity} />
        )}

        <Source id="routes" type="geojson" data={lines}>
          <Layer {...routesLayer(selectedRouteId)} />
          <Layer {...routesHitLayer} />
        </Source>

        {segments && (
          <Source id="risk-segments" type="geojson" data={segments}>
            <Layer {...selectedOuterCasingLayer} />
            <Layer {...selectedCasingLayer} />
            <Layer {...riskSegmentsLayer} />
          </Source>
        )}

        {points && (
          <Source id="checkpoints" type="geojson" data={points}>
            <Layer {...checkpointsLayer} />
            <Layer {...checkpointRingLayer(activeCheckpoint)} />
            <Layer {...checkpointHighlightLayer(activeCheckpoint)} />
          </Source>
        )}

        {selected?.stops
          .filter((stop) => stop.kind === 'rest')
          .map((stop) => (
            <Marker key={`${stop.start_s}`} longitude={stop.lon} latitude={stop.lat} anchor="top">
              <RestMarker label="10 h rest" />
            </Marker>
          ))}

        {badges.map(({ route, at }) => (
          <Marker key={route.id} longitude={at[0]} latitude={at[1]} anchor="center">
            <RouteBadge letter={routeLetter(route.id)} selected={route.id === selectedRouteId} onClick={() => onSelectRoute(route.id)} />
          </Marker>
        ))}

        {plan && (
          <>
            <Marker longitude={plan.request.origin.lon} latitude={plan.request.origin.lat} anchor="center">
              <OriginMarker label={shortPlace(plan.request.origin.label)} />
            </Marker>
            <Marker longitude={plan.request.destination.lon} latitude={plan.request.destination.lat} anchor="bottom">
              <DestinationMarker label={shortPlace(plan.request.destination.label)} />
            </Marker>
          </>
        )}

        {plan &&
          [...routes]
            .sort((a, b) => Number(a.id === selectedRouteId) - Number(b.id === selectedRouteId))
            .map((route) => {
              const state = truckPosition(route, secondsAfterDeparture)
              const isSelected = route.id === selectedRouteId
              return (
                <Marker key={route.id} longitude={state.position[0]} latitude={state.position[1]} anchor="center" style={{ zIndex: isSelected ? 3 : 2 }}>
                  <TruckMarker
                    letter={routeLetter(route.id)}
                    selected={isSelected}
                    status={truckStatusText(state, destination, plan.request.departure)}
                  />
                </Marker>
              )
            })}

        {active && selected && (
          <Popup
            longitude={active.lon}
            latitude={active.lat}
            closeButton={false}
            closeOnClick={false}
            offset={16}
            maxWidth="260px"
            className="checkpoint-popup"
            style={{ zIndex: 5 }}
          >
            {renderCheckpoint(active, selected)}
          </Popup>
        )}
        {showControls && <MapControls routes={routes} padding={padding} />}
      </Map>

      {children}

    </Box>
  )
}

function MapControls({ routes, padding }: { routes: Route[]; padding: Padding }) {
  const { current: map } = useMap()
  const buttons = [
    { label: 'Zoom in', icon: <PlusIcon />, run: () => map?.zoomIn() },
    { label: 'Zoom out', icon: <MinusIcon />, run: () => map?.zoomOut() },
    { label: 'Fit routes', icon: <FitIcon />, run: () => routes.length && map?.fitBounds(routesBounds(routes), { padding, duration: 800 }) },
  ]
  return (
    <Box
      sx={{ position: 'absolute', right: 16, top: 16, display: 'flex', flexDirection: 'column', borderRadius: 2, bgcolor: '#FFFFFF', boxShadow: ui.shadow, overflow: 'hidden' }}
    >
      {buttons.map(({ label, icon, run }, i) => (
        <ButtonBase key={label} aria-label={label} onClick={run} sx={{ width: 36, height: 36, color: ui.textBody, borderTop: i ? `1px solid ${ui.dividerLight}` : 0 }}>
          {icon}
        </ButtonBase>
      ))}
    </Box>
  )
}

type Corners = [[number, number], [number, number], [number, number], [number, number]]

function HeatmapImage({ frame, coordinates, opacity }: { frame: ImageData; coordinates: Corners; opacity: number }) {
  const { current: ref } = useMap()

  useEffect(() => {
    const map = ref?.getMap()
    if (!map) return
    const apply = () => {
      const source = map.getSource<ImageSource>('heatmap')
      if (!source) return
      map.off('sourcedata', apply)
      source.updateImage({ image: frame, coordinates })
    }
    map.on('sourcedata', apply)
    apply()
    return () => {
      map.off('sourcedata', apply)
    }
  }, [ref, frame, coordinates])

  return (
    <Source id="heatmap" type="image" coordinates={coordinates}>
      <Layer {...heatmapLayer(opacity)} />
    </Source>
  )
}

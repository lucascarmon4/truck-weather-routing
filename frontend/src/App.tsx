import { Box, ButtonBase, ToggleButton, ToggleButtonGroup, useMediaQuery } from '@mui/material'
import { useState } from 'react'
import type { PlanResponse } from './api/types'
import { CheckpointTable } from './components/CheckpointTable'
import { CheckpointTooltip } from './components/CheckpointTooltip'
import { ForecastTimeline } from './components/ForecastTimeline'
import { HeatmapControls } from './components/HeatmapControls'
import { CloseIcon, EditIcon, LayersIcon, RouteIcon } from './components/icons'
import { EmptyState, ErrorState, LoadingSkeleton, LoadingState } from './components/PlanStatus'
import { RecommendationBanner } from './components/RecommendationBanner'
import { RiskLegend } from './components/RiskLegend'
import { RouteCard } from './components/RouteCard'
import { RulesPanel } from './components/RulesPanel'
import { TripForm } from './components/TripForm'
import { TripSummary } from './components/TripSummary'
import { worstCheckpoint } from './domain/geometry'
import { HEATMAP_SCALES, type HeatmapLayer } from './domain/heatmap'
import { emptyTrip, exampleTrip, toPlanRequest, tripLine, tripMeta, type TripFormValue } from './domain/trip'
import { usePlan } from './hooks/usePlan'
import { useTimeline } from './hooks/useTimeline'
import { RouteMap } from './map/RouteMap'
import { theme, ui } from './theme'

const PANEL_WIDTH = 400
const TIMELINE_H = 64
const TABLE_BAR_H = 42
const TABLE_H = 224

type Pinned = { routeId: string; index: number }

function hourOf(plan: PlanResponse, at: string) {
  const hours = (new Date(at).getTime() - new Date(plan.heatmap.start).getTime()) / 3_600_000
  return Math.min(plan.heatmap.hours, Math.max(0, Math.round(hours)))
}

export default function App() {
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const { state, run } = usePlan()
  const [trip, setTrip] = useState<TripFormValue>(emptyTrip)
  const [formOpen, setFormOpen] = useState(true)
  const [selection, setSelection] = useState<{ plan: PlanResponse; routeId: string } | null>(null)
  const [pinned, setPinned] = useState<(Pinned & { plan: PlanResponse }) | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [layer, setLayer] = useState<HeatmapLayer>('risk')
  const [heatmapOn, setHeatmapOn] = useState(true)
  const [opacity, setOpacity] = useState(0.75)
  const [tableOpen, setTableOpen] = useState(true)

  const plan = state.status === 'success' ? state.data : undefined
  const timeline = useTimeline(plan?.heatmap.hours ?? 48)
  const selectedId = plan ? (selection?.plan === plan ? selection.routeId : plan.recommendation.route_id) : null
  const selected = plan?.routes.find((r) => r.id === selectedId) ?? null
  const pinnedIndex =
    plan && selected ? (pinned?.plan === plan && pinned.routeId === selected.id ? pinned.index : worstCheckpoint(selected).index) : null
  const activeCheckpoint = hovered ?? pinnedIndex
  const showForm = formOpen || !plan

  const submitTrip = async (next: TripFormValue) => {
    setTrip(next)
    setHovered(null)
    const data = await run(toPlanRequest(next))
    if (!data) return
    setFormOpen(false)
    const best = data.routes.find((r) => r.id === data.recommendation.route_id)!
    timeline.jump(hourOf(data, worstCheckpoint(best).eta))
  }

  const selectRoute = (routeId: string) => {
    if (!plan) return
    setSelection({ plan, routeId })
    setHovered(null)
  }

  const pickCheckpoint = (index: number) => {
    if (!plan || !selected) return
    setPinned({ plan, routeId: selected.id, index })
    timeline.jump(hourOf(plan, selected.checkpoints[index].eta))
  }

  const panelBody = (
    <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: desktop ? '16px 16px 24px' : '8px 16px 24px' }}>
      {showForm ? (
        <TripForm
          value={trip}
          onChange={(patch) => setTrip((current) => ({ ...current, ...patch }))}
          onSubmit={() => submitTrip(trip)}
          locked={state.status === 'loading'}
          onCollapse={plan && state.status === 'success' ? () => setFormOpen(false) : undefined}
          showHeader={desktop}
        />
      ) : (
        desktop && plan && <TripSummary plan={plan} onEdit={() => setFormOpen(true)} />
      )}

      <>
          {state.status === 'idle' && <EmptyState onExample={() => submitTrip(exampleTrip())} />}
          {state.status === 'loading' && (
            <>
              <LoadingState startedAt={state.startedAt} />
              <LoadingSkeleton />
            </>
          )}
          {state.status === 'error' && <ErrorState message={state.message} onRetry={() => submitTrip(trip)} />}
          {plan && (desktop || !showForm) && (
            <>
              <RecommendationBanner plan={plan} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Box component="h2" sx={{ m: 0, fontSize: 14, fontWeight: 600 }}>Routes</Box>
                  <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>Best first · click to show on map</Box>
                </Box>
                {plan.recommendation.ranking.map((id) => {
                  const route = plan.routes.find((r) => r.id === id)!
                  return <RouteCard key={id} route={route} selected={id === selectedId} hos={plan.request.hos} onSelect={() => selectRoute(id)} />
                })}
              </Box>
              <RulesPanel rules={plan.rules} criteria={plan.recommendation.criteria} />
            </>
          )}
      </>
    </Box>
  )

  const timelineProps = plan && {
    start: plan.heatmap.start,
    departure: plan.request.departure,
    hours: plan.heatmap.hours,
    route: selected,
    hour: timeline.hour,
    onHour: timeline.setHour,
    playing: timeline.playing,
    onToggle: timeline.toggle,
    onStep: timeline.step,
  }

  const dockHeight = plan && desktop ? TIMELINE_H + TABLE_BAR_H + (tableOpen ? TABLE_H : 0) : 0
  const padding = desktop
    ? { top: 96, bottom: dockHeight + 80, left: 48, right: 72 }
    : { top: 130, bottom: 480, left: 32, right: 32 }

  const mapHint =
    state.status === 'idle'
      ? 'Routes, checkpoints and the forecast heatmap appear here after you plan a trip.'
      : state.status === 'error'
        ? 'No routes to show. Fix the trip or retry.'
        : null

  return (
    <Box sx={{ position: 'relative', height: '100vh', minHeight: 560, overflow: 'hidden', bgcolor: ui.basemap }}>
      <Box sx={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: desktop ? PANEL_WIDTH : 0 }}>
        <RouteMap
          plan={plan}
          selectedRouteId={selectedId}
          onSelectRoute={selectRoute}
          hour={timeline.hour}
          heatmapLayer={layer}
          heatmapVisible={heatmapOn}
          heatmapOpacity={opacity}
          activeCheckpoint={desktop ? activeCheckpoint : hovered}
          popupCheckpoint={hovered}
          onHoverCheckpoint={setHovered}
          onPickCheckpoint={pickCheckpoint}
          renderCheckpoint={(cp) => <CheckpointTooltip checkpoint={cp} />}
          padding={padding}
          showControls={desktop}
        >
          {mapHint && (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: desktop ? '50%' : '30%',
                transform: 'translate(-50%, -50%)',
                maxWidth: 340,
                p: '12px 16px',
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.92)',
                boxShadow: '0 1px 3px rgba(16,24,40,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                fontSize: 13,
                color: ui.textBody,
                pointerEvents: 'none',
              }}
            >
              <RouteIcon color={ui.textSecondary} />
              <span>{mapHint}</span>
            </Box>
          )}
          {state.status === 'loading' && (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: 16,
                transform: 'translateX(-50%)',
                height: 32,
                px: 1.75,
                borderRadius: 4,
                bgcolor: '#FFFFFF',
                boxShadow: ui.shadow,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Planning routes and sampling the forecast…
            </Box>
          )}

          {desktop && plan && timelineProps && (
            <>
              <Box sx={{ position: 'absolute', left: 16, top: 16, right: 68, display: 'flex', pointerEvents: 'none', '& > *': { pointerEvents: 'auto' } }}>
                <HeatmapControls visible={heatmapOn} onVisibleChange={setHeatmapOn} layer={layer} onLayerChange={setLayer} opacity={opacity} onOpacityChange={setOpacity} />
              </Box>
              <Box sx={{ position: 'absolute', left: 16, bottom: dockHeight + 16 }}>
                <RiskLegend hos={plan.request.hos} />
              </Box>
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: '#FFFFFF',
                  borderTop: `1px solid ${ui.divider}`,
                  boxShadow: '0 -2px 10px rgba(16,24,40,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <ForecastTimeline {...timelineProps} />
                {selected && (
                  <CheckpointTable
                    route={selected}
                    interval={plan.request.interval_mi}
                    active={activeCheckpoint}
                    pinned={pinnedIndex}
                    onHover={setHovered}
                    onPick={pickCheckpoint}
                    open={tableOpen}
                    onToggle={() => setTableOpen(!tableOpen)}
                  />
                )}
              </Box>
            </>
          )}

          {!desktop && plan && !showForm && timelineProps && (
            <>
              <Box sx={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <ButtonBase
                  onClick={() => setFormOpen(true)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.25, height: 52, p: '0 8px 0 16px', borderRadius: '26px', bgcolor: '#FFFFFF', boxShadow: '0 2px 8px rgba(16,24,40,0.18)', textAlign: 'left', justifyContent: 'flex-start' }}
                >
                  <RouteIcon color={ui.textBody} />
                  <Box component="span" sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <Box component="span" sx={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tripLine(plan)}</Box>
                    <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tripMeta(plan)}</Box>
                  </Box>
                  <Box component="span" sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#F1F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ui.primary, flex: 'none' }}>
                    <EditIcon size={16} />
                  </Box>
                </ButtonBase>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={layer}
                    onChange={(_, value: HeatmapLayer | null) => {
                      if (!value) return
                      setLayer(value)
                      setHeatmapOn(true)
                    }}
                    sx={{ bgcolor: '#FFFFFF', borderRadius: '18px', boxShadow: ui.shadow, '& .MuiToggleButton-root': { border: 0, height: 36, px: 1.75 } }}
                  >
                    {(Object.keys(HEATMAP_SCALES) as HeatmapLayer[]).map((key) => (
                      <ToggleButton key={key} value={key}>{key === 'precip' ? 'Precip' : HEATMAP_SCALES[key].label}</ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <ButtonBase
                    role="switch"
                    aria-checked={heatmapOn}
                    aria-label="Weather layer"
                    onClick={() => setHeatmapOn(!heatmapOn)}
                    sx={{ width: 44, height: 36, borderRadius: '18px', bgcolor: '#FFFFFF', boxShadow: ui.shadow, color: heatmapOn ? ui.primary : ui.textMuted }}
                  >
                    <LayersIcon />
                  </ButtonBase>
                </Box>
              </Box>
              <Box sx={{ position: 'absolute', left: 8, right: 8, bottom: 460 }}>
                <ForecastTimeline {...timelineProps} compact />
              </Box>
            </>
          )}
        </RouteMap>
      </Box>

      <Box
        component="section"
        aria-label="Trip planner"
        sx={
          desktop
            ? { position: 'absolute', left: 0, top: 0, bottom: 0, width: PANEL_WIDTH, boxSizing: 'border-box', bgcolor: '#FFFFFF', borderRight: `1px solid ${ui.divider}`, display: 'flex', flexDirection: 'column', zIndex: 20 }
            : {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                ...(showForm || !plan ? { top: plan ? 56 : '38%' } : { height: 452 }),
                bgcolor: '#FFFFFF',
                borderRadius: '16px 16px 0 0',
                boxShadow: '0 -4px 16px rgba(16,24,40,0.16)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 20,
              }
        }
      >
        {desktop ? (
          <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, height: 56, flex: 'none', p: '0 16px 0 20px', borderBottom: '1px solid #E3E6EA' }}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: ui.text, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RouteIcon size={16} strokeWidth={2.2} />
            </Box>
            <Box component="h1" sx={{ m: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.005em' }}>Weather-Aware Truck Routing</Box>
          </Box>
        ) : (
          <>
            <Box sx={{ flex: 'none', display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Box sx={{ width: 32, height: 4, borderRadius: '2px', bgcolor: '#C4C9D0' }} />
            </Box>
            {showForm && (
              <Box sx={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '4px 8px 0 16px', minHeight: 44 }}>
                <Box component="h2" sx={{ m: 0, fontSize: 16, fontWeight: 600 }}>Plan a trip</Box>
                {plan && (
                  <ButtonBase aria-label="Close" onClick={() => setFormOpen(false)} sx={{ width: 44, height: 44, borderRadius: '50%', color: ui.textBody }}>
                    <CloseIcon size={20} />
                  </ButtonBase>
                )}
              </Box>
            )}
          </>
        )}
        {panelBody}
      </Box>
    </Box>
  )
}

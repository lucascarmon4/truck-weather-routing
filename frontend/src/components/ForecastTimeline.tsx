import { Box, IconButton, Slider } from '@mui/material'
import type { Route } from '../api/types'
import { addHours, formatClock, formatDay, formatDayClock, zoneName } from '../domain/format'
import { ui } from '../theme'
import { PauseIcon, PlayIcon, StepBackIcon, StepForwardIcon } from './icons'

type Props = {
  start: string
  departure: string
  hours: number
  route: Route | null
  hour: number
  onHour: (hour: number) => void
  playing: boolean
  onToggle: () => void
  onStep: (delta: 1 | -1) => void
  compact?: boolean
}

type Band = { from: number; to: number; kind: 'drive' | 'break' | 'rest' }

function tripBands(route: Route, offsetH: number): Band[] {
  const bands: Band[] = []
  let cursor = 0
  for (const stop of route.stops) {
    bands.push({ from: cursor, to: stop.start_s, kind: 'drive' }, { from: stop.start_s, to: stop.end_s, kind: stop.kind })
    cursor = stop.end_s
  }
  bands.push({ from: cursor, to: route.trip_s, kind: 'drive' })
  return bands.map((b) => ({ ...b, from: offsetH + b.from / 3600, to: offsetH + b.to / 3600 }))
}

const BAND_STYLE: Record<Band['kind'], string> = {
  drive: '#7FA6DE',
  break: '#8F96A0',
  rest: 'repeating-linear-gradient(135deg,#8F96A0 0 2px,#E4E7EB 2px 4px)',
}

function offsetText(hours: number) {
  const rounded = Math.round(hours * 10) / 10
  if (rounded === 0) return 'Departure'
  return rounded > 0 ? `+${rounded} h after departure` : `${-rounded} h before departure`
}

export function ForecastTimeline({ start, departure, hours, route, hour, onHour, playing, onToggle, onStep, compact = false }: Props) {
  const offsetH = (new Date(departure).getTime() - new Date(start).getTime()) / 3_600_000
  const at = addHours(start, hour)
  const pct = (h: number) => `${(Math.min(hours, Math.max(0, h)) / hours) * 100}%`
  const bands = route ? tripBands(route, offsetH).filter((b) => b.from < hours && b.to > b.from) : []
  const arriveH = route ? offsetH + route.trip_s / 3600 : Infinity
  const ticks = Array.from({ length: Math.floor(hours / 6) + 1 }, (_, i) => i * 6)

  const playButton = (
    <IconButton
      aria-label={playing ? 'Pause' : 'Play forecast'}
      onClick={onToggle}
      sx={{ width: 40, height: 40, flex: 'none', bgcolor: ui.primary, color: '#FFFFFF', '&:hover': { bgcolor: '#1A52A6' } }}
    >
      {playing ? <PauseIcon size={compact ? 16 : 18} /> : <PlayIcon size={compact ? 16 : 18} />}
    </IconButton>
  )

  const track = (
    <Box sx={{ position: 'relative', flex: 1, minWidth: 0, height: compact ? 30 : 46 }}>
      {bands.map((b) => (
        <Box
          key={`${b.kind}-${b.from}`}
          sx={{ position: 'absolute', top: 4, left: pct(b.from), width: `calc(${pct(b.to)} - ${pct(b.from)})`, height: compact ? 3 : 4, borderRadius: '2px', background: BAND_STYLE[b.kind] }}
        />
      ))}
      {!compact && route && arriveH <= hours && (
        <>
          <Box sx={{ position: 'absolute', top: 0, left: pct(arriveH), width: 2, height: 12, ml: '-1px', bgcolor: ui.text }} />
          <Box sx={{ position: 'absolute', top: -2, left: pct(arriveH), ml: 0.5, fontSize: 10, lineHeight: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Arrive
          </Box>
        </>
      )}
      <Slider
        aria-label={`Forecast hour, 0 to ${hours} hours`}
        min={0}
        max={hours}
        step={0.25}
        value={hour}
        onChange={(_, value) => onHour(value as number)}
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: compact ? 4 : 6,
          p: '11px 0 !important',
          height: 4,
          '& .MuiSlider-rail': { bgcolor: ui.track, opacity: 1 },
          '& .MuiSlider-track': { border: 0, transition: 'none' },
          '& .MuiSlider-thumb': { width: 18, height: 18, border: '2px solid #FFFFFF', boxShadow: '0 1px 4px rgba(16,24,40,0.35)', transition: 'none' },
        }}
      />
      {!compact &&
        ticks.map((t) => {
          const tickAt = addHours(start, t)
          const midnight = formatClock(tickAt) === '00:00'
          const strong = midnight || t === 0
          return (
            <Box key={t}>
              <Box sx={{ position: 'absolute', top: 24, left: pct(t), width: '1px', height: 5, bgcolor: '#B9C0C9' }} />
              <Box
                sx={{
                  position: 'absolute',
                  top: 30,
                  left: pct(t),
                  transform: t === 0 ? 'none' : t === hours ? 'translateX(-100%)' : 'translateX(-50%)',
                  fontSize: 11,
                  lineHeight: '14px',
                  whiteSpace: 'nowrap',
                  color: strong ? ui.text : ui.textSecondary,
                  fontWeight: strong ? 600 : 400,
                }}
              >
                {t === 0 ? formatDayClock(tickAt) : midnight ? formatDay(tickAt).replace(/^(\w+) \w+ /, '$1 ') : formatClock(tickAt)}
              </Box>
            </Box>
          )
        })}
    </Box>
  )

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, height: 56, p: '0 14px 0 8px', boxSizing: 'border-box', borderRadius: 3, bgcolor: '#FFFFFF', boxShadow: '0 2px 8px rgba(16,24,40,0.16)' }}>
        {playButton}
        <Box sx={{ width: 92, flex: 'none', display: 'flex', flexDirection: 'column' }}>
          <Box component="span" sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDayClock(at)}</Box>
          <Box component="span" sx={{ fontSize: 11, color: ui.textSecondary, whiteSpace: 'nowrap' }}>{offsetText(hour - offsetH)}</Box>
        </Box>
        {track}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: 64, p: '0 20px 0 12px', boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton aria-label="Previous hour" onClick={() => onStep(-1)} sx={{ color: ui.textBody }}>
          <StepBackIcon />
        </IconButton>
        {playButton}
        <IconButton aria-label="Next hour" onClick={() => onStep(1)} sx={{ color: ui.textBody }}>
          <StepForwardIcon />
        </IconButton>
      </Box>
      <Box sx={{ width: 168, flex: 'none', display: 'flex', flexDirection: 'column' }}>
        <Box component="span" sx={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {formatDay(at)} · {formatClock(at)} {zoneName(at)}
        </Box>
        <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary, whiteSpace: 'nowrap' }}>{offsetText(hour - offsetH)}</Box>
      </Box>
      {track}
    </Box>
  )
}

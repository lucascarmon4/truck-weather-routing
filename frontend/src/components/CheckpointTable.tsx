import { Box, Button, ButtonBase } from '@mui/material'
import { useEffect, useRef } from 'react'
import type { Route } from '../api/types'
import { driversText } from '../domain/checkpoint'
import { formatDayClock, formatInt, zoneName } from '../domain/format'
import { worstCheckpoint } from '../domain/geometry'
import { LEVEL_COLOR, LEVEL_KEY, LEVEL_LABEL, LEVEL_TINT } from '../domain/risk'
import { ui } from '../theme'
import { ChevronIcon } from './icons'
import { RiskChip } from './RiskChip'

const ROW_HEIGHT = 30
const columns = '52px 64px minmax(120px, 1.3fr) minmax(104px, 1.1fr) minmax(72px, 0.8fr) minmax(72px, 0.8fr) minmax(56px, 0.6fr) 120px'
const rowSx = { display: 'grid', gridTemplateColumns: columns, alignItems: 'center', height: ROW_HEIGHT, p: '0 20px 0 8px', fontSize: 12 } as const
const unit = { fontWeight: 400, color: ui.textMuted } as const

type Props = {
  route: Route
  interval: number
  active: number | null
  pinned: number | null
  onHover: (index: number | null) => void
  onPick: (index: number) => void
  open: boolean
  onToggle: () => void
}

function precip(value: number) {
  return value ? value.toFixed(2) : '–'
}

export function CheckpointTable({ route, interval, active, pinned, onHover, onPick, open, onToggle }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const worst = worstCheckpoint(route)

  useEffect(() => {
    if (scroller.current && pinned != null) scroller.current.scrollTop = Math.max(0, (pinned - 2) * ROW_HEIGHT)
  }, [pinned, route, open])

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 42, p: '0 8px 0 20px', borderTop: `1px solid ${ui.dividerLight}` }}>
        <Box component="span" sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Checkpoints</Box>
        <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary, whiteSpace: 'nowrap' }}>
          {route.id} · {route.checkpoints.length} points every {interval} mi
        </Box>
        <Box component="span" sx={{ width: '1px', height: 16, bgcolor: '#E3E6EA' }} />
        <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>Worst</Box>
        <RiskChip level={worst.level} />
        <Box component="span" sx={{ fontSize: 12, color: ui.textBody, whiteSpace: 'nowrap' }}>
          at mile {formatInt(worst.mile)}
          {worst.drivers.length > 0 && ` (${driversText(worst).toLowerCase()})`}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, ml: 0.5, fontSize: 12, color: ui.textBody, whiteSpace: 'nowrap', overflow: 'hidden' }}>
          {([1, 2, 3, 4] as const)
            .filter((level) => route.miles_by_level[LEVEL_KEY[level]] > 0)
            .map((level) => (
              <Box component="span" key={level} sx={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: LEVEL_COLOR[level] }} />
                {formatInt(route.miles_by_level[LEVEL_KEY[level]])} mi {LEVEL_LABEL[level]}
              </Box>
            ))}
        </Box>
        <Button
          onClick={onToggle}
          aria-expanded={open}
          endIcon={<ChevronIcon style={{ transform: open ? 'none' : 'rotate(180deg)' }} />}
          sx={{ ml: 'auto', height: 32, fontWeight: 500, whiteSpace: 'nowrap', flex: 'none' }}
        >
          {open ? 'Collapse' : 'Show table'}
        </Button>
      </Box>

      {open && (
        <Box ref={scroller} sx={{ height: 224, overflow: 'auto', borderTop: `1px solid ${ui.dividerLight}` }} onMouseLeave={() => onHover(null)}>
          <Box
            sx={{ ...rowSx, position: 'sticky', top: 0, zIndex: 1, bgcolor: ui.surface, borderBottom: '1px solid #E3E6EA', fontWeight: 600, color: ui.textLabel }}
          >
            <Box component="span" sx={{ pl: 1.5 }}>#</Box>
            <Box component="span" sx={{ textAlign: 'right' }}>Mile</Box>
            <Box component="span" sx={{ pl: 2.5 }}>ETA ({zoneName(route.arrival)})</Box>
            <Box component="span" sx={{ textAlign: 'right' }}>Wind (gust) <Box component="span" sx={unit}>mph</Box></Box>
            <Box component="span" sx={{ textAlign: 'right' }}>Rain <Box component="span" sx={unit}>in/hr</Box></Box>
            <Box component="span" sx={{ textAlign: 'right' }}>Snow <Box component="span" sx={unit}>in/hr</Box></Box>
            <Box component="span" sx={{ textAlign: 'right' }}>Temp</Box>
            <Box component="span" sx={{ pl: 2.5 }}>Level</Box>
          </Box>
          {route.checkpoints.map((cp) => {
            const on = cp.index === active
            const { weather } = cp
            return (
              <Box
                key={cp.index}
                onMouseEnter={() => onHover(cp.index)}
                sx={{
                  ...rowSx,
                  borderBottom: '1px solid rgba(26,31,38,0.06)',
                  bgcolor: on ? '#DCE8F8' : cp.level === 0 ? '#FFFFFF' : LEVEL_TINT[cp.level],
                  boxShadow: on ? `inset 3px 0 0 ${ui.primary}` : 'none',
                }}
              >
                <ButtonBase
                  onClick={() => onPick(cp.index)}
                  onFocus={() => onHover(cp.index)}
                  onBlur={() => onHover(null)}
                  aria-label={`Show checkpoint ${cp.index} on the map`}
                  sx={{ justifySelf: 'start', height: 24, minWidth: 32, px: 1.5, fontSize: 12, color: ui.textLabel, justifyContent: 'flex-start' }}
                >
                  {cp.index}
                </ButtonBase>
                <Box component="span" sx={{ textAlign: 'right' }}>{formatInt(cp.mile)}</Box>
                <Box component="span" sx={{ pl: 2.5, whiteSpace: 'nowrap' }}>{formatDayClock(cp.eta)}</Box>
                <Box component="span" sx={{ textAlign: 'right' }}>
                  {Math.round(weather.wind_mph)} {weather.gust_mph != null && <Box component="span" sx={{ color: ui.textMuted }}>({Math.round(weather.gust_mph)})</Box>}
                </Box>
                <Box component="span" sx={{ textAlign: 'right', color: weather.rain_in_hr ? ui.text : ui.textMuted }}>{precip(weather.rain_in_hr)}</Box>
                <Box component="span" sx={{ textAlign: 'right', color: weather.snow_in_hr ? ui.text : ui.textMuted }}>{precip(weather.snow_in_hr)}</Box>
                <Box component="span" sx={{ textAlign: 'right' }}>{weather.temperature_f != null ? `${Math.round(weather.temperature_f)}°F` : '–'}</Box>
                <Box component="span" sx={{ pl: 2.5 }}><RiskChip level={cp.level} small /></Box>
              </Box>
            )
          })}
        </Box>
      )}
    </>
  )
}

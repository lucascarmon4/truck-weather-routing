import { Box, ButtonBase, Tooltip } from '@mui/material'
import type { ReactNode } from 'react'
import type { Route } from '../api/types'
import { formatDayClock, formatDuration, formatInt, formatMiles, routeLetter } from '../domain/format'
import { LEVEL_COLOR, LEVEL_KEY, LEVEL_LABEL, LEVELS } from '../domain/risk'
import { ui } from '../theme'
import { RiskChip } from './RiskChip'

function RiskBar({ route }: { route: Route }) {
  const shown = LEVELS.filter((level) => route.miles_by_level[LEVEL_KEY[level]] > 0)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ flex: 1, display: 'flex', gap: '1px', height: 10 }} aria-label="Miles by risk level">
          {shown.map((level, i) => {
            const miles = route.miles_by_level[LEVEL_KEY[level]]
            const pct = (miles / route.distance_mi) * 100
            return (
              <Tooltip
                key={level}
                placement="top"
                title={`${LEVEL_LABEL[level]} · ${formatInt(miles)} mi (${pct < 1 ? '<1' : Math.round(pct)}%)`}
              >
                <Box
                  sx={{
                    width: `${pct}%`,
                    minWidth: 3,
                    height: 10,
                    bgcolor: LEVEL_COLOR[level],
                    borderTopLeftRadius: i === 0 ? 5 : 0,
                    borderBottomLeftRadius: i === 0 ? 5 : 0,
                    borderTopRightRadius: i === shown.length - 1 ? 5 : 0,
                    borderBottomRightRadius: i === shown.length - 1 ? 5 : 0,
                    '&:hover': { boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 3.5px #1A1F26', position: 'relative', zIndex: 1 },
                  }}
                />
              </Tooltip>
            )
          })}
        </Box>
        <Box component="span" sx={{ fontSize: 12, color: ui.textLabel, whiteSpace: 'nowrap' }}>
          Avg risk <Box component="b" sx={{ fontWeight: 600, color: ui.text }}>{route.avg_risk.toFixed(2)}</Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 11, color: ui.textLabel }}>
        {shown.map((level) => (
          <Box key={level} component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, whiteSpace: 'nowrap' }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: LEVEL_COLOR[level] }} />
            {formatInt(route.miles_by_level[LEVEL_KEY[level]])} {LEVEL_LABEL[level]} mi
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box component="span" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Box component="span" sx={{ fontSize: 11, color: ui.textSecondary }}>{label}</Box>
      <Box component="span" sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</Box>
    </Box>
  )
}

type Props = { route: Route; selected: boolean; hos: boolean; onSelect: () => void }

export function RouteCard({ route, selected, hos, onSelect }: Props) {
  return (
    <ButtonBase
      component="div"
      role="button"
      aria-pressed={selected}
      onClick={onSelect}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1.5,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 2,
        textAlign: 'left',
        ...(selected
          ? { border: `2px solid ${ui.primary}`, bgcolor: '#F7FAFE', p: '11px 13px' }
          : { border: `1px solid ${ui.divider}`, bgcolor: '#FFFFFF', p: '12px 14px', '&:hover': { borderColor: '#B9C0C9' } }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            flex: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            ...(selected ? { bgcolor: ui.primary, color: '#FFFFFF' } : { bgcolor: '#EEF0F3', color: ui.textBody }),
          }}
        >
          {routeLetter(route.id)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ fontSize: 14, fontWeight: 600 }}>{route.id}</Box>
            {route.recommended && (
              <Box component="span" sx={{ height: 20, px: '7px', borderRadius: 10, bgcolor: ui.primary, color: '#FFFFFF', fontSize: 11, fontWeight: 600, lineHeight: '20px' }}>
                Recommended
              </Box>
            )}
          </Box>
          <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {route.name}
          </Box>
        </Box>
        <RiskChip level={route.max_level} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
        <Stat label="Distance">{formatMiles(route.distance_mi)}</Stat>
        <Stat label="Drive">{formatDuration(route.drive_s)}</Stat>
        <Stat label={hos ? 'Trip with rest' : 'Trip'}>{formatDuration(route.trip_s)}</Stat>
        <Stat label="Arrives">{formatDayClock(route.arrival)}</Stat>
      </Box>
      <RiskBar route={route} />
    </ButtonBase>
  )
}

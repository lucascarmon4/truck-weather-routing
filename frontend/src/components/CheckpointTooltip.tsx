import { Box } from '@mui/material'
import type { Checkpoint } from '../api/types'
import { driversText, precipText } from '../domain/checkpoint'
import { formatDayClock, zoneName } from '../domain/format'
import { ui } from '../theme'
import { ClockIcon } from './icons'
import { RiskChip } from './RiskChip'

export function CheckpointTooltip({ checkpoint }: { checkpoint: Checkpoint }) {
  const { weather } = checkpoint
  const rows: [string, string, boolean][] = [
    ['Wind', `${Math.round(weather.wind_mph)} mph${weather.gust_mph != null ? ` · gusts ${Math.round(weather.gust_mph)} mph` : ''}`, true],
    ['Rain', precipText(weather.rain_in_hr), weather.rain_in_hr > 0],
    ['Snow', precipText(weather.snow_in_hr), weather.snow_in_hr > 0],
    ['Temp', weather.temperature_f != null ? `${Math.round(weather.temperature_f)}°F` : '–', true],
  ]
  return (
    <Box sx={{ width: 252, boxSizing: 'border-box', p: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 1, fontFamily: 'inherit', color: ui.text }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Box component="span" sx={{ fontSize: 13, fontWeight: 600 }}>Checkpoint {checkpoint.index}</Box>
          <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>Mile {Math.round(checkpoint.mile)}</Box>
        </Box>
        <RiskChip level={checkpoint.level} />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: ui.textBody }}>
        <ClockIcon size={14} />
        <span>ETA {formatDayClock(checkpoint.eta)} {zoneName(checkpoint.eta)}</span>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '64px minmax(0, 1fr)',
          rowGap: '3px',
          columnGap: 1,
          fontSize: 12,
          py: 1,
          borderTop: `1px solid ${ui.dividerLight}`,
          borderBottom: `1px solid ${ui.dividerLight}`,
        }}
      >
        {rows.map(([label, value, strong]) => (
          <Box key={label} sx={{ display: 'contents' }}>
            <Box component="span" sx={{ color: ui.textSecondary }}>{label}</Box>
            <Box component="span" sx={{ color: strong ? ui.text : ui.textMuted }}>{value}</Box>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr)', columnGap: 1, rowGap: 0.5, fontSize: 12 }}>
        <Box component="span" sx={{ color: ui.textSecondary }}>Driven by</Box>
        <Box component="span" sx={{ fontWeight: 600 }}>{driversText(checkpoint)}</Box>
        {checkpoint.load_rule && (
          <>
            <Box component="span" sx={{ color: ui.textSecondary }}>Load rule</Box>
            <span>{checkpoint.load_rule}</span>
          </>
        )}
      </Box>
    </Box>
  )
}

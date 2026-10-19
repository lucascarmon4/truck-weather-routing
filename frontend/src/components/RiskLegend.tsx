import { Box } from '@mui/material'
import { LEVEL_COLOR, LEVEL_LABEL, LEVELS } from '../domain/risk'
import { ui } from '../theme'

const item = { display: 'flex', alignItems: 'center', gap: '5px' } as const

export function RiskLegend({ hos }: { hos: boolean }) {
  return (
    <Box sx={{ p: '8px 12px', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.96)', boxShadow: ui.shadow, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 12, flexWrap: 'wrap' }}>
        <Box component="span" sx={{ fontWeight: 600, color: ui.textBody }}>Risk</Box>
        {LEVELS.map((level) => (
          <Box component="span" key={level} sx={item}>
            <Box component="span" sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: LEVEL_COLOR[level] }} />
            {LEVEL_LABEL[level]}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, fontSize: 11, color: ui.textSecondary, flexWrap: 'wrap' }}>
        <Box component="span" sx={item}>
          <Box
            component="span"
            sx={{
              width: 22,
              height: 5,
              borderRadius: '3px',
              background: `linear-gradient(90deg, ${LEVEL_COLOR[0]} 0 30%, ${LEVEL_COLOR[1]} 30% 60%, ${LEVEL_COLOR[2]} 60% 100%)`,
              boxShadow: '0 0 0 1.5px #fff, 0 0 0 2.5px rgba(26,31,38,0.4)',
            }}
          />
          Selected route
        </Box>
        <Box component="span" sx={item}>
          <Box component="span" sx={{ width: 22, height: 4, borderRadius: '2px', bgcolor: ui.routeMuted }} />
          Other routes
        </Box>
        <Box component="span" sx={item}>
          <Box component="span" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: ui.text }} />
          Truck at selected hour
        </Box>
        {hos && (
          <Box component="span" sx={item}>
            <Box component="span" sx={{ width: 14, height: 8, borderRadius: '2px', background: 'repeating-linear-gradient(135deg, #8F96A0 0 2px, #E4E7EB 2px 4px)' }} />
            10 h rest
          </Box>
        )}
      </Box>
    </Box>
  )
}

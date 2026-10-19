import { Box } from '@mui/material'
import type { Level } from '../api/types'
import { LEVEL_COLOR, LEVEL_INK, LEVEL_LABEL, LEVEL_TINT } from '../domain/risk'

export function RiskChip({ level, small = false }: { level: Level; small?: boolean }) {
  const solid = level === 4
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: small ? '5px' : '6px',
        height: small ? 20 : 22,
        px: small ? '7px' : 1,
        flex: 'none',
        borderRadius: 11,
        border: '1px solid',
        boxSizing: 'border-box',
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        bgcolor: solid ? LEVEL_COLOR[4] : LEVEL_TINT[level],
        color: solid ? '#FFFFFF' : LEVEL_INK[level],
        borderColor: solid ? LEVEL_COLOR[4] : `${LEVEL_COLOR[level]}66`,
      }}
    >
      <Box
        component="span"
        sx={{ width: small ? 6 : 7, height: small ? 6 : 7, borderRadius: '50%', bgcolor: solid ? '#FFFFFF' : LEVEL_COLOR[level] }}
      />
      {LEVEL_LABEL[level]}
    </Box>
  )
}

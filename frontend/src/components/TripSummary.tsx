import { Box, Button } from '@mui/material'
import type { PlanResponse } from '../api/types'
import { tripLine, tripMeta } from '../domain/trip'
import { ui } from '../theme'
import { EditIcon } from './icons'

export function TripSummary({ plan, onEdit }: { plan: PlanResponse; onEdit: () => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px 8px 12px 14px', border: `1px solid ${ui.divider}`, borderRadius: 2 }}>
      <Box aria-hidden="true" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 'none' }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', border: '2.5px solid #1A1F26', boxSizing: 'border-box' }} />
        <Box sx={{ width: 2, height: 14, background: 'repeating-linear-gradient(180deg, #8F96A0 0 2px, transparent 2px 4px)' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ui.text }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <Box component="span" sx={{ fontSize: 14, fontWeight: 600 }}>{tripLine(plan)}</Box>
        <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>{tripMeta(plan)}</Box>
      </Box>
      <Button onClick={onEdit} startIcon={<EditIcon size={15} />} sx={{ height: 32, fontWeight: 500, flex: 'none' }}>
        Edit
      </Button>
    </Box>
  )
}

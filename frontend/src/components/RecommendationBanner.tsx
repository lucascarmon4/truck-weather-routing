import { Box } from '@mui/material'
import { Fragment } from 'react'
import type { PlanResponse } from '../api/types'
import { formatDayClock, formatDuration, routeLetter, zoneName } from '../domain/format'
import { ui } from '../theme'
import { CheckCircleIcon, StopIcon } from './icons'

export function RecommendationBanner({ plan }: { plan: PlanResponse }) {
  const { recommendation } = plan
  const route = plan.routes.find((r) => r.id === recommendation.route_id)!
  const title = recommendation.warning ? `${route.id} has the least exposure` : `${route.id} recommended`
  return (
    <Box
      component="section"
      aria-label="Recommendation"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, p: '14px 16px', borderRadius: 2, border: `1px solid ${ui.primaryBorder}`, bgcolor: '#F3F7FD' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <CheckCircleIcon size={22} color={ui.primary} style={{ marginTop: 1 }} />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box component="h2" sx={{ m: 0, fontSize: 16, fontWeight: 600, lineHeight: '22px' }}>{title}</Box>
          <Box component="p" sx={{ m: 0, fontSize: 13, color: '#2E3640' }}>{recommendation.summary}</Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px', pl: 4, fontSize: 12, color: ui.textLabel }}>
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          Ranking
          {recommendation.ranking.map((id, i) => (
            <Fragment key={id}>
              {i > 0 && <Box component="span" sx={{ color: ui.routeMuted }}>›</Box>}
              <Box component="b" sx={{ fontWeight: 600, color: ui.text }}>{routeLetter(id)}</Box>
            </Fragment>
          ))}
        </Box>
        <span>
          Arrives {formatDayClock(route.arrival)} {zoneName(route.arrival)} · {formatDuration(route.trip_s)} total
        </span>
      </Box>
      {recommendation.warning && (
        <Box role="alert" sx={{ display: 'flex', gap: 1.25, p: '10px 12px', borderRadius: 1.5, bgcolor: '#3E1A5C', color: '#FFFFFF' }}>
          <StopIcon size={20} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Box component="span" sx={{ fontSize: 13, fontWeight: 600 }}>No route avoids No Travel conditions</Box>
            <Box component="span" sx={{ fontSize: 12, lineHeight: '17px', color: '#EADFF3' }}>{recommendation.warning}</Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

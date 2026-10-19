import { Box, ButtonBase, Collapse } from '@mui/material'
import { useState } from 'react'
import type { RiskBand, Rules } from '../api/types'
import { LEVEL_COLOR, LEVEL_LABEL } from '../domain/risk'
import { ui } from '../theme'
import { ChevronIcon, InfoIcon, WeightIcon } from './icons'

const CRITERIA_TEXT: Record<string, string> = {
  'No Travel miles': 'Fewest No Travel miles',
  'Severe miles': 'Fewest Severe miles',
  'High miles': 'Fewest High miles',
  'average risk': 'Lowest average risk',
  'travel time': 'Shortest travel time',
}

function threshold(band: RiskBand, value: number, i: number) {
  const text = band.unit === 'mph' ? String(value) : value.toFixed(2)
  return i === 3 && !band.no_travel_inclusive ? `> ${text}` : text
}

const grid = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) repeat(4, minmax(0, 1fr))', alignItems: 'center', height: 30, px: 1.25 }

export function RulesPanel({ rules, criteria }: { rules: Rules; criteria: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Box sx={{ border: `1px solid ${ui.divider}`, borderRadius: 2 }}>
      <ButtonBase
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', height: 48, pl: 1.75, pr: 1.5, fontSize: 13, fontWeight: 600, justifyContent: 'flex-start', borderRadius: 2 }}
      >
        <InfoIcon color={ui.textSecondary} />
        <Box component="span" sx={{ flex: 1, textAlign: 'left' }}>How the recommendation works</Box>
        <ChevronIcon color={ui.textSecondary} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </ButtonBase>
      <Collapse in={open}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, p: '2px 14px 16px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box component="span" sx={{ fontSize: 12, color: ui.textLabel }}>Routes are compared in this order. The first difference decides.</Box>
            <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {criteria.map((c, i) => (
                <Box component="li" key={c} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13 }}>
                  <Box component="span" sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: '#EEF0F3', fontSize: 11, fontWeight: 600, lineHeight: '18px', textAlign: 'center', color: ui.textBody }}>
                    {i + 1}
                  </Box>
                  {CRITERIA_TEXT[c] ?? c}
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box component="span" sx={{ fontSize: 12, color: ui.textLabel }}>A level starts at these values. Below Moderate is Low.</Box>
            <Box sx={{ border: '1px solid #E3E6EA', borderRadius: 1.5, overflow: 'hidden', fontSize: 12 }}>
              <Box sx={{ ...grid, bgcolor: ui.surface, fontWeight: 600, color: ui.textLabel }}>
                <span>Factor</span>
                {rules.levels.slice(1).map((level) => (
                  <Box component="span" key={level.value} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, whiteSpace: 'nowrap' }}>
                    <Box component="span" sx={{ width: 7, height: 7, borderRadius: '2px', bgcolor: LEVEL_COLOR[level.value] }} />
                    {LEVEL_LABEL[level.value]}
                  </Box>
                ))}
              </Box>
              {rules.bands.map((band) => (
                <Box key={band.factor} sx={{ ...grid, borderTop: `1px solid ${ui.dividerLight}` }}>
                  <span>
                    {band.factor[0].toUpperCase() + band.factor.slice(1)} <Box component="span" sx={{ color: ui.textMuted }}>{band.unit}</Box>
                  </span>
                  {band.thresholds.map((value, i) => (
                    <Box component="span" key={i} sx={{ textAlign: 'right' }}>{threshold(band, value, i)}</Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box component="span" sx={{ fontSize: 12, color: ui.textLabel }}>Load rules (wind only)</Box>
            {rules.load_rules.map((rule) => (
              <Box component="span" key={rule} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13 }}>
                <WeightIcon size={16} color={ui.textSecondary} />
                {rule}
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}

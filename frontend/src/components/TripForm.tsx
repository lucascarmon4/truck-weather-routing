import { Box, Button, ButtonBase, IconButton, Switch, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material'
import type { FormEvent } from 'react'
import type { SampleInterval } from '../api/types'
import { MAX_LOAD_LB, PRESETS, parseLoad, type TripFormValue } from '../domain/trip'
import { formatInt, zoneName } from '../domain/format'
import { ui } from '../theme'
import { DestinationPin, InfoIcon, RouteIcon, SwapIcon, WarningIcon } from './icons'
import { PlaceAutocomplete } from './PlaceAutocomplete'

function loadHint(load: number | null) {
  if (load == null) return null
  if (load > MAX_LOAD_LB) return { tone: 'error', text: 'Load must be between 0 and 80,000 lb.' } as const
  if (load > 40_000) return { tone: 'warn', text: 'Over 40,000 lb: wind of 35–44 mph is rated Severe, and 45–54 mph is No Travel.' } as const
  if (load > 30_000) return { tone: 'warn', text: 'Over 30,000 lb: wind of 45–54 mph is rated No Travel.' } as const
  return { tone: 'info', text: 'Standard wind thresholds apply at this weight.' } as const
}

const HINT_STYLE = {
  error: { bg: '#FDECEA', ink: '#8A1C14', icon: '#C62828' },
  warn: { bg: '#FFF4E5', ink: '#663C00', icon: '#E07B00' },
  info: { bg: '#F1F4F8', ink: ui.textLabel, icon: ui.textLabel },
}

function OriginRing() {
  return <Box sx={{ width: 12, height: 12, borderRadius: '50%', border: '3px solid #1A1F26', boxSizing: 'border-box' }} />
}

type Props = {
  value: TripFormValue
  onChange: (patch: Partial<TripFormValue>) => void
  onSubmit: () => void
  locked: boolean
  onCollapse?: () => void
  showHeader?: boolean
}

export function TripForm({ value, onChange, onSubmit, locked, onCollapse, showHeader = true }: Props) {
  const load = parseLoad(value.load)
  const hint = loadHint(load)
  const canPlan =
    !locked && value.origin.label.trim() !== '' && value.destination.label.trim() !== '' && load != null && load <= MAX_LOAD_LB && value.departure !== ''

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (canPlan) onSubmit()
  }

  return (
    <Box component="form" aria-label="Trip" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      {showHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: -0.5 }}>
          <Box component="h2" sx={{ m: 0, fontSize: 14, fontWeight: 600 }}>Trip</Box>
          {onCollapse && (
            <Button size="small" onClick={onCollapse} sx={{ fontWeight: 500, fontSize: 13 }}>
              Collapse
            </Button>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PlaceAutocomplete id="origin" label="Origin" value={value.origin} onChange={(origin) => onChange({ origin })} disabled={locked} icon={<OriginRing />} />
          <PlaceAutocomplete
            id="destination"
            label="Destination"
            value={value.destination}
            onChange={(destination) => onChange({ destination })}
            disabled={locked}
            icon={<DestinationPin size={14} />}
          />
        </Box>
        <IconButton
          aria-label="Swap origin and destination"
          disabled={locked}
          onClick={() => onChange({ origin: value.destination, destination: value.origin })}
          sx={{ color: ui.textBody }}
        >
          <SwapIcon size={20} />
        </IconButton>
      </Box>

      <TextField
        label="Departure"
        type="datetime-local"
        size="small"
        value={value.departure}
        onChange={(event) => onChange({ departure: event.target.value })}
        disabled={locked}
        helperText={`Your local time (${zoneName()}) · defaults to the next full hour`}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TextField
          label="Load weight"
          size="small"
          placeholder="0–80,000"
          value={load == null ? '' : formatInt(load)}
          onChange={(event) => onChange({ load: event.target.value.replace(/[^0-9]/g, '') })}
          disabled={locked}
          error={hint?.tone === 'error'}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { inputMode: 'numeric' },
            input: { endAdornment: <Box component="span" sx={{ color: ui.textSecondary, fontSize: 14 }}>lb</Box> },
          }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0.75 }} role="group" aria-label="Load presets">
          {PRESETS.map(([name, lb]) => {
            const on = load === lb
            return (
              <ButtonBase
                key={name}
                aria-pressed={on}
                disabled={locked}
                onClick={() => onChange({ load: String(lb) })}
                sx={{
                  height: 44,
                  flexDirection: 'column',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: on ? '#7FA6DE' : ui.control,
                  bgcolor: on ? ui.primaryTint : '#FFFFFF',
                  color: on ? ui.primaryInk : ui.textBody,
                }}
              >
                <Box component="span" sx={{ fontSize: 12, fontWeight: 600, lineHeight: '16px' }}>{name}</Box>
                <Box component="span" sx={{ fontSize: 11, lineHeight: '14px', opacity: 0.85 }}>{formatInt(lb)} lb</Box>
              </ButtonBase>
            )
          })}
        </Box>
        {hint && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              p: '8px 10px',
              borderRadius: 1,
              bgcolor: HINT_STYLE[hint.tone].bg,
              color: HINT_STYLE[hint.tone].ink,
              fontSize: 12,
              lineHeight: '16px',
            }}
          >
            {hint.tone === 'info' ? <InfoIcon size={16} /> : <WarningIcon size={16} color={HINT_STYLE[hint.tone].icon} />}
            <span>{hint.text}</span>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box component="span" id="spacing-label" sx={{ fontSize: 13, color: ui.textBody }}>Checkpoint every</Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          aria-labelledby="spacing-label"
          value={value.interval}
          disabled={locked}
          onChange={(_, interval: SampleInterval | null) => interval && onChange({ interval })}
        >
          {([10, 25, 50] as SampleInterval[]).map((mi) => (
            <ToggleButton key={mi} value={mi} sx={{ width: 64, height: 36 }}>
              {mi} mi
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: locked ? 'default' : 'pointer' }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box component="span" sx={{ fontSize: 13, fontWeight: 500 }}>Include rest breaks</Box>
          <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>30 min after 8 h, 10 h off after 11 h of driving</Box>
        </Box>
        <Switch checked={value.hos} disabled={locked} onChange={(event) => onChange({ hos: event.target.checked })} />
      </Box>

      <Button
        type="submit"
        variant="contained"
        disabled={!canPlan}
        startIcon={<RouteIcon />}
        sx={{ height: 44, fontSize: 14, letterSpacing: '0.01em' }}
      >
        {locked ? 'Planning…' : 'Plan routes'}
      </Button>
    </Box>
  )
}

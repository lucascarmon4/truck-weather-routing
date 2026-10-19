import { Autocomplete, Box, LinearProgress, TextField } from '@mui/material'
import { useEffect, useState, type ReactNode } from 'react'
import { searchPlaces } from '../api/client'
import type { Place, PlaceInput } from '../api/types'
import { ui } from '../theme'
import { PinIcon } from './icons'

const DEBOUNCE_MS = 250
const MIN_CHARS = 2

type Props = {
  id: string
  label: string
  value: PlaceInput
  onChange: (value: PlaceInput) => void
  disabled?: boolean
  icon: ReactNode
}

type Search = { query: string; results: Place[] }

function splitLabel(label: string) {
  const i = label.indexOf(',')
  return i < 0 ? [label, ''] : [label.slice(0, i), label.slice(i + 1).trim()]
}

export function PlaceAutocomplete({ id, label, value, onChange, disabled, icon }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState<Search>({ query: '', results: [] })
  const query = value.label.trim()
  const resolved = value.lat != null
  const active = open && !resolved && query.length >= MIN_CHARS
  const loading = active && search.query !== query

  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchPlaces(query, controller.signal)
        .then((results) => setSearch({ query, results }))
        .catch(() => {
          if (!controller.signal.aborted) setSearch({ query, results: [] })
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [active, query])

  const options = active && search.query === query ? search.results : []
  const empty = active && !loading && options.length === 0

  return (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete<Place, false, false, true>
        id={id}
        freeSolo
        disabled={disabled}
        open={open && options.length > 0}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={options}
        filterOptions={(x) => x}
        getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
        inputValue={value.label}
        value={resolved ? (value as Place) : null}
        onInputChange={(_, text, reason) => {
          if (reason === 'input') {
            setOpen(true)
            onChange({ label: text })
          }
        }}
        onChange={(_, option) => {
          if (option && typeof option !== 'string') onChange(option)
        }}
        renderOption={({ key, ...props }, option) => {
          const [main, rest] = splitLabel(option.label)
          return (
            <Box component="li" key={key} {...props} sx={{ gap: 1.5, minHeight: 48, py: 0.75, px: 1.75 }}>
              <PinIcon color={ui.textMuted} />
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box component="span" sx={{ fontSize: 14, fontWeight: 600 }}>{main}</Box>
                <Box component="span" sx={{ fontSize: 12, color: ui.textSecondary }}>{rest}</Box>
              </Box>
            </Box>
          )
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            placeholder="City or address"
            slotProps={{
              ...params.slotProps,
              inputLabel: { ...params.slotProps.inputLabel, shrink: true },
              input: {
                ...params.slotProps.input,
                startAdornment: <Box sx={{ display: 'flex', ml: 0.25, mr: 0.5 }}>{icon}</Box>,
              },
            }}
          />
        )}
      />
      {loading && (
        <LinearProgress sx={{ position: 'absolute', left: 1, right: 1, bottom: 1, height: 2, borderRadius: '0 0 4px 4px' }} />
      )}
      {empty && (
        <Box sx={{ pl: 1.75, pt: 0.5, fontSize: 12, color: ui.textSecondary }}>No places found for ‘{query}’</Box>
      )}
    </Box>
  )
}

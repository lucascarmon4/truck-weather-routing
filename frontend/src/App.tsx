import { Alert, Box, Button, Divider, LinearProgress, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState, type FormEvent } from 'react'
import type { SampleInterval } from './api/types'
import { formatDateTime, formatDuration, formatMiles, nextFullHour, toLocalInputValue } from './domain/format'
import type { HeatmapLayer } from './domain/heatmap'
import { LEVEL_LABEL } from './domain/risk'
import { usePlan } from './hooks/usePlan'
import { useTimeline } from './hooks/useTimeline'
import { RouteMap } from './map/RouteMap'

export default function App() {
  const { state, run } = usePlan()
  const [origin, setOrigin] = useState('Chicago, IL')
  const [destination, setDestination] = useState('Denver, CO')
  const [departure, setDeparture] = useState(toLocalInputValue(nextFullHour()))
  const [load, setLoad] = useState(42000)
  const [interval, setInterval] = useState<SampleInterval>(25)
  const [layer, setLayer] = useState<HeatmapLayer>('risk')
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const plan = state.status === 'success' ? state.data : undefined
  const timeline = useTimeline(plan?.heatmap.hours ?? 48)
  const { reset } = timeline

  useEffect(() => {
    setSelectedRouteId(plan?.recommendation.route_id ?? null)
    setHighlighted(null)
    reset()
  }, [plan, reset])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    run({
      origin: { label: origin },
      destination: { label: destination },
      departure: new Date(departure).toISOString(),
      load_lb: load,
      interval_mi: interval,
      hos: false,
    })
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box sx={{ width: 380, p: 2, overflowY: 'auto', borderRight: 1, borderColor: 'divider' }}>
        <Stack component="form" spacing={1.5} onSubmit={submit}>
          <Typography variant="h6">Weather-Aware Truck Routing</Typography>
          <TextField size="small" label="Origin" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          <TextField size="small" label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <TextField size="small" type="datetime-local" label="Departure" value={departure} onChange={(e) => setDeparture(e.target.value)} />
          <TextField size="small" type="number" label="Load (lb)" value={load} onChange={(e) => setLoad(Number(e.target.value))} />
          <TextField size="small" select label="Checkpoint every" value={interval} onChange={(e) => setInterval(Number(e.target.value) as SampleInterval)}>
            {[10, 25, 50].map((v) => (
              <MenuItem key={v} value={v}>{v} miles</MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained" disabled={state.status === 'loading'}>Plan routes</Button>
          {state.status === 'loading' && <LinearProgress />}
          {state.status === 'error' && <Alert severity="error">{state.message}</Alert>}
        </Stack>

        {plan && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Alert severity={plan.recommendation.warning ? 'warning' : 'success'}>
              {plan.recommendation.summary}
              {plan.recommendation.warning && <div>{plan.recommendation.warning}</div>}
            </Alert>
            {plan.routes.map((route) => (
              <Box
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                sx={{ p: 1.5, border: 1, borderRadius: 1, cursor: 'pointer', borderColor: route.id === selectedRouteId ? 'primary.main' : 'divider' }}
              >
                <Typography variant="subtitle2">{route.id} {route.recommended && '· Recommended'}</Typography>
                <Typography variant="body2" color="text.secondary">{route.name}</Typography>
                <Typography variant="body2">
                  {formatMiles(route.distance_mi)} · {formatDuration(route.trip_s)} · worst {LEVEL_LABEL[route.max_level]}
                </Typography>
                <Typography variant="caption">
                  Severe {route.miles_by_level.severe} mi · High {route.miles_by_level.high} mi · No Travel {route.miles_by_level.no_travel} mi
                </Typography>
              </Box>
            ))}
            <Divider />
            <TextField size="small" select label="Heatmap" value={layer} onChange={(e) => setLayer(e.target.value as HeatmapLayer)}>
              <MenuItem value="risk">Risk</MenuItem>
              <MenuItem value="wind">Wind</MenuItem>
              <MenuItem value="precip">Precipitation</MenuItem>
            </TextField>
            <Typography variant="body2">
              +{timeline.hour} h · {formatDateTime(new Date(new Date(plan.heatmap.start).getTime() + timeline.hour * 3_600_000))}
            </Typography>
            <Slider min={0} max={plan.heatmap.hours} value={timeline.hour} onChange={(_, v) => timeline.setHour(v as number)} />
            <Button size="small" onClick={timeline.toggle}>{timeline.playing ? 'Pause' : 'Play'}</Button>
          </Stack>
        )}
      </Box>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <RouteMap
          plan={plan}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          hour={timeline.hour}
          heatmapLayer={layer}
          heatmapVisible
          heatmapOpacity={0.8}
          highlightedCheckpoint={highlighted}
          onHighlightCheckpoint={setHighlighted}
          renderCheckpoint={(cp) => (
            <Box sx={{ fontSize: 12 }}>
              <strong>Mile {cp.mile}</strong> · {LEVEL_LABEL[cp.level]}
              <br />
              ETA {formatDateTime(cp.eta)}
              <br />
              Wind {cp.weather.wind_mph} mph · Rain {cp.weather.rain_in_hr} · Snow {cp.weather.snow_in_hr}
              {cp.load_rule && <><br />{cp.load_rule}</>}
            </Box>
          )}
        />
      </Box>
    </Box>
  )
}

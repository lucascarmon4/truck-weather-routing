import type { PlaceInput, PlanRequest, PlanResponse, SampleInterval } from '../api/types'
import { formatDayClock, formatInt, nextFullHour, shortPlace, toLocalInputValue, zoneName } from './format'

export type TripFormValue = {
  origin: PlaceInput
  destination: PlaceInput
  departure: string
  load: string
  interval: SampleInterval
  hos: boolean
}

export const MAX_LOAD_LB = 80_000
export const PRESETS: [string, number][] = [
  ['Empty', 0],
  ['Light', 20_000],
  ['Heavy', 35_000],
  ['Max', 45_000],
]

export function parseLoad(load: string) {
  const digits = load.replace(/[^0-9]/g, '')
  return digits === '' ? null : Number(digits)
}

export function emptyTrip(): TripFormValue {
  return {
    origin: { label: '' },
    destination: { label: '' },
    departure: toLocalInputValue(nextFullHour()),
    load: '',
    interval: 25,
    hos: false,
  }
}

export function exampleTrip(): TripFormValue {
  return { ...emptyTrip(), origin: { label: 'Chicago, IL' }, destination: { label: 'Denver, CO' }, load: '42000' }
}

export function toPlanRequest(trip: TripFormValue): PlanRequest {
  return {
    origin: trip.origin,
    destination: trip.destination,
    departure: new Date(trip.departure).toISOString(),
    load_lb: parseLoad(trip.load) ?? 0,
    interval_mi: trip.interval,
    hos: trip.hos,
  }
}

export function tripLine(plan: PlanResponse) {
  return `${shortPlace(plan.request.origin.label)} → ${shortPlace(plan.request.destination.label)}`
}

export function tripMeta(plan: PlanResponse) {
  const { departure, load_lb, interval_mi, hos } = plan.request
  return `${formatDayClock(departure)} ${zoneName(departure)} · ${formatInt(load_lb)} lb · every ${interval_mi} mi${hos ? ' · rest breaks' : ''}`
}

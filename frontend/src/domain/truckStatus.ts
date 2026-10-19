import { formatDayClock, formatInt } from './format'
import type { TruckState } from './geometry'

export function truckStatusText(state: TruckState, destination: string, departure: string) {
  switch (state.status) {
    case 'waiting':
      return 'Not departed'
    case 'arrived':
      return `Arrived in ${destination}`
    case 'rest':
      return `10 h rest · until ${formatDayClock(new Date(new Date(departure).getTime() + (state.until ?? 0) * 1000))}`
    case 'break':
      return '30 min break'
    default:
      return `Mile ${formatInt(state.mile)}`
  }
}

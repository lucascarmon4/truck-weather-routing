import type { Checkpoint } from '../api/types'

export function driversText(checkpoint: Checkpoint) {
  if (!checkpoint.drivers.length) return 'Nothing above Low'
  return checkpoint.drivers.map((d) => d[0].toUpperCase() + d.slice(1)).join(' + ')
}

export function precipText(value: number) {
  return value ? `${value.toFixed(2)} in/hr` : 'None'
}

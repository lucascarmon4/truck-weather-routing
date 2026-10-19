const clockFormat = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const zoneFormat = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })

const pad = (n: number) => String(n).padStart(2, '0')

export function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours} h ${pad(minutes)} m` : `${minutes} min`
}

export function formatInt(value: number) {
  return Math.round(value).toLocaleString('en-US')
}

export function formatMiles(miles: number) {
  return `${formatInt(miles)} mi`
}

export function formatClock(at: string | Date) {
  return clockFormat.format(new Date(at))
}

export function formatDayClock(at: string | Date) {
  return `${weekdayFormat.format(new Date(at))} ${formatClock(at)}`
}

export function formatDay(at: string | Date) {
  return dayFormat.format(new Date(at)).replace(',', '')
}

export function zoneName(at: string | Date = new Date()) {
  return zoneFormat.formatToParts(new Date(at)).find((part) => part.type === 'timeZoneName')?.value ?? ''
}

export function shortPlace(label: string) {
  const parts = label.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length >= 3) return `${parts[0]}, ${parts[parts.length - 2]}`
  return parts.slice(0, 2).join(', ')
}

export function addHours(at: string | Date, hours: number) {
  return new Date(new Date(at).getTime() + hours * 3_600_000)
}

export function nextFullHour(from = new Date()) {
  const date = new Date(from)
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return date
}

export function toLocalInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function routeLetter(routeId: string) {
  return routeId.slice(-1)
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDuration(seconds: number) {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours} h ${String(minutes).padStart(2, '0')} min` : `${minutes} min`
}

export function formatMiles(miles: number) {
  return `${Math.round(miles).toLocaleString()} mi`
}

export function formatTime(iso: string | Date) {
  return timeFormat.format(new Date(iso))
}

export function formatDateTime(iso: string | Date) {
  return dateTimeFormat.format(new Date(iso))
}

export function nextFullHour(from = new Date()) {
  const date = new Date(from)
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 1)
  return date
}

export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

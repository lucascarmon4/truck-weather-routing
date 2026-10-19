import { useCallback, useEffect, useState } from 'react'

const HOURS_PER_SECOND = 4

export function useTimeline(maxHour: number) {
  const [hour, setHourState] = useState(0)
  const [playing, setPlaying] = useState(false)

  const setHour = useCallback(
    (value: number) => setHourState(Math.min(maxHour, Math.max(0, Math.round(value)))),
    [maxHour],
  )

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setHourState((current) => (current >= maxHour ? 0 : current + 1))
    }, 1000 / HOURS_PER_SECOND)
    return () => window.clearInterval(id)
  }, [playing, maxHour])

  const toggle = useCallback(() => setPlaying((value) => !value), [])
  const step = useCallback((delta: number) => {
    setPlaying(false)
    setHourState((current) => Math.min(maxHour, Math.max(0, current + delta)))
  }, [maxHour])
  const reset = useCallback(() => {
    setPlaying(false)
    setHourState(0)
  }, [])

  return { hour, setHour, playing, toggle, step, reset }
}

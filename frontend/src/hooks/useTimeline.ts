import { useCallback, useEffect, useState } from 'react'

const HOURS_PER_SECOND = 4
const TICK_MS = 50

export function useTimeline(maxHour: number) {
  const [hour, setHourState] = useState(0)
  const [playing, setPlaying] = useState(false)

  const clamp = useCallback((value: number) => Math.min(maxHour, Math.max(0, value)), [maxHour])
  const setHour = useCallback((value: number) => setHourState(clamp(value)), [clamp])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setHourState((current) => {
        const next = current + (HOURS_PER_SECOND * TICK_MS) / 1000
        if (next < maxHour) return next
        setPlaying(false)
        return maxHour
      })
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [playing, maxHour])

  const toggle = useCallback(() => {
    setPlaying((value) => !value)
    setHourState((current) => (current >= maxHour ? 0 : current))
  }, [maxHour])

  const step = useCallback(
    (delta: 1 | -1) => {
      setPlaying(false)
      setHourState((current) => clamp(delta > 0 ? Math.floor(current) + 1 : Math.ceil(current) - 1))
    },
    [clamp],
  )

  const jump = useCallback(
    (value: number) => {
      setPlaying(false)
      setHourState(clamp(value))
    },
    [clamp],
  )

  return { hour, setHour, playing, toggle, step, jump }
}

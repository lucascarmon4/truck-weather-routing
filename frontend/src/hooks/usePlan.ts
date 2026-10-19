import { useCallback, useRef, useState } from 'react'
import { ApiError, planTrip } from '../api/client'
import type { PlanRequest, PlanResponse } from '../api/types'

export type PlanState =
  | { status: 'idle' }
  | { status: 'loading'; request: PlanRequest; startedAt: number }
  | { status: 'success'; request: PlanRequest; data: PlanResponse }
  | { status: 'error'; request: PlanRequest; message: string }

export function usePlan() {
  const [state, setState] = useState<PlanState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)

  const run = useCallback(async (request: PlanRequest) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setState({ status: 'loading', request, startedAt: Date.now() })
    try {
      const data = await planTrip(request, current.signal)
      setState({ status: 'success', request, data })
    } catch (error) {
      if (current.signal.aborted) return
      const message = error instanceof ApiError ? error.message : 'Unexpected error. Please try again.'
      setState({ status: 'error', request, message })
    }
  }, [])

  const cancel = useCallback(() => {
    controller.current?.abort()
    setState({ status: 'idle' })
  }, [])

  return { state, run, cancel }
}

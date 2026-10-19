import type { Place, PlanRequest, PlanResponse } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(errorMessage(body), response.status)
  return body as T
}

function errorMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    if ('detail' in body && typeof body.detail === 'string') return body.detail
    const first = Object.entries(body)[0]
    if (first) return `${first[0]}: ${JSON.stringify(first[1])}`
  }
  return 'Something went wrong. Please try again.'
}

export function planTrip(payload: PlanRequest, signal?: AbortSignal) {
  return request<PlanResponse>('/api/plan', { method: 'POST', body: JSON.stringify(payload), signal })
}

export async function searchPlaces(query: string, signal?: AbortSignal) {
  const data = await request<{ results: Place[] }>(`/api/geocode?q=${encodeURIComponent(query)}`, { signal })
  return data.results
}

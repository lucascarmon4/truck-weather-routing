import { useEffect, useMemo } from 'react'
import type { Heatmap } from '../api/types'
import { buildGrid, createFrameRenderer, type HeatmapLayer } from '../domain/heatmap'

export function useHeatmapFrames(heatmap: Heatmap | undefined, layer: HeatmapLayer) {
  const grid = useMemo(() => (heatmap?.points.length ? buildGrid(heatmap) : null), [heatmap])
  const render = useMemo(
    () => (heatmap && grid ? createFrameRenderer(heatmap, grid, layer) : null),
    [heatmap, grid, layer],
  )

  useEffect(() => {
    if (!render || !heatmap) return
    let hour = 0
    let handle = 0
    const warm = () => {
      const deadline = performance.now() + 8
      while (hour <= heatmap.hours && performance.now() < deadline) render(hour++)
      if (hour <= heatmap.hours) handle = window.setTimeout(warm, 16)
    }
    handle = window.setTimeout(warm, 50)
    return () => window.clearTimeout(handle)
  }, [render, heatmap])

  return { coordinates: grid?.coordinates ?? null, frameUrl: render }
}

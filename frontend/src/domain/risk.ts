import type { Level, MilesByLevel } from '../api/types'

export const LEVELS: Level[] = [0, 1, 2, 3, 4]

export const LEVEL_LABEL: Record<Level, string> = {
  0: 'Low',
  1: 'Moderate',
  2: 'High',
  3: 'Severe',
  4: 'No Travel',
}

export const LEVEL_COLOR: Record<Level, string> = {
  0: '#2e9d5b',
  1: '#e3b505',
  2: '#f07c1b',
  3: '#d7263d',
  4: '#4a1c6b',
}

export const LEVEL_KEY: Record<Level, keyof MilesByLevel> = {
  0: 'low',
  1: 'moderate',
  2: 'high',
  3: 'severe',
  4: 'no_travel',
}

export function levelFromScore(score: number): Level {
  return Math.min(4, Math.max(0, Math.floor(score))) as Level
}

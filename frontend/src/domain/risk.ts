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
  0: '#2E9E5B',
  1: '#E8B400',
  2: '#EC7A1C',
  3: '#D0302C',
  4: '#3E1A5C',
}

export const LEVEL_TINT: Record<Level, string> = {
  0: '#E4F4EA',
  1: '#FCF3D2',
  2: '#FDEAD9',
  3: '#FAE1E0',
  4: '#ECE4F2',
}

export const LEVEL_INK: Record<Level, string> = {
  0: '#1B6A3B',
  1: '#735600',
  2: '#97470A',
  3: '#A1201C',
  4: '#3E1A5C',
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

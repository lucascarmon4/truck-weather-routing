export type Level = 0 | 1 | 2 | 3 | 4

export type Place = { label: string; lat: number; lon: number }

export type PlaceInput = { label: string; lat?: number; lon?: number }

export type SampleInterval = 10 | 25 | 50

export type PlanRequest = {
  origin: PlaceInput
  destination: PlaceInput
  departure: string
  load_lb: number
  interval_mi: SampleInterval
  hos: boolean
}

export type Weather = {
  wind_mph: number
  gust_mph: number | null
  rain_in_hr: number
  snow_in_hr: number
  temperature_f: number | null
  weather_code: number | null
}

export type RiskDriver = 'wind' | 'rain' | 'snow' | 'load'

export type Checkpoint = {
  index: number
  mile: number
  lat: number
  lon: number
  eta: string
  drive_s: number
  covered_mi: number
  weather: Weather
  level: Level
  score: number
  drivers: RiskDriver[]
  load_rule: string | null
}

export type MilesByLevel = {
  low: number
  moderate: number
  high: number
  severe: number
  no_travel: number
}

export type RouteGeometry = {
  coordinates: [number, number][]
  miles: number[]
  elapsed_s: number[]
}

export type RestStop = {
  kind: 'break' | 'rest'
  mile: number
  lat: number
  lon: number
  start_s: number
  end_s: number
}

export type Route = {
  id: string
  name: string
  rank: number
  recommended: boolean
  distance_mi: number
  drive_s: number
  trip_s: number
  arrival: string
  miles_by_level: MilesByLevel
  avg_risk: number
  max_level: Level
  geometry: RouteGeometry
  stops: RestStop[]
  checkpoints: Checkpoint[]
}

export type Recommendation = {
  route_id: string
  ranking: string[]
  summary: string
  comparisons: { route_id: string; decided_by: string | null; text: string }[]
  warning: string | null
  criteria: string[]
}

export type Heatmap = {
  start: string
  hours: number
  spacing_deg: number
  points: [number, number][]
  risk: number[][]
  wind: number[][]
  precip: number[][]
}

export type RiskBand = {
  factor: string
  unit: string
  thresholds: [number, number, number, number]
  no_travel_inclusive: boolean
}

export type Rules = {
  levels: { value: Level; label: string }[]
  bands: RiskBand[]
  load_rules: string[]
}

export type PlanResponse = {
  request: Omit<PlanRequest, 'origin' | 'destination'> & { origin: Place; destination: Place }
  provider: string
  weather_provider: string
  generated_at: string
  routes: Route[]
  recommendation: Recommendation
  heatmap: Heatmap
  rules: Rules
}

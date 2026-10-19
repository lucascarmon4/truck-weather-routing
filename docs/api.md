# API

Base path: `/api`. All responses are JSON. Errors return `{ "detail": string }` with 400 (invalid input),
422 (location or route not found) or 502 (an upstream service failed).

## `GET /api/geocode?q=<text>`

Location autocomplete (US, Canada, Mexico). Results are cached for 24 h.

```ts
type GeocodeResponse = { results: { label: string; lat: number; lon: number }[] };
```

## `POST /api/plan`

```ts
type PlanRequest = {
  origin: { label: string; lat?: number; lon?: number };       // label only → geocoded server side
  destination: { label: string; lat?: number; lon?: number };
  departure: string;                                             // ISO 8601 with offset
  load_lb: number;                                               // cargo weight, 0–80,000
  interval_mi?: 10 | 25 | 50;                                    // checkpoint spacing, default 25
  hos?: boolean;                                                 // include rest breaks, default false
};

type Level = 0 | 1 | 2 | 3 | 4;                                  // Low, Moderate, High, Severe, No Travel

type Checkpoint = {
  index: number;
  mile: number;
  lat: number;
  lon: number;
  eta: string;                                                   // ISO, truck arrival at this point
  drive_s: number;                                               // driving time from origin
  covered_mi: number;                                            // route miles this checkpoint represents
  weather: {
    wind_mph: number;
    gust_mph: number;
    rain_in_hr: number;
    snow_in_hr: number;
    temperature_f: number | null;
    weather_code: number | null;                                 // WMO code
  };
  level: Level;
  score: number;                                                 // continuous 0–4, floor(score) === level
  drivers: ("wind" | "rain" | "snow" | "load")[];
  load_rule: string | null;                                      // set when a load rule raised the level
};

type Route = {
  id: "Route A" | "Route B" | "Route C";                         // sorted by drive time
  name: string;                                                  // main roads, e.g. "I-80 · I-76"
  rank: number;                                                  // 1 = recommended
  recommended: boolean;
  distance_mi: number;
  drive_s: number;
  trip_s: number;                                                // drive time + rest breaks
  arrival: string;
  miles_by_level: { low: number; moderate: number; high: number; severe: number; no_travel: number };
  avg_risk: number;                                              // distance-weighted mean level
  max_level: Level;
  geometry: {
    coordinates: [number, number][];                             // [lon, lat], ~400 m spacing
    miles: number[];                                             // cumulative miles per vertex
    elapsed_s: number[];                                         // seconds after departure per vertex
  };
  checkpoints: Checkpoint[];
};

type PlanResponse = {
  request: PlanRequest & { origin: { label: string; lat: number; lon: number }; destination: { label: string; lat: number; lon: number } };
  provider: "tomtom" | "osrm";
  generated_at: string;
  routes: Route[];
  recommendation: {
    route_id: string;
    ranking: string[];
    summary: string;
    comparisons: { route_id: string; decided_by: string | null; text: string }[];
    warning: string | null;
    criteria: string[];
  };
  heatmap: {
    start: string;                                               // departure rounded down to the hour = slider 0
    hours: 48;
    spacing_deg: number;
    points: [number, number][];                                  // [lat, lon] grid along the corridor
    risk: number[][];                                            // [point][hour 0..48], continuous 0–4
    wind: number[][];                                            // mph
    precip: number[][];                                          // rain + snow, in/hr
  };
  rules: {
    levels: { value: Level; label: string }[];
    bands: { factor: string; unit: string; thresholds: [number, number, number, number]; no_travel_inclusive: boolean }[];
    load_rules: string[];
  };
};
```

A full example response is in [`sample-plan.json`](sample-plan.json) (Denver → Salt Lake City, 42,000 lb, 25 mi).

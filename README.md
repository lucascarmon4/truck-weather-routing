# Weather-Aware Truck Routing

React + Django app that helps a truck driver pick the safest route between two places, based on the weather
forecast along each route at the time the truck will actually be there, the load weight and travel time.

**Live demo:** https://truck-weather-routing-dv2n.onrender.com (free instance, the first request after idle takes ~30 s) · **Walkthrough:** _coming soon_

## What it does

1. The user enters origin, destination, departure time and load weight.
2. The backend asks a routing API for **3 route options** (truck profile, weight-aware).
3. Each route is sampled every **10, 25 or 50 miles**. For every checkpoint it computes the **ETA** from the
   route's own travel-time profile and reads the hourly forecast **for that hour**.
4. Each checkpoint gets a risk level from the wind, rain and snow thresholds plus the load rules.
5. Routes are ranked and one is recommended, with a one-line explanation.
6. The map shows all routes, the selected route colored by risk, checkpoints with ETA and weather, and a
   **weather heatmap over the trip corridor** with a **0–48 h forecast slider**. Truck markers move along each
   route as the slider changes, so you can see what weather each truck meets.

## Risk rules and how they were interpreted

| Condition | Low | Moderate | High | Severe | No Travel |
|---|---|---|---|---|---|
| Wind | < 25 mph | 25–34 | 35–44 | 45–54 | ≥ 55 mph |
| Rain | < 0.10 in/hr | 0.10–0.25 | 0.25–0.50 | 0.50–1.00 | > 1.00 |
| Snow | < 0.5 in/hr | 0.5–1.0 | 1.0–2.0 | 2.0–3.0 | > 3.0 |

- The table's ranges share their edges (0.25 is in both Moderate and High). **Lower bounds are inclusive**, so
  an edge value goes to the higher, safer level: 0.25 in/hr rain is High. No Travel follows the table literally:
  wind ≥ 55 is No Travel, but rain of exactly 1.00 in/hr and snow of exactly 3.0 in/hr are Severe.
- A checkpoint takes the **worst** of the three factors. The response says which factor drove it.
- **Load rules** can only raise a level: 45–54 mph with more than 30,000 lb → No Travel; 35–44 mph with more
  than 40,000 lb → Severe. When a load rule changes the level, the checkpoint says so.
- Wind uses the **sustained** 10 m wind speed. Gusts are shown but not scored.
- Rain is `rain + showers` (Open-Meteo splits convective showers out). Snow is the hourly snowfall in inches.

All of this lives in [`backend/routing/services/risk.py`](backend/routing/services/risk.py) and is covered by
table-driven tests.

## Recommendation

Routes are compared lexicographically, in the order the spec gives:

0. **Fewest No Travel miles** (added on top of the spec: No Travel is worse than Severe, so a route that has
   any of it should never beat one that has none)
1. Fewest Severe miles
2. Fewest High miles
3. Lowest average risk (distance-weighted mean of the levels, 0–4)
4. Shortest travel time

"Miles at a level" means route miles, not checkpoint counts. Each checkpoint stands for the stretch of road
halfway to its neighbours, so the totals add up to the route length whatever the sampling interval.
The explanation names the first criterion that separates the winner from each other route.

## Time handling

- ETAs come from the routing provider's cumulative travel time along the polyline, interpolated per checkpoint.
- Wind is an instantaneous value, so it is interpolated between hours. Precipitation is an hourly total for the
  hour *ending* at each timestamp, so the hour that contains the ETA is used.
- Optional **hours-of-service rest breaks** (off by default): a 30 min break after 8 h of driving and a 10 h
  reset after 11 h. When enabled, ETAs and the trip time include them, so later checkpoints read the forecast
  for when the truck really gets there. The API returns each stop (kind, mile, start and end), and the map parks
  the truck there while the timeline shows the stop as its own band.
- Times are shown in the viewer's browser time zone, labelled with its abbreviation.

## Heatmap

The backend builds a regular lat/lon grid that covers the corridor around all three routes (adaptive spacing,
up to ~260 points) and returns 49 hourly values per point for risk, wind and precipitation.

The frontend turns each hour into a small image: values are interpolated bilinearly, the rows are resampled
to Web Mercator so they line up with the basemap, and the pixels are handed to a MapLibre image source as
`ImageData`. All 49 frames are pre-rendered during idle time after a plan loads, so moving the slider or pressing
play only swaps pixels: nothing is fetched, decoded or rebuilt.

## Providers

| Need | Service | Notes |
|---|---|---|
| Routing | TomTom Routing API | `travelMode=truck`, `vehicleWeight` = load + 33,000 lb tare, traffic-aware `departAt`, up to 2 alternatives |
| Routing (fallback) | OSRM public server | used when `TOMTOM_API_KEY` is not set; car profile, durations capped at 65 mph |
| Weather | Open-Meteo | hourly forecast, many locations per request, 16 days |
| Weather (fallback) | MET Norway | used automatically when Open-Meteo is down or rate limited |
| Geocoding | Photon (Komoot) | autocomplete limited to the US, Canada and Mexico |
| Basemap | OpenFreeMap | vector tiles, no key |

If the provider returns fewer than 3 distinct routes, extra options are found by pushing a via point sideways
from the middle of the fastest route. Candidates that overlap an existing route by more than 80 % or take more
than 1.6× as long are discarded.

Weather lookups are snapped to a 0.05° grid and cached for 30 minutes. Whole plans are cached for 10 minutes,
so repeating a search is instant.

## Project layout

```
backend/                Django + DRF
  routing/services/
    providers/          TomTom, OSRM, geocoding
    weather.py          Open-Meteo client, hourly series, fallback chain
    metno.py            MET Norway fallback
    risk.py             thresholds and load rules
    analysis.py         checkpoints, ETAs, miles per level
    recommend.py        ranking and explanation
    alternatives.py     guarantees 3 distinct routes
    heatmap.py          corridor grid and hourly values
    hos.py              rest breaks
    planner.py          orchestration and response
frontend/               React + TypeScript + MUI + MapLibre (react-map-gl)
  src/components/       trip form, route cards, timeline, checkpoint table, heatmap controls
  src/domain/           geometry, heatmap rendering, formatting, trip model
  src/map/              map component, layer styles and markers
docs/api.md             API contract and response types
```

## Running locally

Backend (Python 3.12):

```bash
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt -r requirements-dev.txt   # .venv/bin on macOS/Linux
cp .env.example .env            # add TOMTOM_API_KEY (optional)
.venv/Scripts/python manage.py runserver
```

Frontend (Node 22):

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173, proxies /api to :8000
```

Tests:

```bash
cd backend && .venv/Scripts/python -m pytest
cd frontend && npm test
```

## Deployment

A single Docker image builds the frontend and serves it from Django with WhiteNoise, behind gunicorn.
[`render.yaml`](render.yaml) deploys it to Render; the only secret is `TOMTOM_API_KEY`. Set `REDIS_URL` to share
the cache between instances.

## Trade-offs and next steps

- The free Open-Meteo tier allows about 10,000 location-calls per day; a long trip uses ~300. The MET Norway
  fallback and the caches keep the demo usable; a paid key (`OPEN_METEO_API_KEY`) removes the limit.
- The heatmap shows forecast conditions over the corridor at each hour. Checkpoint risk uses the hour the truck
  reaches each point. They answer different questions, which is why both are shown.
- Next: suggest the safest departure time in the next 48 h, and push alerts when the forecast for a planned trip
  changes.

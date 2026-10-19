import logging
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import requests
from django.conf import settings
from django.core.cache import cache

from .errors import UpstreamError

logger = logging.getLogger(__name__)

HOURLY_VARIABLES = (
    "wind_speed_10m",
    "wind_gusts_10m",
    "rain",
    "showers",
    "snowfall",
    "temperature_2m",
    "weather_code",
)
SNAP_DEG = 0.05
CACHE_TTL_SECONDS = 30 * 60
MAX_FORECAST_DAYS = 16
RETRIES = 2
RETRY_BACKOFF_SECONDS = 1.5


def snap(lat, lon):
    return round(round(lat / SNAP_DEG) * SNAP_DEG, 2), round(round(lon / SNAP_DEG) * SNAP_DEG, 2)


def floor_hour(dt):
    return dt.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


def ceil_hour(dt):
    floored = floor_hour(dt)
    return floored if floored == dt else floored + timedelta(hours=1)


@dataclass
class WeatherSample:
    wind_mph: float
    gust_mph: float | None
    rain_in_hr: float
    snow_in_hr: float
    temperature_f: float | None
    weather_code: int | None

    def as_dict(self):
        return {
            "wind_mph": round(self.wind_mph, 1),
            "gust_mph": None if self.gust_mph is None else round(self.gust_mph, 1),
            "rain_in_hr": round(self.rain_in_hr, 3),
            "snow_in_hr": round(self.snow_in_hr, 2),
            "temperature_f": None if self.temperature_f is None else round(self.temperature_f),
            "weather_code": self.weather_code,
        }


@dataclass
class HourlySeries:
    start: datetime
    wind: list
    gust: list
    rain: list
    snow: list
    temperature: list
    code: list

    def _index(self, hour):
        offset = int((hour - self.start).total_seconds() // 3600)
        return min(max(offset, 0), len(self.wind) - 1)

    def at_hour(self, hour):
        i = self._index(hour)
        return WeatherSample(
            wind_mph=self.wind[i],
            gust_mph=self.gust[i],
            rain_in_hr=self.rain[i],
            snow_in_hr=self.snow[i],
            temperature_f=self.temperature[i],
            weather_code=self.code[i],
        )

    def at(self, moment):
        """Wind is an instantaneous value, so it is interpolated between hours. Rain and snow are totals
        for the hour ending at each timestamp, so the hour that contains the moment is used."""
        before = floor_hour(moment)
        after = before + timedelta(hours=1)
        t = (moment - before).total_seconds() / 3600
        a, b = self.at_hour(before), self.at_hour(after)
        bucket = self.at_hour(ceil_hour(moment))
        return WeatherSample(
            wind_mph=a.wind_mph + t * (b.wind_mph - a.wind_mph),
            gust_mph=None if a.gust_mph is None or b.gust_mph is None else a.gust_mph + t * (b.gust_mph - a.gust_mph),
            rain_in_hr=bucket.rain_in_hr,
            snow_in_hr=bucket.snow_in_hr,
            temperature_f=a.temperature_f,
            weather_code=bucket.weather_code,
        )


def _clean(values, default=0.0):
    return [default if v is None else v for v in values]


def _parse_location(payload):
    hourly = payload["hourly"]
    start = datetime.fromisoformat(hourly["time"][0]).replace(tzinfo=timezone.utc)
    rain = [r + s for r, s in zip(_clean(hourly["rain"]), _clean(hourly["showers"]))]
    return HourlySeries(
        start=start,
        wind=_clean(hourly["wind_speed_10m"]),
        gust=_clean(hourly["wind_gusts_10m"]),
        rain=rain,
        snow=_clean(hourly["snowfall"]),
        temperature=_clean(hourly["temperature_2m"], None),
        code=_clean(hourly["weather_code"], None),
    )


class CachedWeatherClient:
    name = ""
    batch_size = 1
    max_workers = 1

    def __init__(self, session=None):
        self.session = session or requests.Session()
        adapter = requests.adapters.HTTPAdapter(pool_maxsize=self.max_workers)
        self.session.mount("https://", adapter)

    def _fetch_batch(self, points, start, end):
        raise NotImplementedError

    def hourly(self, points, start, end):
        start, end = floor_hour(start), ceil_hour(end)
        end = min(end, forecast_horizon())
        snapped = {p: snap(*p) for p in points}
        unique = sorted(set(snapped.values()))

        def key(p):
            return f"{self.name}:{p[0]}:{p[1]}:{start:%Y%m%d%H}:{end:%Y%m%d%H}"

        cached = cache.get_many([key(p) for p in unique])
        series = {p: cached[key(p)] for p in unique if key(p) in cached}
        missing = [p for p in unique if p not in series]
        batches = [missing[i : i + self.batch_size] for i in range(0, len(missing), self.batch_size)]
        if batches:
            with ThreadPoolExecutor(max_workers=min(self.max_workers, len(batches))) as pool:
                for result in pool.map(lambda b: self._fetch_batch(b, start, end), batches):
                    series.update(result)
                    cache.set_many({key(p): s for p, s in result.items()}, CACHE_TTL_SECONDS)
        logger.info("%s: %s locations, %s cached, %s requests", self.name, len(unique), len(cached), len(batches))
        return {p: series[s] for p, s in snapped.items()}


class FallbackWeatherClient:
    def __init__(self, *clients):
        self.clients = clients
        self.source = None

    def hourly(self, points, start, end):
        error = None
        for client in self.clients:
            try:
                result = client.hourly(points, start, end)
            except UpstreamError as exc:
                logger.warning("%s failed, trying the next weather source: %s", client.name, exc.message)
                error = exc
                continue
            self.source = client.name
            return result
        raise error


class OpenMeteoClient(CachedWeatherClient):
    name = "open-meteo"
    batch_size = 80
    max_workers = 4

    def __init__(self, session=None):
        super().__init__(session)
        key = settings.OPEN_METEO_API_KEY
        self.base_url = (
            "https://customer-api.open-meteo.com/v1/forecast" if key else "https://api.open-meteo.com/v1/forecast"
        )
        self.api_key = key

    def _fetch_batch(self, points, start, end):
        params = {
            "latitude": ",".join(f"{lat:.2f}" for lat, _ in points),
            "longitude": ",".join(f"{lon:.2f}" for _, lon in points),
            "hourly": ",".join(HOURLY_VARIABLES),
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "temperature_unit": "fahrenheit",
            "timezone": "GMT",
            "start_hour": start.strftime("%Y-%m-%dT%H:%M"),
            "end_hour": end.strftime("%Y-%m-%dT%H:%M"),
        }
        if self.api_key:
            params["apikey"] = self.api_key
        error = UpstreamError("Weather service returned an error.")
        for attempt in range(RETRIES + 1):
            if attempt:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
            try:
                response = self.session.get(self.base_url, params=params, timeout=settings.HTTP_TIMEOUT_SECONDS)
            except requests.RequestException as exc:
                logger.warning("Open-Meteo unreachable (attempt %s): %s", attempt + 1, exc)
                error = UpstreamError("Weather service is unreachable.")
                continue
            if response.status_code == 429:
                error = UpstreamError("Weather service rate limit reached. Please try again in a minute.")
                continue
            if response.status_code >= 500:
                logger.warning("Open-Meteo %s (attempt %s)", response.status_code, attempt + 1)
                continue
            if not response.ok:
                logger.warning("Open-Meteo %s: %s", response.status_code, response.text[:300])
                raise error
            try:
                payload = response.json()
            except ValueError:
                logger.warning("Open-Meteo sent a non-JSON body (attempt %s): %r", attempt + 1, response.text[:200])
                continue
            locations = payload if isinstance(payload, list) else [payload]
            return {point: _parse_location(loc) for point, loc in zip(points, locations)}
        raise error


def forecast_horizon():
    return floor_hour(datetime.now(timezone.utc)) + timedelta(days=MAX_FORECAST_DAYS, hours=-1)



import logging
from datetime import datetime, timedelta

import requests
from django.conf import settings

from .errors import UpstreamError
from .weather import CachedWeatherClient, HourlySeries

logger = logging.getLogger(__name__)

MPS_TO_MPH = 2.236936
MM_TO_IN = 1 / 25.4
SNOW_TO_LIQUID_RATIO = 10
SNOW_MAX_TEMP_C = 0.5


def _celsius_to_f(value):
    return None if value is None else value * 9 / 5 + 32


def _is_snow(temperature_c, symbol):
    return "snow" in symbol or "sleet" in symbol or (temperature_c is not None and temperature_c <= SNOW_MAX_TEMP_C)


def parse_timeseries(timeseries, start, end):
    """MET Norway reports precipitation for the hour after each timestamp (and only 6-hour totals after
    about 2.5 days), so values are shifted onto the hour-ending convention used by HourlySeries."""
    entries = sorted(
        ((datetime.fromisoformat(e["time"].replace("Z", "+00:00")), e["data"]) for e in timeseries),
        key=lambda item: item[0],
    )
    hours = int((end - start).total_seconds() // 3600) + 1
    wind, temperature, rain, snow = [], [], [], []
    for h in range(hours):
        moment = start + timedelta(hours=h)
        current = next((d for t, d in reversed(entries) if t <= moment), entries[0][1])
        details = current["instant"]["details"]
        wind.append(details.get("wind_speed", 0.0) * MPS_TO_MPH)
        temperature.append(_celsius_to_f(details.get("air_temperature")))

        hour_start = moment - timedelta(hours=1)
        amount, symbol = 0.0, ""
        for t, data in reversed(entries):
            if t > hour_start:
                continue
            if t == hour_start and "next_1_hours" in data:
                amount = data["next_1_hours"]["details"].get("precipitation_amount", 0.0)
                symbol = data["next_1_hours"]["summary"]["symbol_code"]
            elif "next_6_hours" in data and hour_start < t + timedelta(hours=6):
                amount = data["next_6_hours"]["details"].get("precipitation_amount", 0.0) / 6
                symbol = data["next_6_hours"]["summary"]["symbol_code"]
            break
        inches = amount * MM_TO_IN
        if _is_snow(details.get("air_temperature"), symbol):
            rain.append(0.0)
            snow.append(inches * SNOW_TO_LIQUID_RATIO)
        else:
            rain.append(inches)
            snow.append(0.0)
    return HourlySeries(
        start=start, wind=wind, gust=[None] * hours, rain=rain, snow=snow, temperature=temperature, code=[None] * hours
    )


class MetNorwayClient(CachedWeatherClient):
    name = "met-norway"
    batch_size = 1
    max_workers = 12
    url = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
    user_agent = "truck-weather-routing/1.0 github.com/lucascarmon4"

    def _fetch_batch(self, points, start, end):
        (lat, lon), = points
        try:
            response = self.session.get(
                self.url,
                params={"lat": f"{lat:.2f}", "lon": f"{lon:.2f}"},
                headers={"User-Agent": self.user_agent},
                timeout=settings.HTTP_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            timeseries = response.json()["properties"]["timeseries"]
        except (requests.RequestException, ValueError, KeyError) as exc:
            logger.warning("MET Norway failed for %s,%s: %s", lat, lon, exc)
            raise UpstreamError("Weather services are unavailable right now. Please try again shortly.") from exc
        return {(lat, lon): parse_timeseries(timeseries, start, end)}

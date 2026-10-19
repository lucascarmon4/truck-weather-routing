import hashlib
import logging

import requests
from django.conf import settings
from django.core.cache import cache

from ..errors import LocationNotFoundError, UpstreamError

logger = logging.getLogger(__name__)

PHOTON_URL = "https://photon.komoot.io/api/"
CACHE_TTL_SECONDS = 24 * 3600
NORTH_AMERICA = {"US", "CA", "MX"}


def _label(props):
    city = props.get("city") or props.get("county")
    parts = [props.get("name"), city if city != props.get("name") else None, props.get("state"), props.get("countrycode")]
    return ", ".join(p for p in parts if p)


def search(query, limit=5):
    query = query.strip()
    if len(query) < 2:
        return []
    key = "geo:" + hashlib.sha1(f"{query.lower()}:{limit}".encode()).hexdigest()
    if (hit := cache.get(key)) is not None:
        return hit
    try:
        response = requests.get(
            PHOTON_URL,
            params={"q": query, "limit": limit * 2, "lang": "en", "lat": 39.5, "lon": -98.35},
            timeout=settings.HTTP_TIMEOUT_SECONDS,
            headers={"User-Agent": "truck-weather-routing/1.0"},
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Photon failed: %s", exc)
        raise UpstreamError("Location search is unavailable.") from exc
    results, seen = [], set()
    for feature in response.json().get("features", []):
        props = feature["properties"]
        if props.get("countrycode") not in NORTH_AMERICA:
            continue
        label = _label(props)
        if label in seen:
            continue
        seen.add(label)
        lon, lat = feature["geometry"]["coordinates"]
        results.append({"label": label, "lat": lat, "lon": lon})
    results = results[:limit]
    cache.set(key, results, CACHE_TTL_SECONDS)
    return results


def resolve(query):
    results = search(query, limit=1)
    if not results:
        raise LocationNotFoundError(f'Could not find "{query}". Try a city and state, e.g. "Dallas, TX".')
    return results[0]

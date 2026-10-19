from django.conf import settings

from .base import ProviderRoute, RouteQuery, RoutingProvider
from .osrm import OsrmProvider
from .tomtom import TomTomProvider


def get_provider() -> RoutingProvider:
    if settings.TOMTOM_API_KEY:
        return TomTomProvider(settings.TOMTOM_API_KEY)
    return OsrmProvider()


__all__ = ["ProviderRoute", "RouteQuery", "RoutingProvider", "get_provider"]

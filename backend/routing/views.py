import logging

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import PlanRequestSerializer
from .services.providers import geocoding as geocoding_service
from .services.errors import PlanningError
from .services.planner import Place, PlanRequest, plan

logger = logging.getLogger(__name__)


def _place(data):
    if "lat" in data:
        return Place(label=data["label"], lat=data["lat"], lon=data["lon"])
    found = geocoding_service.resolve(data["label"])
    return Place(label=found["label"], lat=found["lat"], lon=found["lon"])


@api_view(["GET"])
def health(request):
    return Response({"status": "ok"})


@api_view(["GET"])
def geocode(request):
    try:
        return Response({"results": geocoding_service.search(request.query_params.get("q", ""))})
    except PlanningError as exc:
        return Response({"detail": exc.message}, status=exc.status_code)


@api_view(["POST"])
def plan_trip(request):
    serializer = PlanRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    try:
        result = plan(
            PlanRequest(
                origin=_place(data["origin"]),
                destination=_place(data["destination"]),
                departure=data["departure"],
                load_lb=data["load_lb"],
                interval_mi=data["interval_mi"],
                hos=data["hos"],
            )
        )
    except PlanningError as exc:
        return Response({"detail": exc.message}, status=exc.status_code)
    return Response(result)

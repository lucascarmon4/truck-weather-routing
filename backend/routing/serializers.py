from rest_framework import serializers

from .services.analysis import SAMPLE_INTERVALS_MI


class PlaceSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=200)
    lat = serializers.FloatField(min_value=-90, max_value=90, required=False)
    lon = serializers.FloatField(min_value=-180, max_value=180, required=False)

    def validate(self, attrs):
        if ("lat" in attrs) != ("lon" in attrs):
            raise serializers.ValidationError("Provide both lat and lon, or neither.")
        return attrs


class PlanRequestSerializer(serializers.Serializer):
    origin = PlaceSerializer()
    destination = PlaceSerializer()
    departure = serializers.DateTimeField()
    load_lb = serializers.FloatField(min_value=0, max_value=80_000)
    interval_mi = serializers.ChoiceField(choices=SAMPLE_INTERVALS_MI, default=25)
    hos = serializers.BooleanField(default=False)

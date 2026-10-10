"""Serializers for demands.

Output keeps the field names the original API used — `_id`, GeoJSON
`location`, `up_votes`, `createdAt` — so the frontend needs no translation
layer.
"""

from rest_framework import serializers

from .models import Comment, Demand


class LocationField(serializers.Field):
    """GeoJSON Point: `{"type": "Point", "coordinates": [lng, lat]}`."""

    def to_representation(self, value):
        return {'type': 'Point', 'coordinates': value.coordinates}

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError(
                'Invalid location. Provide [longitude, latitude].'
            )

        coordinates = data.get('coordinates')
        if not isinstance(coordinates, (list, tuple)) or len(coordinates) != 2:
            raise serializers.ValidationError(
                'Invalid location. Provide [longitude, latitude].'
            )

        try:
            longitude, latitude = float(coordinates[0]), float(coordinates[1])
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                'Coordinates must be an array of two numbers '
                '[longitude, latitude].'
            )

        if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
            raise serializers.ValidationError(
                'Coordinates are out of range.'
            )

        return {'longitude': longitude, 'latitude': latitude}


class CommentSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source='pk', read_only=True)
    user = serializers.CharField(source='user_id', read_only=True)
    userName = serializers.CharField(source='user.name', read_only=True)

    class Meta:
        model = Comment
        fields = ['_id', 'user', 'userName', 'text', 'timestamp']
        read_only_fields = ['_id', 'user', 'userName', 'timestamp']


class DemandSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source='pk', read_only=True)
    id = serializers.CharField(source='pk', read_only=True)
    user = serializers.CharField(source='user_id', read_only=True)
    userName = serializers.CharField(source='user.name', read_only=True)
    location = LocationField(source='*')
    comments = CommentSerializer(many=True, read_only=True)
    upvotedBy = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    distance = serializers.SerializerMethodField()

    class Meta:
        model = Demand
        fields = [
            '_id',
            'id',
            'user',
            'userName',
            'title',
            'description',
            'location',
            'category',
            'status',
            'up_votes',
            'upvotedBy',
            'comments',
            'createdAt',
            'updatedAt',
            'distance',
        ]
        read_only_fields = ['up_votes', 'upvotedBy', 'comments']
        extra_kwargs = {'description': {'max_length': 2000}}

    def get_upvotedBy(self, obj):
        # `.all()` (not `.values_list()`) so the prefetched rows are
        # reused instead of issuing one query per demand.
        return [str(user.pk) for user in obj.upvoted_by.all()]

    def get_distance(self, obj):
        """Metres from the query point; only present on `nearby` results."""
        distance = getattr(obj, 'distance', None)
        return round(distance, 2) if distance is not None else None

    def validate_location(self, value):
        return value

"""Serializers for property listings."""

from django.core.validators import RegexValidator
from rest_framework import serializers

from demands.serializers import LocationField

from .models import Property

# Declaring `contactNumber` explicitly replaces the field DRF would generate
# from the model, so the model's own validator has to be restated here.
CONTACT_NUMBER_VALIDATOR = RegexValidator(
    r'^\d{10}$', 'Invalid contact number. It must be 10 digits.'
)


class PropertySerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source='pk', read_only=True)
    id = serializers.CharField(source='pk', read_only=True)
    owner = serializers.CharField(source='owner_id', read_only=True)
    ownerName = serializers.CharField(source='owner.name', read_only=True)
    location = LocationField(source='*')
    contactNumber = serializers.CharField(
        source='contact_number',
        max_length=10,
        validators=[CONTACT_NUMBER_VALIDATOR],
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    distance = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            '_id',
            'id',
            'owner',
            'ownerName',
            'title',
            'description',
            'category',
            'type',
            'price',
            'area',
            'contactNumber',
            'location',
            'status',
            'createdAt',
            'updatedAt',
            'distance',
        ]

    def get_distance(self, obj):
        """Metres from the query point; only present on nearby results."""
        distance = getattr(obj, 'distance', None)
        return round(distance, 2) if distance is not None else None

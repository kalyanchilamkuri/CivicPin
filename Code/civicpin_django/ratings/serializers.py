"""Serializers for customer reviews."""

from rest_framework import serializers

from .models import Rating


class RatingSerializer(serializers.ModelSerializer):
    _id = serializers.CharField(source='pk', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Rating
        fields = ['_id', 'email', 'rating', 'review', 'createdAt']


class PublicRatingSerializer(RatingSerializer):
    """Review as shown to everyone: the address is masked."""

    email = serializers.CharField(source='masked_email', read_only=True)


class RatingInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    review = serializers.CharField(max_length=5000)

    def validate_review(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('All fields are required.')
        return value

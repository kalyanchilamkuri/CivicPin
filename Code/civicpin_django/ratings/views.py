"""Review API endpoints.

    POST /api/rating/rating     create or update the review for an email
    GET  /api/rating/reviews    all reviews, newest first
"""

from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response

from .models import Rating
from civicpin.api import paginated_response
from civicpin.throttles import WriteThrottle

from .serializers import (
    PublicRatingSerializer,
    RatingInputSerializer,
    RatingSerializer,
)


@api_view(['POST'])
@throttle_classes([WriteThrottle])
def submit_rating(request):
    serializer = RatingInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'All fields are required.', 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data
    email = data['email'].strip().lower()

    # A signed-in caller may only review under their own address.
    if request.user.is_authenticated and request.user.email != email:
        email = request.user.email

    rating, created = Rating.objects.update_or_create(
        email=email,
        defaults={'rating': data['rating'], 'review': data['review']},
    )

    payload = {
        'message': 'Review added successfully.'
        if created
        else 'Review updated successfully.',
        'data': RatingSerializer(rating).data,
    }
    return Response(
        payload,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(['GET'])
def list_reviews(request):
    response = paginated_response(
        request, Rating.objects.all(), PublicRatingSerializer
    )
    # Keep the original `{data: [...]}` envelope.
    response.data = {'data': response.data}
    return response

"""Property API endpoints.

    POST /api/property/property                create a listing
    GET  /api/property/getProperty             list all listings
    GET  /api/property/getPropertyById/<id>    single listing
    GET  /api/property/nearby                  proximity search
"""

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from civicpin.api import paginated_response, parse_geo_params
from civicpin.throttles import WriteThrottle

from .models import Property
from .serializers import PropertySerializer


def property_queryset():
    return Property.objects.select_related('owner')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([WriteThrottle])
def create_property(request):
    serializer = PropertySerializer(data=request.data)
    if not serializer.is_valid():
        errors = serializer.errors
        if 'location' in errors:
            return Response(
                {'error': 'Invalid location. Provide [longitude, latitude].'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        first = next(iter(errors.values()))
        message = (
            str(first[0]) if isinstance(first, (list, tuple)) else str(first)
        )
        return Response(
            {'error': message, 'errors': errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    listing = serializer.save(owner=request.user)
    return Response(
        {
            'message': 'Property created successfully!',
            'property': PropertySerializer(listing).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def list_properties(request):
    queryset = property_queryset()

    category = request.query_params.get('category')
    if category and category != 'all':
        queryset = queryset.filter(category=category)

    listing_type = request.query_params.get('type')
    if listing_type and listing_type != 'all':
        queryset = queryset.filter(type=listing_type)

    return paginated_response(request, queryset, PropertySerializer)


@api_view(['GET'])
def property_detail(request, property_id):
    listing = property_queryset().filter(pk=_as_int(property_id)).first()
    if listing is None:
        return Response(
            {'message': 'Property not found'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(PropertySerializer(listing).data)


@api_view(['GET'])
def nearby_properties(request):
    params, error = parse_geo_params(request)
    if error is not None:
        return error

    queryset = property_queryset().near(*params)
    return paginated_response(request, queryset, PropertySerializer)


def _as_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

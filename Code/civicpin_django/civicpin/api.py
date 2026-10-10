"""Helpers shared by the list/nearby endpoints."""

import math

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

TOTAL_HEADER = 'X-Total-Count'


def _bad_request(message):
    return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)


def parse_geo_params(request):
    """Read latitude/longitude/radius from the query string.

    Returns `((latitude, longitude, radius_m), None)` or `(None, Response)`
    with the 400 to send back. The radius is clamped to the configured
    maximum so one request can't scan the whole table.
    """
    params = request.query_params
    latitude = params.get('latitude')
    longitude = params.get('longitude')
    radius = params.get('radius', 5000)

    if latitude in (None, '') or longitude in (None, ''):
        return None, _bad_request('Latitude and longitude are required.')

    try:
        latitude, longitude, radius = (
            float(latitude),
            float(longitude),
            float(radius),
        )
    except (TypeError, ValueError):
        return None, _bad_request(
            'latitude, longitude and radius must be numbers.'
        )

    # "nan" and "inf" parse as floats but poison the SQL comparison.
    if not all(math.isfinite(v) for v in (latitude, longitude, radius)):
        return None, _bad_request(
            'latitude, longitude and radius must be finite numbers.'
        )

    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        return None, _bad_request('Coordinates are out of range.')

    if radius <= 0:
        return None, _bad_request('radius must be greater than zero.')

    return (latitude, longitude, min(radius, settings.API_MAX_RADIUS_M)), None


def _int_param(request, name, default):
    try:
        return int(request.query_params.get(name, default))
    except (TypeError, ValueError):
        return default


def paginated_response(request, queryset, serializer_class):
    """Serialise one page of `queryset` as a plain JSON array.

    The body stays a bare array (what the existing frontend expects); page
    controls are `?limit=` / `?offset=` and the unpaged size is returned in
    the `X-Total-Count` header.
    """
    limit = _int_param(request, 'limit', settings.API_DEFAULT_PAGE_SIZE)
    limit = max(1, min(limit, settings.API_MAX_PAGE_SIZE))
    offset = max(0, _int_param(request, 'offset', 0))

    total = queryset.count()
    page = queryset[offset:offset + limit]
    response = Response(serializer_class(page, many=True).data)
    response[TOTAL_HEADER] = str(total)
    return response

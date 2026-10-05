"""Demand API endpoints.

    POST  /api/demand/demand                 create a demand
    GET   /api/demand/getDemand              list all demands
    GET   /api/demand/getDemandById/<id>     single demand
    GET   /api/demand/nearby                 proximity search
    PATCH /api/demand/<id>/upvote            toggle the caller's upvote
    POST  /api/demand/<id>/comments          add a comment
    GET   /api/demand/<id>/analysis          AI business analysis (server-side)
"""

import logging

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from civicpin.api import paginated_response, parse_geo_params
from civicpin.throttles import AIThrottle, WriteThrottle

from .ai import analyse_demand
from .models import Comment, Demand
from .serializers import CommentSerializer, DemandSerializer

logger = logging.getLogger(__name__)

MAX_COMMENT_LENGTH = 1000


def demand_queryset():
    return Demand.objects.select_related('user').prefetch_related(
        'comments__user', 'upvoted_by'
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([WriteThrottle])
def create_demand(request):
    serializer = DemandSerializer(data=request.data)
    if not serializer.is_valid():
        errors = serializer.errors
        if 'location' in errors:
            return Response(
                {'error': 'Invalid location. Provide [longitude, latitude].'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {'error': 'Invalid demand data', 'errors': errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    demand = serializer.save(user=request.user)
    # A new demand counts as its author's own upvote, as before.
    demand.upvoted_by.add(request.user)
    demand.up_votes = 1
    demand.save(update_fields=['up_votes', 'updated_at'])

    return Response(
        {
            'message': 'Demand created successfully!',
            'demand': DemandSerializer(demand).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
def list_demands(request):
    category = request.query_params.get('category')
    queryset = demand_queryset()
    if category and category != 'all':
        queryset = queryset.filter(category=category)
    return paginated_response(request, queryset, DemandSerializer)


@api_view(['GET'])
def demand_detail(request, demand_id):
    demand = demand_queryset().filter(pk=_as_int(demand_id)).first()
    if demand is None:
        return Response(
            {'message': 'Demand not found'}, status=status.HTTP_404_NOT_FOUND
        )

    response = Response(DemandSerializer(demand).data)
    response['Cache-Control'] = (
        'no-store, no-cache, must-revalidate, proxy-revalidate'
    )
    return response


@api_view(['GET'])
def nearby_demands(request):
    params, error = parse_geo_params(request)
    if error is not None:
        return error

    queryset = demand_queryset().near(*params)
    return paginated_response(request, queryset, DemandSerializer)


@api_view(['PATCH', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([WriteThrottle])
def toggle_upvote(request, demand_id):
    demand = demand_queryset().filter(pk=_as_int(demand_id)).first()
    if demand is None:
        return Response(
            {'message': 'Demand not found'}, status=status.HTTP_404_NOT_FOUND
        )

    added = demand.toggle_upvote(request.user)
    demand.refresh_from_db()
    return Response(
        {'data': DemandSerializer(demand).data, 'upvoted': added}
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([WriteThrottle])
def add_comment(request, demand_id):
    demand = demand_queryset().filter(pk=_as_int(demand_id)).first()
    if demand is None:
        return Response(
            {'msg': 'Demand not found'}, status=status.HTTP_404_NOT_FOUND
        )

    text = str(request.data.get('text') or '').strip()
    if not text:
        return Response(
            {'msg': 'Comment text is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(text) > MAX_COMMENT_LENGTH:
        return Response(
            {
                'msg': 'Comment is too long (max '
                f'{MAX_COMMENT_LENGTH} characters)'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    comment = Comment.objects.create(
        demand=demand, user=request.user, text=text
    )
    demand.refresh_from_db()

    return Response(
        {
            'comment': CommentSerializer(comment).data,
            'demand': DemandSerializer(demand).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET', 'POST'])
@throttle_classes([AIThrottle])
def demand_analysis(request, demand_id):
    """AI feasibility analysis for a demand.

    Runs server-side so the Gemini key stays on the server, unlike the old
    client-side call which shipped the key to the browser.
    """
    demand = get_object_or_404(Demand, pk=_as_int(demand_id) or 0)
    analysis, error = analyse_demand(demand)

    if error:
        return Response({'error': error}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(analysis)


def _as_int(value):
    """Tolerate the Mongo-style ids old links may still carry."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

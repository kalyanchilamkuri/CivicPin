"""Server-rendered pages.

These replace the Next.js `app/` routes one-for-one:

    /                 home (globe, nearby demands, reviews)   -> login required
    /landing          marketing landing page
    /auth             login + signup
    /raise-request    pin a demand on the map
    /property         list a property
    /search-demands   browse and filter demands
    /viewrequest      demand detail + AI analysis
    /profile          account overview
    /rating           leave a review
    /terms            terms and conditions
"""

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import redirect, render

from demands.models import Demand
from properties.models import Property
from ratings.models import Rating


def _demand_categories():
    return Demand.CATEGORY_CHOICES


@login_required
def home(request):
    return render(
        request,
        'web/home.html',
        {
            'page_title': 'CivicPin',
            'reviews': Rating.objects.all()[:20],
            'demand_count': Demand.objects.count(),
            'property_count': Property.objects.count(),
        },
    )


def landing(request):
    return render(
        request,
        'web/landing.html',
        {'page_title': 'CivicPin - Mapping Community Infrastructure'},
    )


def auth_page(request):
    if request.user.is_authenticated:
        return redirect('web:home')

    mode = 'login' if request.GET.get('mode') == 'login' else 'signup'
    return render(
        request,
        'web/auth.html',
        {'page_title': 'Sign in - CivicPin', 'initial_mode': mode},
    )


@login_required
def raise_request(request):
    return render(
        request,
        'web/raise_request.html',
        {
            'page_title': 'Raise Facility Request - CivicPin',
            'categories': _demand_categories(),
        },
    )


@login_required
def property_page(request):
    return render(
        request,
        'web/property.html',
        {
            'page_title': 'Raise Property - CivicPin',
            'categories': Property.CATEGORY_CHOICES,
            'types': Property.TYPE_CHOICES,
            'statuses': Property.STATUS_CHOICES,
        },
    )


def search_demands(request):
    return render(
        request,
        'web/search_demands.html',
        {
            'page_title': 'Search Demands - CivicPin',
            'categories': _demand_categories(),
        },
    )


def view_request(request):
    """Demand detail. The id arrives as `?id=<pk>`, as the old links did."""
    demand_id = request.GET.get('id', '')
    return render(
        request,
        'web/viewrequest.html',
        {
            'page_title': 'Demand Details - CivicPin',
            'demand_id': demand_id,
        },
    )


@login_required
def profile(request):
    return render(
        request,
        'web/profile.html',
        {'page_title': 'Profile - CivicPin'},
    )


def rating_page(request):
    existing = None
    if request.user.is_authenticated:
        existing = Rating.objects.filter(email=request.user.email).first()
    return render(
        request,
        'web/rating.html',
        {'page_title': 'Leave a Review - CivicPin', 'existing': existing},
    )


def terms(request):
    return render(
        request,
        'web/terms.html',
        {'page_title': 'Terms and Conditions - CivicPin'},
    )


def api_root(request):
    """Health/metadata endpoint, as the Node server exposed at `/`."""
    from django.utils import timezone

    return JsonResponse(
        {
            'message': 'CivicPin API is running',
            'status': 'OK',
            'version': '2.0.0',
            'framework': f'Django {__import__("django").get_version()}',
            'timestamp': timezone.now().isoformat(),
            'endpoints': {
                'auth': '/api/auth/',
                'user': '/api/user/',
                'demand': '/api/demand/',
                'property': '/api/property/',
                'rating': '/api/rating/',
            },
        }
    )


def healthz(request):
    """Liveness/readiness probe: 200 only when the database answers."""
    from django.db import connection

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:  # noqa: BLE001 - any failure means "not ready"
        return JsonResponse({'status': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ok'})


def not_found(request, exception=None):
    return render(request, '404.html', status=404)


def server_error(request):
    return render(request, '500.html', status=500)

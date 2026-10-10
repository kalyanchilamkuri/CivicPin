"""Template context shared by every page."""

from django.conf import settings


def site_settings(request):
    """Expose the public client-side keys and feature flags to templates."""
    return {
        'GOOGLE_MAPS_API_KEY': settings.GOOGLE_MAPS_API_KEY,
        'GOOGLE_CLIENT_ID': settings.GOOGLE_CLIENT_ID,
        'MAPS_ENABLED': bool(settings.GOOGLE_MAPS_API_KEY),
        'AI_ENABLED': bool(settings.GEMINI_API_KEY),
        'SITE_NAME': 'CivicPin',
    }

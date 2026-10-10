"""DRF exception handler that keeps the API's `{"error": ...}` convention."""

from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None and isinstance(exc, Throttled):
        wait = int(exc.wait) if exc.wait else None
        message = 'Too many requests. Please slow down'
        if wait:
            message += f' and try again in {wait} seconds'
        response.data = {'error': message + '.', 'retryAfter': wait}
    return response

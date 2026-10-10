"""Root URL configuration.

API routes keep the exact paths the Express backend served, so any existing
client keeps working; the server-rendered pages take over the routes the
Next.js app used to own.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_media

from accounts.urls import auth_urlpatterns, user_urlpatterns
from web import views as web_views

urlpatterns = [
    path('admin/', admin.site.urls),
    # --- API (same paths as the previous Node backend) ------------------- #
    path('healthz', web_views.healthz, name='healthz'),
    path('api/', web_views.api_root, name='api-root'),
    path('api/auth/', include((auth_urlpatterns, 'auth'))),
    path('api/user/', include((user_urlpatterns, 'user'))),
    path('api/demand/', include('demands.urls')),
    path('api/property/', include('properties.urls')),
    path('api/rating/', include('ratings.urls')),
    # --- Server-rendered pages ------------------------------------------ #
    path('', include('web.urls')),
    # Uploaded avatars. `static()` only serves them under DEBUG, which left
    # profile photos broken in production; this works in both modes. Put a
    # CDN / object store in front for anything larger than a small site.
    re_path(
        r'^%s(?P<path>.*)$' % settings.MEDIA_URL.lstrip('/'),
        serve_media,
        {'document_root': settings.MEDIA_ROOT},
    ),
]

handler404 = 'web.views.not_found'
handler500 = 'web.views.server_error'

"""DRF authentication that reads the `civicpin_token` JWT cookie.

The original Express backend signed a JWT with a `{"user": {"id", "role"}}`
payload and stored it in an httpOnly cookie; the same contract is kept here so
existing clients (and the bundled templates) work unchanged. The token may also
arrive in the `x-auth-token` or `Authorization: Bearer ...` header.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

from .tokens import decode_token

UserModel = get_user_model()


def extract_token(request):
    token = request.COOKIES.get(settings.AUTH_COOKIE_NAME)
    if token:
        return token

    token = request.META.get('HTTP_X_AUTH_TOKEN')
    if token:
        return token

    header = request.META.get('HTTP_AUTHORIZATION', '')
    if header.lower().startswith('bearer '):
        return header[7:].strip()
    return None


def user_from_token(token):
    """Return the user a token points at, or None when it cannot be used."""
    payload = decode_token(token)
    if not payload:
        return None

    user_id = (payload.get('user') or {}).get('id')
    if not user_id:
        return None

    try:
        user = UserModel.objects.get(pk=user_id)
    except (UserModel.DoesNotExist, ValueError, TypeError):
        return None

    return user if user.is_active else None


class JWTCookieAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        token = extract_token(request)
        if not token:
            return None

        user = user_from_token(token)
        if user is None:
            raise exceptions.AuthenticationFailed('Token is not valid')
        return (user, token)

    def authenticate_header(self, request):
        """Make DRF answer 401 (not 403) when credentials are missing.

        The Express backend answered 401 and the frontend branches on it, so
        the status has to stay the same.
        """
        return 'Bearer realm="api"'

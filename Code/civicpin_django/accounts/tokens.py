"""Issue and verify the `civicpin_token` JWT used for API authentication."""

from datetime import datetime, timedelta, timezone

from django.conf import settings
import jwt


def build_payload(user):
    now = datetime.now(timezone.utc)
    return {
        'user': {
            'id': str(user.pk),
            'role': user.role,
        },
        'iat': int(now.timestamp()),
        'exp': int(
            (now + timedelta(hours=settings.JWT_EXPIRY_HOURS)).timestamp()
        ),
    }


def create_token(user):
    return jwt.encode(
        build_payload(user), settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token):
    """Return the decoded payload, or None if the token is invalid/expired."""
    if not token:
        return None
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        return None


def set_auth_cookie(response, user):
    """Attach the auth cookie to a response, mirroring the Node behaviour."""
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        create_token(user),
        max_age=settings.JWT_EXPIRY_HOURS * 60 * 60,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path='/',
    )
    return response


def clear_auth_cookie(response):
    response.delete_cookie(
        settings.AUTH_COOKIE_NAME,
        path='/',
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    return response

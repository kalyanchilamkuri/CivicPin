"""Request throttles for the abuse-prone endpoints.

Rates come from `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']` (see settings), and
counters are kept in the default cache.
"""

from rest_framework.throttling import SimpleRateThrottle


class _IPThrottle(SimpleRateThrottle):
    """Counts requests per client address, signed in or not."""

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class OTPThrottle(_IPThrottle):
    scope = 'otp'


class OTPVerifyThrottle(_IPThrottle):
    scope = 'otp_verify'


class AuthThrottle(_IPThrottle):
    scope = 'auth'


class AIThrottle(_IPThrottle):
    scope = 'ai'


class WriteThrottle(SimpleRateThrottle):
    """Per signed-in user (falling back to address) for create/vote/comment."""

    scope = 'write'

    def get_cache_key(self, request, view):
        user = getattr(request, 'user', None)
        ident = (
            str(user.pk)
            if user is not None and user.is_authenticated
            else self.get_ident(request)
        )
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class OTPEmailThrottle(SimpleRateThrottle):
    """Caps codes sent to one mailbox, so the endpoint can't be used to
    flood someone's inbox from many addresses."""

    scope = 'otp'

    def get_cache_key(self, request, view):
        email = ''
        data = getattr(request, 'data', None)
        if hasattr(data, 'get'):
            email = str(data.get('email') or '').strip().lower()
        if not email:
            return None
        return self.cache_format % {'scope': 'otp-email', 'ident': email}

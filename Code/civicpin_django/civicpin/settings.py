"""
Django settings for the CivicPin project.

Configuration is read from environment variables (optionally via a `.env` file
sitting next to `manage.py`), mirroring the way the previous Node backend was
configured.
"""

import hashlib
import hmac
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# Load `.env` from the project root (next to manage.py) if present.
load_dotenv(BASE_DIR / '.env')


def env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_list(name, default=None):
    raw = os.environ.get(name)
    if not raw:
        return list(default or [])
    return [item.strip() for item in raw.split(',') if item.strip()]


# --------------------------------------------------------------------------- #
# Core
# --------------------------------------------------------------------------- #

DEBUG = env_bool('DJANGO_DEBUG', True)

_DEV_SECRET_KEY = 'django-insecure-dev-only-change-me-in-production'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY') or _DEV_SECRET_KEY

if not DEBUG and SECRET_KEY == _DEV_SECRET_KEY:
    # Refuse to boot a production process on the publicly known dev key.
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off.'
    )

ALLOWED_HOSTS = env_list(
    'DJANGO_ALLOWED_HOSTS',
    ['localhost', '127.0.0.1', '[::1]', 'testserver'],
)

# JWT signing secret for the `civicpin_token` cookie. When JWT_SECRET is not
# set it is derived from SECRET_KEY with a purpose label, so the two keys are
# never identical and a leak of one does not hand over the other.
JWT_SECRET = os.environ.get('JWT_SECRET') or hmac.new(
    SECRET_KEY.encode(), b'civicpin.jwt', hashlib.sha256
).hexdigest()
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = int(os.environ.get('JWT_EXPIRY_HOURS', '10'))
AUTH_COOKIE_NAME = 'civicpin_token'
# Cross-site cookies need Secure+SameSite=None; for local HTTP development
# that combination is rejected by browsers, so relax it when DEBUG is on.
AUTH_COOKIE_SECURE = env_bool('AUTH_COOKIE_SECURE', not DEBUG)
AUTH_COOKIE_SAMESITE = os.environ.get(
    'AUTH_COOKIE_SAMESITE', 'Lax' if DEBUG else 'None'
)

# --------------------------------------------------------------------------- #
# Applications
# --------------------------------------------------------------------------- #

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'corsheaders',
    # Local
    'accounts',
    'demands',
    'properties',
    'ratings',
    'web',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'civicpin.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'web.context_processors.site_settings',
            ],
        },
    },
]

WSGI_APPLICATION = 'civicpin.wsgi.application'
ASGI_APPLICATION = 'civicpin.asgi.application'

# --------------------------------------------------------------------------- #
# Database
# --------------------------------------------------------------------------- #
# Defaults to SQLite so the project runs with zero setup. Point DATABASE_URL at
# PostgreSQL (postgres://user:pass@host:port/dbname) for a server deployment.

DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()

if DATABASE_URL.startswith(('postgres://', 'postgresql://')):
    from urllib.parse import unquote, urlparse

    parsed = urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/'),
            'USER': unquote(parsed.username or ''),
            'PASSWORD': unquote(parsed.password or ''),
            'HOST': parsed.hostname or 'localhost',
            'PORT': str(parsed.port or 5432),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --------------------------------------------------------------------------- #
# Authentication
# --------------------------------------------------------------------------- #

AUTH_USER_MODEL = 'accounts.User'

AUTHENTICATION_BACKENDS = ['accounts.backends.EmailBackend']

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.'
                'UserAttributeSimilarityValidator'
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 6},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
                'CommonPasswordValidator'
    },
    {
        'NAME': 'django.contrib.auth.password_validation.'
                'NumericPasswordValidator'
    },
]

LOGIN_URL = '/auth'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/landing'

# --------------------------------------------------------------------------- #
# REST framework
# --------------------------------------------------------------------------- #

# Per-scope request budgets, overridable from the environment, e.g.
# THROTTLE_OTP=5/min. Counters live in the cache, so use a shared cache
# (REDIS_URL) when running more than one worker.
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.JWTCookieAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'UNAUTHENTICATED_USER': 'django.contrib.auth.models.AnonymousUser',
    'EXCEPTION_HANDLER': 'civicpin.exceptions.api_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {
        'otp': os.environ.get('THROTTLE_OTP', '5/min'),
        'otp_verify': os.environ.get('THROTTLE_OTP_VERIFY', '15/min'),
        'auth': os.environ.get('THROTTLE_AUTH', '20/min'),
        'ai': os.environ.get('THROTTLE_AI', '20/min'),
        'write': os.environ.get('THROTTLE_WRITE', '60/min'),
    },
}

# Most rows a single list request may return. Clients page with
# `?limit=&offset=`; the total is sent in the `X-Total-Count` header.
API_DEFAULT_PAGE_SIZE = int(os.environ.get('API_DEFAULT_PAGE_SIZE', '500'))
API_MAX_PAGE_SIZE = int(os.environ.get('API_MAX_PAGE_SIZE', '1000'))
# Longest search radius `nearby` accepts, in metres.
API_MAX_RADIUS_M = float(os.environ.get('API_MAX_RADIUS_M', '200000'))
# Wrong OTP guesses allowed before the code is thrown away.
OTP_MAX_ATTEMPTS = int(os.environ.get('OTP_MAX_ATTEMPTS', '5'))

# --------------------------------------------------------------------------- #
# CORS / CSRF
# --------------------------------------------------------------------------- #

CORS_ALLOWED_ORIGINS = env_list(
    'CORS_ALLOWED_ORIGINS',
    [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'https://infra-crowd.vercel.app',
        'https://crowd-infra.vercel.app',
    ],
)
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['X-Total-Count']

CSRF_TRUSTED_ORIGINS = env_list(
    'CSRF_TRUSTED_ORIGINS',
    [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'https://infra-crowd.vercel.app',
        'https://crowd-infra.vercel.app',
    ],
)

# --------------------------------------------------------------------------- #
# Cache
# --------------------------------------------------------------------------- #
# OTP codes, throttle counters and AI analyses live here. The default
# per-process memory cache is only correct for a single worker; set REDIS_URL
# (and `pip install redis`) when running several.

REDIS_URL = os.environ.get('REDIS_URL', '').strip()

if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'civicpin',
        }
    }

# --------------------------------------------------------------------------- #
# Internationalization
# --------------------------------------------------------------------------- #

LANGUAGE_CODE = 'en-us'
TIME_ZONE = os.environ.get('TIME_ZONE', 'UTC')
USE_I18N = True
USE_TZ = True

# --------------------------------------------------------------------------- #
# Static & media files
# --------------------------------------------------------------------------- #

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/uploads/'
MEDIA_ROOT = BASE_DIR / 'uploads'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'
        if not DEBUG
        else 'django.contrib.staticfiles.storage.StaticFilesStorage',
    },
}

# --------------------------------------------------------------------------- #
# Third-party integrations
# --------------------------------------------------------------------------- #

GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')

# Transactional email (OTP delivery). One server-side account configured by
# whoever runs this backend — never something an individual user provides.
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.environ.get(
    'RESEND_FROM_EMAIL', 'CivicPin <onboarding@resend.dev>'
)

OTP_TTL_SECONDS = int(os.environ.get('OTP_TTL_SECONDS', '300'))

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'simple': {'format': '[{levelname}] {name}: {message}', 'style': '{'},
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.environ.get('DJANGO_LOG_LEVEL', 'INFO'),
    },
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True

    # HTTPS enforcement. Both default to on, and both need a working TLS
    # certificate — turn them off via the environment for a plain-HTTP
    # deployment behind something else that terminates TLS.
    SECURE_SSL_REDIRECT = env_bool('SECURE_SSL_REDIRECT', True)
    # Start HSTS low (one hour) and raise it once you are sure every
    # subdomain is HTTPS-only; the header is hard to walk back.
    SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '3600'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool(
        'SECURE_HSTS_INCLUDE_SUBDOMAINS', False
    )
    SECURE_HSTS_PRELOAD = env_bool('SECURE_HSTS_PRELOAD', False)
    # Container/load-balancer probes talk plain HTTP to the pod.
    SECURE_REDIRECT_EXEMPT = [r'^healthz$']

    # Subdomain coverage and preloading are deliberate opt-ins above: both
    # are hard to undo, so `check --deploy` should not nag about them.
    SILENCED_SYSTEM_CHECKS = [
        check
        for check, enabled in (
            ('security.W005', SECURE_HSTS_INCLUDE_SUBDOMAINS),
            ('security.W021', SECURE_HSTS_PRELOAD),
        )
        if not enabled
    ]

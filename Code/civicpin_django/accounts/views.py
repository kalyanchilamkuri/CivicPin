"""Authentication and user API endpoints.

Routes mirror the original Express backend one-for-one:

    POST /api/auth/signup      POST /api/auth/login     POST /api/auth/google
    GET  /api/auth/verify      POST /api/auth/logout
    POST /api/auth/sendOTP     POST /api/auth/verifyOTP
    GET  /api/user/profile
"""

import logging

from django.conf import settings
from django.contrib.auth import get_user_model, login as django_login, logout as django_logout
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import otp as otp_service
from .serializers import (
    EmailSerializer,
    GoogleCredentialSerializer,
    LoginSerializer,
    ProfileSerializer,
    SignupSerializer,
    UserSerializer,
    VerifyOtpSerializer,
)
from civicpin.throttles import (
    AuthThrottle,
    OTPEmailThrottle,
    OTPThrottle,
    OTPVerifyThrottle,
)

from .tokens import clear_auth_cookie, decode_token, set_auth_cookie

logger = logging.getLogger(__name__)
UserModel = get_user_model()

# Form fields the signup form posts as empty strings; DRF would reject those
# for typed fields, so they are dropped before validation.
_OPTIONAL_SIGNUP_FIELDS = ('age', 'gender', 'phone', 'address')


def first_error(serializer, fallback='Invalid request'):
    """Flatten DRF errors into the single `error` string clients expect."""
    for messages in serializer.errors.values():
        if isinstance(messages, (list, tuple)):
            if messages:
                return str(messages[0])
            continue
        return str(messages)
    return fallback


def clean_signup_data(data):
    cleaned = {
        key: value
        for key, value in data.items()
        if not (key in _OPTIONAL_SIGNUP_FIELDS and value in ('', None))
    }
    return cleaned


@api_view(['POST'])
@throttle_classes([OTPThrottle, OTPEmailThrottle])
def send_otp(request):
    serializer = EmailSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid email format'}, status=status.HTTP_400_BAD_REQUEST
        )

    message, error = otp_service.issue_code(serializer.validated_data['email'])
    if error:
        return Response(
            {'error': error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    return Response({'message': message})


@api_view(['POST'])
@throttle_classes([OTPVerifyThrottle])
def verify_otp(request):
    serializer = VerifyOtpSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Email and OTP are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = serializer.validated_data['email']
    verified, error = otp_service.verify_code(
        email, serializer.validated_data['otp']
    )
    if not verified:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {'verified': True, 'message': 'Email verified successfully'}
    )


@api_view(['POST'])
@throttle_classes([AuthThrottle])
def signup(request):
    data = clean_signup_data(request.data)
    serializer = SignupSerializer(data=data)
    if not serializer.is_valid():
        return Response(
            {'error': first_error(serializer), 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = serializer.validated_data['email']

    # The email must have been proven with an OTP before an account is created.
    if not otp_service.is_verified(email):
        return Response(
            {
                'error': 'Please verify your email with the OTP before '
                'signing up'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = serializer.save()
    otp_service.discard_code(email)
    otp_service.clear_verified(email)

    return Response(
        {
            'message': 'User registered successfully',
            'user': UserSerializer(user).data,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@throttle_classes([AuthThrottle])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = serializer.validated_data['email'].strip().lower()
    password = serializer.validated_data['password']

    user = UserModel.objects.filter(email__iexact=email).first()
    if user is None:
        return Response(
            {'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST
        )

    if user.auth_provider == UserModel.AUTH_GOOGLE:
        return Response(
            {
                'error': 'This account uses Google Sign-In. Please continue '
                'with Google.'
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(password) or not user.is_active:
        return Response(
            {'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST
        )

    response = Response(
        {
            'message': 'Login successful',
            'success': True,
            'user': UserSerializer(user).data,
        }
    )
    # The server-rendered pages rely on the Django session; the JSON API and
    # any external client rely on the JWT cookie. Both are established here.
    django_login(request, user, backend='accounts.backends.EmailBackend')
    return set_auth_cookie(response, user)


@api_view(['POST'])
@throttle_classes([AuthThrottle])
def google_login(request):
    serializer = GoogleCredentialSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Google credential is required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not settings.GOOGLE_CLIENT_ID:
        return Response(
            {'error': 'Google Sign-In is not configured on the server'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        payload = id_token.verify_oauth2_token(
            serializer.validated_data['credential'],
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:  # noqa: BLE001 - any failure is an auth failure
        logger.error('Google login error: %s', exc)
        return Response(
            {'error': 'Google authentication failed'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = (payload.get('email') or '').strip().lower()
    if not email:
        return Response(
            {'error': 'Invalid Google credential'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if payload.get('email_verified') is False:
        return Response(
            {'error': 'Google email is not verified'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    google_id = payload.get('sub')
    user = (
        UserModel.objects.filter(google_id=google_id).first()
        or UserModel.objects.filter(email__iexact=email).first()
    )

    if user is None:
        user = UserModel.objects.create_user(
            email=email,
            password=None,
            name=payload.get('name') or email.split('@')[0],
            auth_provider=UserModel.AUTH_GOOGLE,
            google_id=google_id,
        )
    elif not user.google_id:
        # Existing local account signing in with Google for the first time.
        user.google_id = google_id
        user.save(update_fields=['google_id', 'updated_at'])

    response = Response(
        {
            'message': 'Login successful',
            'success': True,
            'user': UserSerializer(user).data,
        }
    )
    django_login(request, user, backend='accounts.backends.EmailBackend')
    return set_auth_cookie(response, user)


@api_view(['GET'])
@authentication_classes([SessionAuthentication])
def verify(request):
    """Report whether the request carries a usable auth token.

    The JWT authenticator is deliberately left out here: an invalid token
    must produce the `{"valid": false}` body clients expect rather than a
    generic DRF authentication error. The session is still consulted so a
    server-rendered page without the cookie still reports correctly.
    """
    token = request.COOKIES.get(settings.AUTH_COOKIE_NAME) or request.META.get(
        'HTTP_X_AUTH_TOKEN'
    )

    if not token:
        if request.user.is_authenticated:
            return Response(
                {
                    'valid': True,
                    'user': {
                        'id': str(request.user.pk),
                        'role': request.user.role,
                    },
                }
            )
        return Response(
            {'valid': False, 'msg': 'No token provided'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    payload = decode_token(token)
    if not payload:
        return Response(
            {'valid': False, 'msg': 'Invalid token'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    return Response({'valid': True, 'user': payload.get('user')})


@api_view(['POST'])
def logout(request):
    response = Response(
        {'success': True, 'message': 'Logged out successfully'}
    )
    django_logout(request)
    return clear_auth_cookie(response)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    return Response(ProfileSerializer(request.user).data)

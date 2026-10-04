"""Tests for signup, OTP, login, Google sign-in, logout and profile."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from unittest import mock

from accounts import otp as otp_service
from accounts.tokens import create_token, decode_token

UserModel = get_user_model()


class UserModelTests(TestCase):
    def test_email_is_normalised_to_lowercase(self):
        user = UserModel.objects.create_user(
            email='  Mixed.Case@Example.COM ', password='secret123', name='Case'
        )
        self.assertEqual(user.email, 'mixed.case@example.com')

    def test_create_superuser_is_staff_and_admin_role(self):
        admin = UserModel.objects.create_superuser(
            email='admin@example.com', password='secret123'
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertEqual(admin.role, UserModel.ROLE_ADMIN)
        self.assertTrue(admin.is_admin)

    def test_google_user_has_no_usable_password(self):
        user = UserModel.objects.create_user(
            email='g@example.com',
            password=None,
            name='G',
            auth_provider=UserModel.AUTH_GOOGLE,
            google_id='google-123',
        )
        self.assertFalse(user.has_usable_password())

    def test_profile_image_url_is_blank_when_unset(self):
        user = UserModel.objects.create_user(
            email='noimage@example.com', password='secret123', name='No Image'
        )
        self.assertEqual(user.profile_image_url, '')


class TokenTests(TestCase):
    def setUp(self):
        self.user = UserModel.objects.create_user(
            email='token@example.com', password='secret123', name='Token'
        )

    def test_round_trip_carries_id_and_role(self):
        payload = decode_token(create_token(self.user))
        self.assertEqual(payload['user']['id'], str(self.user.pk))
        self.assertEqual(payload['user']['role'], self.user.role)

    def test_tampered_token_is_rejected(self):
        self.assertIsNone(decode_token(create_token(self.user) + 'x'))

    def test_token_signed_with_another_secret_is_rejected(self):
        token = create_token(self.user)
        # At least 32 bytes, so PyJWT does not warn about a weak HMAC key.
        other_secret = 'another-secret-long-enough-for-sha256-hmac'
        with override_settings(JWT_SECRET=other_secret):
            self.assertIsNone(decode_token(token))


class OtpServiceTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_development_fallback_uses_fixed_code(self):
        with override_settings(DEBUG=True, RESEND_API_KEY=''):
            message, error = otp_service.issue_code('dev@example.com')
        self.assertIsNone(error)
        self.assertIn('123456', message)
        self.assertEqual(
            otp_service.peek_code('dev@example.com'),
            otp_service.DEV_FALLBACK_OTP,
        )

    def test_production_without_email_service_refuses(self):
        with override_settings(DEBUG=False, RESEND_API_KEY=''):
            message, error = otp_service.issue_code('prod@example.com')
        self.assertIsNone(message)
        self.assertIn('not configured', error)
        self.assertIsNone(otp_service.peek_code('prod@example.com'))

    def test_wrong_code_is_rejected_and_does_not_mark_verified(self):
        otp_service.store_code('x@example.com', '111111')
        verified, error = otp_service.verify_code('x@example.com', '222222')
        self.assertFalse(verified)
        self.assertEqual(error, 'Invalid OTP')
        self.assertFalse(otp_service.is_verified('x@example.com'))

    def test_correct_code_marks_email_verified(self):
        otp_service.store_code('y@example.com', '333333')
        verified, error = otp_service.verify_code('y@example.com', ' 333333 ')
        self.assertTrue(verified)
        self.assertIsNone(error)
        self.assertTrue(otp_service.is_verified('y@example.com'))

    def test_verify_without_a_request_reports_expiry(self):
        verified, error = otp_service.verify_code('never@example.com', '000000')
        self.assertFalse(verified)
        self.assertIn('expired', error)

    def test_generated_codes_are_six_digits(self):
        for _ in range(50):
            code = otp_service.generate_code()
            self.assertEqual(len(code), 6)
            self.assertTrue(code.isdigit())
            self.assertGreaterEqual(int(code), 100000)

    def test_resend_delivery_posts_to_the_api(self):
        with override_settings(DEBUG=False, RESEND_API_KEY='re_test'), mock.patch(
            'accounts.otp.requests.post'
        ) as post:
            post.return_value = mock.Mock(
                status_code=200, content=b'{}', json=lambda: {}
            )
            message, error = otp_service.issue_code('mail@example.com')

        self.assertIsNone(error)
        self.assertEqual(message, 'OTP sent successfully')
        self.assertEqual(post.call_args.args[0], otp_service.RESEND_ENDPOINT)

    def test_delivery_failure_discards_the_code(self):
        with override_settings(DEBUG=False, RESEND_API_KEY='re_test'), mock.patch(
            'accounts.otp.requests.post'
        ) as post:
            post.return_value = mock.Mock(
                status_code=422, content=b'nope', text='nope'
            )
            message, error = otp_service.issue_code('fail@example.com')

        self.assertIsNone(message)
        self.assertIn('Failed to send OTP', error)
        self.assertIsNone(otp_service.peek_code('fail@example.com'))


class SignupApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse('auth:signup')

    def payload(self, **overrides):
        data = {
            'name': 'New User',
            'email': 'new@example.com',
            'password': 'secret123',
            'phone': '9876543210',
            'address': 'Somewhere',
            'gender': 'Other',
            'age': '30',
        }
        data.update(overrides)
        return data

    def test_signup_requires_a_verified_email(self):
        response = self.client.post(self.url, self.payload())
        self.assertEqual(response.status_code, 400)
        self.assertIn('verify your email', response.json()['error'])
        self.assertFalse(UserModel.objects.exists())

    def test_signup_succeeds_after_verification(self):
        otp_service.mark_verified('new@example.com')
        response = self.client.post(self.url, self.payload())

        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body['user']['email'], 'new@example.com')
        self.assertEqual(body['user']['age'], 30)

        user = UserModel.objects.get(email='new@example.com')
        self.assertTrue(user.check_password('secret123'))
        self.assertEqual(user.auth_provider, UserModel.AUTH_LOCAL)
        # The verification is consumed, so it cannot be reused.
        self.assertFalse(otp_service.is_verified('new@example.com'))

    def test_blank_optional_fields_are_accepted(self):
        otp_service.mark_verified('blank@example.com')
        response = self.client.post(
            self.url,
            self.payload(
                email='blank@example.com', age='', gender='', phone='', address=''
            ),
        )
        self.assertEqual(response.status_code, 201, response.content)
        user = UserModel.objects.get(email='blank@example.com')
        self.assertIsNone(user.age)
        self.assertEqual(user.gender, '')

    def test_duplicate_email_is_rejected(self):
        UserModel.objects.create_user(
            email='new@example.com', password='secret123', name='Existing'
        )
        otp_service.mark_verified('new@example.com')
        response = self.client.post(self.url, self.payload())
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'User already exists')

    def test_short_password_is_rejected(self):
        otp_service.mark_verified('new@example.com')
        response = self.client.post(self.url, self.payload(password='abc'))
        self.assertEqual(response.status_code, 400)
        self.assertIn('at least 6', response.json()['error'])

    def test_invalid_email_is_rejected(self):
        response = self.client.post(self.url, self.payload(email='not-an-email'))
        self.assertEqual(response.status_code, 400)

    def test_send_otp_rejects_a_malformed_address(self):
        response = self.client.post(
            reverse('auth:send-otp'), {'email': 'nope'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'Invalid email format')

    def test_otp_endpoints_round_trip(self):
        with override_settings(DEBUG=True, RESEND_API_KEY=''):
            send = self.client.post(
                reverse('auth:send-otp'),
                {'email': 'flow@example.com'},
                content_type='application/json',
            )
        self.assertEqual(send.status_code, 200)

        verify = self.client.post(
            reverse('auth:verify-otp'),
            {'email': 'flow@example.com', 'otp': '123456'},
            content_type='application/json',
        )
        self.assertEqual(verify.status_code, 200)
        self.assertTrue(verify.json()['verified'])


class LoginApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='login@example.com', password='secret123', name='Login'
        )
        self.url = reverse('auth:login')

    def test_login_sets_the_auth_cookie(self):
        response = self.client.post(
            self.url,
            {'email': 'login@example.com', 'password': 'secret123'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['success'])

        cookie = response.cookies.get(settings.AUTH_COOKIE_NAME)
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie['httponly'])

        payload = decode_token(cookie.value)
        self.assertEqual(payload['user']['id'], str(self.user.pk))

    def test_login_is_case_insensitive_on_email(self):
        response = self.client.post(
            self.url,
            {'email': 'LOGIN@example.com', 'password': 'secret123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

    def test_wrong_password_is_rejected(self):
        response = self.client.post(
            self.url,
            {'email': 'login@example.com', 'password': 'wrong-password'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'Invalid credentials')

    def test_unknown_email_is_rejected(self):
        response = self.client.post(
            self.url,
            {'email': 'nobody@example.com', 'password': 'secret123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'Invalid credentials')

    def test_google_account_cannot_use_password_login(self):
        UserModel.objects.create_user(
            email='goog@example.com',
            password=None,
            name='Goog',
            auth_provider=UserModel.AUTH_GOOGLE,
            google_id='sub-1',
        )
        response = self.client.post(
            self.url,
            {'email': 'goog@example.com', 'password': 'whatever'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('Google Sign-In', response.json()['error'])

    def test_logout_clears_the_cookie(self):
        self.client.post(
            self.url,
            {'email': 'login@example.com', 'password': 'secret123'},
            content_type='application/json',
        )
        response = self.client.post(reverse('auth:logout'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.cookies[settings.AUTH_COOKIE_NAME].value, '')


class VerifyEndpointTests(TestCase):
    def setUp(self):
        self.user = UserModel.objects.create_user(
            email='verify@example.com', password='secret123', name='Verify'
        )
        self.url = reverse('auth:verify')

    def test_no_token_is_unauthorised(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json()['valid'])

    def test_valid_token_is_accepted(self):
        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['valid'])
        self.assertEqual(response.json()['user']['id'], str(self.user.pk))

    def test_garbage_token_is_rejected(self):
        self.client.cookies[settings.AUTH_COOKIE_NAME] = 'not-a-jwt'
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)


class ProfileApiTests(TestCase):
    def setUp(self):
        self.user = UserModel.objects.create_user(
            email='profile@example.com',
            password='secret123',
            name='Profile',
            phone='9000000000',
            address='Indiranagar, Bengaluru',
        )
        self.url = reverse('user:profile')

    def test_profile_requires_authentication(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_profile_returns_the_current_user(self):
        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['email'], 'profile@example.com')
        self.assertEqual(body['phone'], '9000000000')
        self.assertNotIn('password', body)
        self.assertEqual(body['demands_raised'], [])
        self.assertEqual(body['properties_created'], [])
        self.assertEqual(body['recentActivity'], [])

    def test_profile_works_with_the_bearer_header(self):
        response = self.client.get(
            self.url,
            headers={'authorization': f'Bearer {create_token(self.user)}'},
        )
        self.assertEqual(response.status_code, 200)

    def test_profile_works_with_the_x_auth_token_header(self):
        response = self.client.get(
            self.url, headers={'x-auth-token': create_token(self.user)}
        )
        self.assertEqual(response.status_code, 200)

    def test_profile_includes_related_records_and_activity(self):
        from demands.models import Demand
        from properties.models import Property

        Demand.objects.create(
            user=self.user,
            title='Clinic needed',
            description='Nothing within 5 km.',
            latitude=12.97,
            longitude=77.59,
            category='healthcare',
        )
        Property.objects.create(
            owner=self.user,
            title='Shop unit',
            description='Road-facing.',
            category='commercial',
            type='rent',
            price=50000,
            area=800,
            contact_number='9000000000',
            latitude=12.97,
            longitude=77.59,
        )

        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(self.user)
        body = self.client.get(self.url).json()

        self.assertEqual(len(body['demands_raised']), 1)
        self.assertEqual(len(body['properties_created']), 1)
        self.assertEqual(len(body['recentActivity']), 2)
        actions = {event['action'] for event in body['recentActivity']}
        self.assertEqual(actions, {'Raised a demand', 'Listed a property'})


class GoogleLoginApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse('auth:google-login')

    def test_missing_credential_is_rejected(self):
        response = self.client.post(
            self.url, {}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID='')
    def test_unconfigured_server_reports_clearly(self):
        response = self.client.post(
            self.url, {'credential': 'x'}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 500)
        self.assertIn('not configured', response.json()['error'])

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_first_sign_in_creates_the_account(self):
        with mock.patch(
            'google.oauth2.id_token.verify_oauth2_token',
            return_value={
                'email': 'gnew@example.com',
                'email_verified': True,
                'sub': 'sub-99',
                'name': 'G New',
            },
        ):
            response = self.client.post(
                self.url,
                {'credential': 'token'},
                content_type='application/json',
            )

        self.assertEqual(response.status_code, 200, response.content)
        user = UserModel.objects.get(email='gnew@example.com')
        self.assertEqual(user.auth_provider, UserModel.AUTH_GOOGLE)
        self.assertEqual(user.google_id, 'sub-99')
        self.assertIn(settings.AUTH_COOKIE_NAME, response.cookies)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_existing_local_account_is_linked(self):
        local = UserModel.objects.create_user(
            email='both@example.com', password='secret123', name='Both'
        )

        with mock.patch(
            'google.oauth2.id_token.verify_oauth2_token',
            return_value={
                'email': 'both@example.com',
                'email_verified': True,
                'sub': 'sub-link',
                'name': 'Both',
            },
        ):
            response = self.client.post(
                self.url,
                {'credential': 'token'},
                content_type='application/json',
            )

        self.assertEqual(response.status_code, 200)
        local.refresh_from_db()
        self.assertEqual(local.google_id, 'sub-link')
        # The password still works; the account was linked, not converted.
        self.assertEqual(local.auth_provider, UserModel.AUTH_LOCAL)
        self.assertEqual(UserModel.objects.count(), 1)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_unverified_google_email_is_rejected(self):
        with mock.patch(
            'google.oauth2.id_token.verify_oauth2_token',
            return_value={
                'email': 'unverified@example.com',
                'email_verified': False,
                'sub': 'sub-u',
            },
        ):
            response = self.client.post(
                self.url,
                {'credential': 'token'},
                content_type='application/json',
            )
        self.assertEqual(response.status_code, 401)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_invalid_credential_is_rejected(self):
        with mock.patch(
            'google.oauth2.id_token.verify_oauth2_token',
            side_effect=ValueError('bad token'),
        ):
            response = self.client.post(
                self.url,
                {'credential': 'token'},
                content_type='application/json',
            )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()['error'], 'Google authentication failed'
        )

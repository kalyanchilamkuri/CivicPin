"""Tests for the cross-cutting hardening: throttling, pagination, geo
parameter validation, OTP attempt limits, query counts and the health probe."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from accounts import otp as otp_service
from accounts.tokens import create_token
from demands.models import Demand

UserModel = get_user_model()


def make_demand(user, title='Demand', lat=12.9716, lng=77.5946, **extra):
    return Demand.objects.create(
        user=user,
        title=title,
        description='Needed here.',
        latitude=lat,
        longitude=lng,
        category='other',
        **extra,
    )


class HealthCheckTests(TestCase):
    def test_healthz_reports_ok(self):
        response = self.client.get(reverse('healthz'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})

    def test_api_root_does_not_leak_debug_flag(self):
        self.assertNotIn('debug', self.client.get(reverse('api-root')).json())


class ThrottleTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_send_otp_is_rate_limited_with_an_error_message(self):
        url = reverse('auth:send-otp')
        statuses = [
            self.client.post(
                url, {'email': 'spam@example.com'}, content_type='application/json'
            )
            for _ in range(8)
        ]
        codes = [r.status_code for r in statuses]
        self.assertIn(429, codes)
        limited = next(r for r in statuses if r.status_code == 429)
        self.assertIn('error', limited.json())

    def test_send_otp_limit_is_per_mailbox_not_just_per_address(self):
        url = reverse('auth:send-otp')
        for _ in range(5):
            self.client.post(
                url, {'email': 'victim@example.com'},
                content_type='application/json',
                REMOTE_ADDR='10.0.0.1',
            )
        # A different client address still can't flood the same inbox.
        response = self.client.post(
            url, {'email': 'victim@example.com'},
            content_type='application/json',
            REMOTE_ADDR='10.0.0.2',
        )
        self.assertEqual(response.status_code, 429)

    @override_settings(
        REST_FRAMEWORK={
            **settings.REST_FRAMEWORK,
            'DEFAULT_THROTTLE_RATES': {
                **settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'],
                'write': '2/min',
            },
        }
    )
    def test_writes_are_limited_per_user(self):
        # Throttle rates are read when the class is first used, so reset the
        # cached class attribute to pick up the override.
        from civicpin.throttles import WriteThrottle

        original = WriteThrottle.THROTTLE_RATES
        self.addCleanup(setattr, WriteThrottle, 'THROTTLE_RATES', original)
        WriteThrottle.THROTTLE_RATES = settings.REST_FRAMEWORK[
            'DEFAULT_THROTTLE_RATES'
        ]
        user = UserModel.objects.create_user(
            email='w@example.com', password='secret123', name='W'
        )
        demand = make_demand(user)
        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(user)
        url = reverse('demand-comments', args=[demand.pk])

        codes = [
            self.client.post(
                url, {'text': f'c{i}'}, content_type='application/json'
            ).status_code
            for i in range(4)
        ]
        self.assertEqual(codes[:2], [201, 201])
        self.assertEqual(codes[2], 429)


class OtpAttemptLimitTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(OTP_MAX_ATTEMPTS=3)
    def test_code_is_burned_after_too_many_wrong_guesses(self):
        otp_service.store_code('a@example.com', '111111')

        for _ in range(2):
            ok, error = otp_service.verify_code('a@example.com', '000000')
            self.assertFalse(ok)
            self.assertEqual(error, 'Invalid OTP')

        ok, error = otp_service.verify_code('a@example.com', '000000')
        self.assertFalse(ok)
        self.assertIn('Too many', error)

        # Even the right code no longer works: a new one must be requested.
        ok, _ = otp_service.verify_code('a@example.com', '111111')
        self.assertFalse(ok)

    def test_correct_code_still_verifies_after_a_few_misses(self):
        otp_service.store_code('b@example.com', '222222')
        otp_service.verify_code('b@example.com', '000000')
        ok, error = otp_service.verify_code('b@example.com', '222222')
        self.assertTrue(ok, error)


class GeoParamTests(TestCase):
    def setUp(self):
        cache.clear()
        self.url = reverse('demand-nearby')

    def get(self, **params):
        return self.client.get(self.url, params)

    def test_missing_coordinates(self):
        self.assertEqual(self.client.get(self.url).status_code, 400)

    def test_non_numeric_values(self):
        self.assertEqual(self.get(latitude='x', longitude='1').status_code, 400)

    def test_nan_and_infinity_are_rejected(self):
        self.assertEqual(self.get(latitude='nan', longitude='1').status_code, 400)
        self.assertEqual(
            self.get(latitude='1', longitude='1', radius='inf').status_code, 400
        )

    def test_out_of_range_coordinates(self):
        self.assertEqual(self.get(latitude='91', longitude='0').status_code, 400)
        self.assertEqual(self.get(latitude='0', longitude='181').status_code, 400)

    def test_non_positive_radius(self):
        self.assertEqual(
            self.get(latitude='1', longitude='1', radius='0').status_code, 400
        )
        self.assertEqual(
            self.get(latitude='1', longitude='1', radius='-5').status_code, 400
        )

    def test_huge_radius_is_clamped_not_rejected(self):
        response = self.get(latitude='1', longitude='1', radius='99999999999')
        self.assertEqual(response.status_code, 200)

    def test_properties_nearby_uses_same_validation(self):
        response = self.client.get(
            reverse('property-nearby'), {'latitude': '999', 'longitude': '0'}
        )
        self.assertEqual(response.status_code, 400)


class NearbyBoundingBoxTests(TestCase):
    """The lat/lng pre-filter must never drop a row the exact filter keeps."""

    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='geo2@example.com', password='secret123', name='Geo'
        )

    def titles(self, lat, lng, radius):
        return [
            d.title for d in Demand.objects.near(lat, lng, radius)
        ]

    def test_finds_rows_inside_and_skips_rows_outside(self):
        make_demand(self.user, 'inside', 12.9800, 77.6000)  # ~1.1 km
        make_demand(self.user, 'outside', 13.1000, 77.6000)  # ~14 km
        self.assertEqual(self.titles(12.9716, 77.5946, 5000), ['inside'])

    def test_results_are_ordered_nearest_first(self):
        make_demand(self.user, 'b', 12.9900, 77.5946)
        make_demand(self.user, 'a', 12.9730, 77.5946)
        self.assertEqual(self.titles(12.9716, 77.5946, 5000), ['a', 'b'])

    def test_search_across_the_antimeridian(self):
        make_demand(self.user, 'east', 0.0, 179.9995)
        make_demand(self.user, 'west', 0.0, -179.9995)
        found = self.titles(0.0, 179.9995, 5000)
        self.assertIn('east', found)
        self.assertIn('west', found)

    def test_search_at_the_pole(self):
        make_demand(self.user, 'pole', 89.99, 10.0)
        self.assertEqual(self.titles(89.99, -170.0, 5000), ['pole'])

    def test_east_west_distance_is_not_over_pruned_at_high_latitude(self):
        # At 60N a degree of longitude is ~55 km, so 0.4 deg ~ 22 km.
        make_demand(self.user, 'hi-lat', 60.0, 10.4)
        self.assertEqual(self.titles(60.0, 10.0, 30000), ['hi-lat'])


class PaginationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='page@example.com', password='secret123', name='Pager'
        )
        for i in range(7):
            make_demand(self.user, f'D{i}')
        self.url = reverse('demand-list')

    def test_default_returns_everything_with_total_header(self):
        response = self.client.get(self.url)
        self.assertEqual(len(response.json()), 7)
        self.assertEqual(response['X-Total-Count'], '7')

    def test_limit_and_offset(self):
        response = self.client.get(self.url, {'limit': 3, 'offset': 2})
        self.assertEqual(len(response.json()), 3)
        self.assertEqual(response['X-Total-Count'], '7')

    def test_offset_past_the_end_is_empty(self):
        response = self.client.get(self.url, {'offset': 100})
        self.assertEqual(response.json(), [])

    def test_garbage_paging_values_fall_back_to_defaults(self):
        response = self.client.get(self.url, {'limit': 'abc', 'offset': '-4'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 7)

    @override_settings(API_MAX_PAGE_SIZE=2)
    def test_limit_is_capped(self):
        response = self.client.get(self.url, {'limit': 50})
        self.assertEqual(len(response.json()), 2)

    def test_reviews_list_keeps_data_envelope_and_paginates(self):
        from ratings.models import Rating

        for i in range(3):
            Rating.objects.create(
                email=f'r{i}@example.com', rating=5, review='Nice'
            )
        response = self.client.get(reverse('rating-list'), {'limit': 2})
        self.assertEqual(len(response.json()['data']), 2)
        self.assertEqual(response['X-Total-Count'], '3')


class QueryCountTests(TestCase):
    """Listing must not issue a query per demand (the old upvotedBy N+1)."""

    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='q@example.com', password='secret123', name='Q'
        )
        self.url = reverse('demand-list')

    def count_queries(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as ctx:
            self.client.get(self.url)
        return len(ctx)

    def test_query_count_does_not_grow_with_row_count(self):
        for i in range(2):
            d = make_demand(self.user, f'a{i}')
            d.upvoted_by.add(self.user)
        small = self.count_queries()

        for i in range(15):
            d = make_demand(self.user, f'b{i}')
            d.upvoted_by.add(self.user)
        large = self.count_queries()

        self.assertEqual(small, large)


class UpvoteToggleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='u@example.com', password='secret123', name='U'
        )
        self.demand = make_demand(self.user)

    def test_toggle_twice_returns_to_start(self):
        self.assertTrue(self.demand.toggle_upvote(self.user))
        self.demand.refresh_from_db()
        self.assertEqual(self.demand.up_votes, 1)

        self.assertFalse(self.demand.toggle_upvote(self.user))
        self.demand.refresh_from_db()
        self.assertEqual(self.demand.up_votes, 0)
        self.assertEqual(self.demand.upvoted_by.count(), 0)

    def test_total_matches_distinct_voters(self):
        others = [
            UserModel.objects.create_user(
                email=f'v{i}@example.com', password='secret123', name='V'
            )
            for i in range(3)
        ]
        for voter in others:
            self.demand.toggle_upvote(voter)
        self.demand.refresh_from_db()
        self.assertEqual(self.demand.up_votes, 3)


class CommentLengthTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='c@example.com', password='secret123', name='C'
        )
        self.demand = make_demand(self.user)
        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(self.user)

    def test_overlong_comment_is_rejected(self):
        response = self.client.post(
            reverse('demand-comments', args=[self.demand.pk]),
            {'text': 'x' * 1001},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_comment_at_the_limit_is_accepted(self):
        response = self.client.post(
            reverse('demand-comments', args=[self.demand.pk]),
            {'text': 'x' * 1000},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)


class SecretSeparationTests(TestCase):
    def test_jwt_secret_differs_from_django_secret(self):
        self.assertNotEqual(settings.JWT_SECRET, settings.SECRET_KEY)

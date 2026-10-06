"""Tests for demand creation, listing, proximity search, upvotes, comments
and the AI analysis endpoint."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from unittest import mock

from accounts.tokens import create_token
from demands.models import Comment, Demand

UserModel = get_user_model()

# Bengaluru landmarks, roughly 1 km and 1,700 km from the query point.
NEAR = (12.9716, 77.5946)
FAR = (28.6139, 77.2090)


class DemandModelTests(TestCase):
    def setUp(self):
        self.user = UserModel.objects.create_user(
            email='owner@example.com', password='secret123', name='Owner'
        )
        self.voter = UserModel.objects.create_user(
            email='voter@example.com', password='secret123', name='Voter'
        )
        self.demand = Demand.objects.create(
            user=self.user,
            title='Clinic needed',
            description='Nothing within 5 km.',
            latitude=NEAR[0],
            longitude=NEAR[1],
            category='healthcare',
        )

    def test_coordinates_are_geojson_ordered(self):
        self.assertEqual(self.demand.coordinates, [NEAR[1], NEAR[0]])

    def test_defaults(self):
        self.assertEqual(self.demand.status, Demand.STATUS_NOT_FULFILLED)
        self.assertEqual(self.demand.up_votes, 1)

    def test_toggle_upvote_adds_then_removes(self):
        self.assertTrue(self.demand.toggle_upvote(self.voter))
        self.assertEqual(self.demand.up_votes, 1)
        self.assertTrue(self.demand.upvoted_by.filter(pk=self.voter.pk).exists())

        self.assertFalse(self.demand.toggle_upvote(self.voter))
        self.assertEqual(self.demand.up_votes, 0)
        self.assertFalse(
            self.demand.upvoted_by.filter(pk=self.voter.pk).exists()
        )

    def test_vote_count_is_recomputed_not_incremented(self):
        # Deliberately corrupt the cached total, then toggle.
        Demand.objects.filter(pk=self.demand.pk).update(up_votes=99)
        self.demand.refresh_from_db()
        self.demand.toggle_upvote(self.voter)
        self.assertEqual(self.demand.up_votes, 1)

    def test_two_voters_are_counted_separately(self):
        self.demand.toggle_upvote(self.user)
        self.demand.toggle_upvote(self.voter)
        self.assertEqual(self.demand.up_votes, 2)


class DistanceQueryTests(TestCase):
    def setUp(self):
        self.user = UserModel.objects.create_user(
            email='geo@example.com', password='secret123', name='Geo'
        )
        self.near = Demand.objects.create(
            user=self.user,
            title='Near',
            description='x',
            latitude=NEAR[0],
            longitude=NEAR[1],
            category='other',
        )
        self.far = Demand.objects.create(
            user=self.user,
            title='Far',
            description='x',
            latitude=FAR[0],
            longitude=FAR[1],
            category='other',
        )

    def test_distance_annotation_is_accurate(self):
        rows = {
            row.title: row.distance
            for row in Demand.objects.with_distance_from(12.9800, 77.6000)
        }
        # ~1.1 km to the near demand, ~1,739 km to Delhi.
        self.assertAlmostEqual(rows['Near'], 1102, delta=60)
        self.assertAlmostEqual(rows['Far'], 1738884, delta=5000)

    def test_radius_filter_excludes_distant_rows(self):
        results = Demand.objects.near(12.9800, 77.6000, 5000)
        self.assertEqual([row.title for row in results], ['Near'])

    def test_results_are_ordered_nearest_first(self):
        results = Demand.objects.near(12.9800, 77.6000, 5_000_000)
        self.assertEqual([row.title for row in results], ['Near', 'Far'])

    def test_identical_point_has_zero_distance(self):
        row = (
            Demand.objects.with_distance_from(NEAR[0], NEAR[1])
            .filter(pk=self.near.pk)
            .first()
        )
        self.assertAlmostEqual(row.distance, 0, delta=1)


class DemandApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='api@example.com', password='secret123', name='Api User'
        )
        self.other = UserModel.objects.create_user(
            email='other@example.com', password='secret123', name='Other'
        )
        self.create_url = reverse('demand-create')

    def authenticate(self, user=None):
        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(
            user or self.user
        )

    def payload(self, **overrides):
        data = {
            'title': 'Street lights on 5th Cross',
            'description': 'The stretch is unlit after 7pm.',
            'category': 'infrastructure',
            'location': {'type': 'Point', 'coordinates': [NEAR[1], NEAR[0]]},
        }
        data.update(overrides)
        return data

    def post_demand(self, **overrides):
        return self.client.post(
            self.create_url,
            self.payload(**overrides),
            content_type='application/json',
        )

    def test_creating_a_demand_requires_authentication(self):
        response = self.post_demand()
        self.assertEqual(response.status_code, 401)
        self.assertFalse(Demand.objects.exists())

    def test_create_demand(self):
        self.authenticate()
        response = self.post_demand()

        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()['demand']
        self.assertEqual(body['title'], 'Street lights on 5th Cross')
        self.assertEqual(
            body['location'], {'type': 'Point', 'coordinates': [NEAR[1], NEAR[0]]}
        )
        self.assertEqual(body['up_votes'], 1)
        self.assertEqual(body['status'], 'not_fulfilled')
        self.assertEqual(body['userName'], 'Api User')

        demand = Demand.objects.get()
        self.assertEqual(demand.user, self.user)
        # The author's own vote is recorded, as in the original backend.
        self.assertTrue(demand.upvoted_by.filter(pk=self.user.pk).exists())

    def test_missing_coordinates_are_rejected(self):
        self.authenticate()
        response = self.post_demand(location={'type': 'Point'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid location', response.json()['error'])

    def test_one_dimensional_coordinates_are_rejected(self):
        self.authenticate()
        response = self.post_demand(
            location={'type': 'Point', 'coordinates': [77.5]}
        )
        self.assertEqual(response.status_code, 400)

    def test_out_of_range_coordinates_are_rejected(self):
        self.authenticate()
        response = self.post_demand(
            location={'type': 'Point', 'coordinates': [400, 100]}
        )
        self.assertEqual(response.status_code, 400)

    def test_non_numeric_coordinates_are_rejected(self):
        self.authenticate()
        response = self.post_demand(
            location={'type': 'Point', 'coordinates': ['east', 'north']}
        )
        self.assertEqual(response.status_code, 400)

    def test_unknown_category_is_rejected(self):
        self.authenticate()
        response = self.post_demand(category='teleportation')
        self.assertEqual(response.status_code, 400)

    def test_list_demands(self):
        self.authenticate()
        self.post_demand()
        self.post_demand(title='Second', category='utilities')

        response = self.client.get(reverse('demand-list'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_list_demands_is_public(self):
        self.authenticate()
        self.post_demand()
        self.client.cookies.clear()

        response = self.client.get(reverse('demand-list'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_list_demands_filters_by_category(self):
        self.authenticate()
        self.post_demand()
        self.post_demand(title='Water', category='utilities')

        response = self.client.get(
            reverse('demand-list'), {'category': 'utilities'}
        )
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['title'], 'Water')

    def test_demand_detail(self):
        self.authenticate()
        demand_id = self.post_demand().json()['demand']['_id']

        response = self.client.get(
            reverse('demand-detail', args=[demand_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['_id'], demand_id)
        self.assertIn('no-store', response['Cache-Control'])

    def test_missing_demand_is_a_404(self):
        response = self.client.get(reverse('demand-detail', args=['999999']))
        self.assertEqual(response.status_code, 404)

    def test_non_numeric_id_is_a_404_not_a_crash(self):
        response = self.client.get(
            reverse('demand-detail', args=['67d98063b77f07757feacb1f'])
        )
        self.assertEqual(response.status_code, 404)

    def test_nearby_requires_coordinates(self):
        response = self.client.get(reverse('demand-nearby'))
        self.assertEqual(response.status_code, 400)
        self.assertIn('required', response.json()['error'])

    def test_nearby_rejects_non_numeric_input(self):
        response = self.client.get(
            reverse('demand-nearby'),
            {'latitude': 'north', 'longitude': 'east'},
        )
        self.assertEqual(response.status_code, 400)

    def test_nearby_returns_only_demands_in_radius(self):
        self.authenticate()
        self.post_demand()
        self.post_demand(
            title='Delhi demand',
            location={'type': 'Point', 'coordinates': [FAR[1], FAR[0]]},
        )

        response = self.client.get(
            reverse('demand-nearby'),
            {'latitude': 12.98, 'longitude': 77.60, 'radius': 5000},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]['title'], 'Street lights on 5th Cross')
        self.assertIsNotNone(body[0]['distance'])

    def test_upvote_toggles_for_a_second_user(self):
        self.authenticate()
        demand_id = self.post_demand().json()['demand']['_id']

        self.authenticate(self.other)
        url = reverse('demand-upvote', args=[demand_id])

        added = self.client.patch(url, {}, content_type='application/json')
        self.assertEqual(added.status_code, 200)
        self.assertTrue(added.json()['upvoted'])
        self.assertEqual(added.json()['data']['up_votes'], 2)

        removed = self.client.patch(url, {}, content_type='application/json')
        self.assertFalse(removed.json()['upvoted'])
        self.assertEqual(removed.json()['data']['up_votes'], 1)

    def test_upvote_requires_authentication(self):
        self.authenticate()
        demand_id = self.post_demand().json()['demand']['_id']
        self.client.cookies.clear()

        response = self.client.patch(
            reverse('demand-upvote', args=[demand_id]),
            {},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_upvote_on_a_missing_demand_is_a_404(self):
        self.authenticate()
        response = self.client.patch(
            reverse('demand-upvote', args=['999999']),
            {},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 404)

    def test_add_comment(self):
        self.authenticate()
        demand_id = self.post_demand().json()['demand']['_id']

        response = self.client.post(
            reverse('demand-comments', args=[demand_id]),
            {'text': 'Backing this.'},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()
        self.assertEqual(body['comment']['text'], 'Backing this.')
        self.assertEqual(body['comment']['userName'], 'Api User')
        self.assertEqual(len(body['demand']['comments']), 1)
        self.assertEqual(Comment.objects.count(), 1)

    def test_blank_comment_is_rejected(self):
        self.authenticate()
        demand_id = self.post_demand().json()['demand']['_id']

        response = self.client.post(
            reverse('demand-comments', args=[demand_id]),
            {'text': '   '},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Comment.objects.count(), 0)

    def test_comment_requires_authentication(self):
        self.authenticate()
        demand_id = self.post_demand().json()['demand']['_id']
        self.client.cookies.clear()

        response = self.client.post(
            reverse('demand-comments', args=[demand_id]),
            {'text': 'Anonymous'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_comments_are_returned_in_order(self):
        self.authenticate()
        demand_id = self.post_demand().json()['demand']['_id']
        url = reverse('demand-comments', args=[demand_id])

        for text in ('first', 'second', 'third'):
            self.client.post(url, {'text': text}, content_type='application/json')

        body = self.client.get(reverse('demand-detail', args=[demand_id])).json()
        self.assertEqual(
            [comment['text'] for comment in body['comments']],
            ['first', 'second', 'third'],
        )

    def test_serializer_exposes_both_id_spellings(self):
        self.authenticate()
        body = self.post_demand().json()['demand']
        self.assertEqual(body['_id'], body['id'])


class DemandAnalysisTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='ai@example.com', password='secret123', name='AI'
        )
        self.demand = Demand.objects.create(
            user=self.user,
            title='Pharmacy needed',
            description='No chemist within 4 km.',
            latitude=NEAR[0],
            longitude=NEAR[1],
            category='healthcare',
        )
        self.url = reverse('demand-analysis', args=[self.demand.pk])

    @override_settings(GEMINI_API_KEY='')
    def test_unconfigured_key_reports_clearly(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 502)
        self.assertIn('not configured', response.json()['error'])

    @override_settings(GEMINI_API_KEY='test-key')
    def test_successful_analysis_is_returned_and_cached(self):
        gemini_json = (
            '{"competitiveAnalysis": "Two chemists 4 km away.",'
            ' "marketPotential": "High footfall.",'
            ' "resourceRequirements": "Pharmacist, licence, 400 sq ft.",'
            ' "successFactors": "Extended hours.",'
            ' "summary": "Viable."}'
        )

        with mock.patch('demands.ai.requests.post') as post:
            post.return_value = mock.Mock(
                status_code=200,
                json=lambda: {
                    'candidates': [
                        {'content': {'parts': [{'text': gemini_json}]}}
                    ]
                },
            )
            first = self.client.get(self.url)
            second = self.client.get(self.url)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()['summary'], 'Viable.')
        self.assertEqual(second.json(), first.json())
        # The second read came from the cache, so Gemini was called once.
        self.assertEqual(post.call_count, 1)

    @override_settings(GEMINI_API_KEY='test-key')
    def test_non_json_reply_is_surfaced_not_swallowed(self):
        with mock.patch('demands.ai.requests.post') as post:
            post.return_value = mock.Mock(
                status_code=200,
                json=lambda: {
                    'candidates': [
                        {'content': {'parts': [{'text': 'not json at all'}]}}
                    ]
                },
            )
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn('Could not parse JSON', body['error'])
        self.assertEqual(body['text'], 'not json at all')

    @override_settings(GEMINI_API_KEY='test-key')
    def test_upstream_error_is_a_bad_gateway(self):
        with mock.patch('demands.ai.requests.post') as post:
            post.return_value = mock.Mock(status_code=500, text='boom')
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, 502)

    @override_settings(GEMINI_API_KEY='test-key')
    def test_network_failure_is_a_bad_gateway(self):
        import requests

        with mock.patch(
            'demands.ai.requests.post',
            side_effect=requests.ConnectionError('offline'),
        ):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, 502)

    @override_settings(GEMINI_API_KEY='test-key')
    def test_api_key_is_sent_as_a_query_parameter_not_a_header(self):
        with mock.patch('demands.ai.requests.post') as post:
            post.return_value = mock.Mock(
                status_code=200,
                json=lambda: {
                    'candidates': [{'content': {'parts': [{'text': '{}'}]}}]
                },
            )
            self.client.get(self.url)

        self.assertEqual(post.call_args.kwargs['params'], {'key': 'test-key'})

    def test_analysis_for_a_missing_demand_is_a_404(self):
        response = self.client.get(reverse('demand-analysis', args=['999999']))
        self.assertEqual(response.status_code, 404)

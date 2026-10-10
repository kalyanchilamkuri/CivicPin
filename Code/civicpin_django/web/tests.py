"""Tests for the server-rendered pages, the API root and the seed command."""

from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.urls import reverse

from demands.models import Comment, Demand
from properties.models import Property
from ratings.models import Rating

UserModel = get_user_model()


class PublicPageTests(TestCase):
    def test_landing_page_renders(self):
        response = self.client.get(reverse('web:landing'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'web/landing.html')
        self.assertContains(response, 'CivicPin')

    def test_auth_page_renders_in_signup_mode_by_default(self):
        response = self.client.get(reverse('web:auth'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['initial_mode'], 'signup')
        self.assertContains(response, 'Create Account')

    def test_auth_page_honours_the_login_mode(self):
        response = self.client.get(reverse('web:auth'), {'mode': 'login'})
        self.assertEqual(response.context['initial_mode'], 'login')

    def test_auth_page_redirects_a_signed_in_user_home(self):
        user = UserModel.objects.create_user(
            email='in@example.com', password='secret123', name='In'
        )
        self.client.force_login(user)
        response = self.client.get(reverse('web:auth'))
        self.assertRedirects(response, reverse('web:home'))

    def test_search_demands_page_is_public(self):
        response = self.client.get(reverse('web:search-demands'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Search Demands')
        # Every category is offered in the filter.
        for _, label in Demand.CATEGORY_CHOICES:
            self.assertContains(response, label)

    def test_viewrequest_page_passes_the_id_through(self):
        response = self.client.get(reverse('web:viewrequest'), {'id': '42'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context['demand_id'], '42')

    def test_terms_page_renders(self):
        response = self.client.get(reverse('web:terms'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Terms and Conditions')
        self.assertContains(response, 'Account Registration')

    def test_rating_page_is_public(self):
        response = self.client.get(reverse('web:rating'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Leave a Review')

    def test_rating_page_prefills_an_existing_review(self):
        user = UserModel.objects.create_user(
            email='reviewer@example.com', password='secret123', name='Rev'
        )
        Rating.objects.create(
            email='reviewer@example.com', rating=4, review='Prefilled text.'
        )
        self.client.force_login(user)

        response = self.client.get(reverse('web:rating'))
        self.assertEqual(response.context['existing'].rating, 4)
        self.assertContains(response, 'Prefilled text.')

    def test_unknown_url_renders_the_404_page(self):
        response = self.client.get('/no-such-page')
        self.assertEqual(response.status_code, 404)
        self.assertContains(response, 'Page', status_code=404)


class ProtectedPageTests(TestCase):
    def setUp(self):
        self.user = UserModel.objects.create_user(
            email='member@example.com',
            password='secret123',
            name='Member',
            address='Indiranagar, Bengaluru',
        )

    def test_home_requires_login(self):
        response = self.client.get(reverse('web:home'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/auth', response['Location'])

    def test_home_renders_for_a_member(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('web:home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Nearby Demands')

    def test_home_lists_reviews(self):
        Rating.objects.create(
            email='someone@example.com', rating=5, review='A quotable review.'
        )
        self.client.force_login(self.user)
        response = self.client.get(reverse('web:home'))
        self.assertContains(response, 'A quotable review.')

    def test_home_without_reviews_says_so(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('web:home'))
        self.assertContains(response, 'No reviews available.')

    def test_raise_request_requires_login(self):
        response = self.client.get(reverse('web:raise-request'))
        self.assertEqual(response.status_code, 302)

    def test_raise_request_renders_every_category(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('web:raise-request'))
        self.assertEqual(response.status_code, 200)
        for value, _ in Demand.CATEGORY_CHOICES:
            self.assertContains(response, f'value="{value}"')

    def test_property_page_requires_login(self):
        response = self.client.get(reverse('web:property'))
        self.assertEqual(response.status_code, 302)

    def test_property_page_renders_choices(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('web:property'))
        self.assertEqual(response.status_code, 200)
        for value, _ in Property.TYPE_CHOICES:
            self.assertContains(response, f'value="{value}"')

    def test_profile_requires_login(self):
        response = self.client.get(reverse('web:profile'))
        self.assertEqual(response.status_code, 302)

    def test_profile_renders_the_user_details(self):
        self.client.force_login(self.user)
        response = self.client.get(reverse('web:profile'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'member@example.com')
        self.assertContains(response, 'Indiranagar, Bengaluru')


class TemplateContextTests(TestCase):
    @override_settings(
        GOOGLE_MAPS_API_KEY='mapskey123', GEMINI_API_KEY='aikey456'
    )
    def test_public_keys_reach_the_page(self):
        # Alphanumeric values only: `escapejs` rewrites punctuation such as
        # hyphens, which would make a substring assertion misleading.
        response = self.client.get(reverse('web:landing'))
        self.assertContains(response, 'mapskey123')
        # The Gemini key is server-side only and must never be rendered.
        self.assertNotContains(response, 'aikey456')

    @override_settings(GOOGLE_MAPS_API_KEY='', GEMINI_API_KEY='')
    def test_feature_flags_are_false_without_keys(self):
        response = self.client.get(reverse('web:landing'))
        self.assertContains(response, 'mapsEnabled: false')
        self.assertContains(response, 'aiEnabled: false')


class ApiRootTests(TestCase):
    def test_api_root_reports_status(self):
        response = self.client.get(reverse('api-root'))
        self.assertEqual(response.status_code, 200)

        body = response.json()
        self.assertEqual(body['status'], 'OK')
        self.assertIn('Django', body['framework'])
        self.assertIn('auth', body['endpoints'])


class SeedCommandTests(TestCase):
    def test_seed_creates_demo_records(self):
        call_command('seed_demo_data', stdout=StringIO())

        self.assertEqual(UserModel.objects.count(), 3)
        self.assertEqual(Demand.objects.count(), 6)
        self.assertEqual(Property.objects.count(), 4)
        self.assertEqual(Rating.objects.count(), 3)
        self.assertGreater(Comment.objects.count(), 0)

    def test_seed_is_idempotent(self):
        call_command('seed_demo_data', stdout=StringIO())
        call_command('seed_demo_data', stdout=StringIO())

        self.assertEqual(UserModel.objects.count(), 3)
        self.assertEqual(Demand.objects.count(), 6)
        self.assertEqual(Property.objects.count(), 4)

    def test_seeded_users_can_sign_in(self):
        call_command('seed_demo_data', stdout=StringIO())

        response = self.client.post(
            reverse('auth:login'),
            {'email': 'asha@example.com', 'password': 'civicpin123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_flush_clears_previous_rows(self):
        call_command('seed_demo_data', stdout=StringIO())
        Demand.objects.create(
            user=UserModel.objects.first(),
            title='Extra demand',
            description='x',
            latitude=12.9,
            longitude=77.6,
            category='other',
        )
        self.assertEqual(Demand.objects.count(), 7)

        call_command('seed_demo_data', '--flush', stdout=StringIO())
        self.assertEqual(Demand.objects.count(), 6)

    def test_seeded_demands_are_findable_by_proximity(self):
        call_command('seed_demo_data', stdout=StringIO())

        # Domlur, Bengaluru — the first two demo demands sit nearby.
        results = Demand.objects.near(12.9611, 77.6387, 6000)
        self.assertGreaterEqual(results.count(), 2)

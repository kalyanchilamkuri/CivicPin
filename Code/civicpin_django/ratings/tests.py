"""Tests for the customer review endpoints."""

from django.core.cache import cache
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from accounts.tokens import create_token
from ratings.models import Rating

UserModel = get_user_model()


class RatingModelTests(TestCase):
    def test_email_is_normalised(self):
        rating = Rating.objects.create(
            email='  Mixed@Example.COM ', rating=4, review='Good.'
        )
        self.assertEqual(rating.email, 'mixed@example.com')

    def test_newest_first_ordering(self):
        Rating.objects.create(email='a@example.com', rating=5, review='First.')
        second = Rating.objects.create(
            email='b@example.com', rating=4, review='Second.'
        )
        self.assertEqual(Rating.objects.first(), second)


class RatingApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.submit_url = reverse('rating-submit')
        self.list_url = reverse('rating-list')

    def submit(self, **overrides):
        data = {
            'email': 'guest@example.com',
            'rating': 5,
            'review': 'The map view makes the gaps obvious.',
        }
        data.update(overrides)
        return self.client.post(
            self.submit_url, data, content_type='application/json'
        )

    def test_submit_creates_a_review(self):
        response = self.submit()

        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(
            response.json()['message'], 'Review added successfully.'
        )
        self.assertEqual(Rating.objects.count(), 1)

    def test_resubmitting_updates_rather_than_duplicates(self):
        self.submit()
        response = self.submit(rating=3, review='Updated thoughts.')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()['message'], 'Review updated successfully.'
        )
        self.assertEqual(Rating.objects.count(), 1)

        rating = Rating.objects.get()
        self.assertEqual(rating.rating, 3)
        self.assertEqual(rating.review, 'Updated thoughts.')

    def test_rating_above_five_is_rejected(self):
        response = self.submit(rating=6)
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Rating.objects.exists())

    def test_rating_below_one_is_rejected(self):
        self.assertEqual(self.submit(rating=0).status_code, 400)

    def test_blank_review_is_rejected(self):
        response = self.submit(review='   ')
        self.assertEqual(response.status_code, 400)
        self.assertIn('required', response.json()['error'])

    def test_missing_fields_are_rejected(self):
        response = self.client.post(
            self.submit_url, {}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_email_is_rejected(self):
        self.assertEqual(self.submit(email='not-an-email').status_code, 400)

    def test_a_signed_in_user_cannot_review_as_someone_else(self):
        user = UserModel.objects.create_user(
            email='me@example.com', password='secret123', name='Me'
        )
        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(user)

        response = self.submit(email='someone.else@example.com')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Rating.objects.get().email, 'me@example.com')

    def test_list_reviews(self):
        self.submit()
        self.submit(email='other@example.com', rating=4, review='Solid.')

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)

        body = response.json()['data']
        self.assertEqual(len(body), 2)
        self.assertIn('createdAt', body[0])
        # Newest first, and the address is masked for the public list.
        self.assertEqual(body[0]['email'], 'ot***@example.com')
        self.assertNotIn('other@example.com', response.content.decode())

    def test_list_reviews_when_empty(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data'], [])

"""Tests for property listing creation, retrieval and proximity search."""

from decimal import Decimal

from django.core.cache import cache
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from accounts.tokens import create_token
from properties.models import Property

UserModel = get_user_model()

NEAR = (12.9716, 77.5946)
FAR = (28.6139, 77.2090)


class PropertyModelTests(TestCase):
    def setUp(self):
        self.user = UserModel.objects.create_user(
            email='owner@example.com', password='secret123', name='Owner'
        )

    def make(self, **overrides):
        data = {
            'owner': self.user,
            'title': 'Shop unit',
            'description': 'Road-facing.',
            'category': 'commercial',
            'type': 'rent',
            'price': Decimal('50000.00'),
            'area': 800,
            'contact_number': '9876543210',
            'latitude': NEAR[0],
            'longitude': NEAR[1],
        }
        data.update(overrides)
        return Property.objects.create(**data)

    def test_coordinates_are_geojson_ordered(self):
        self.assertEqual(self.make().coordinates, [NEAR[1], NEAR[0]])

    def test_status_defaults_to_available(self):
        self.assertEqual(self.make().status, 'available')

    def test_distance_helpers_are_inherited(self):
        self.make(title='Near')
        self.make(title='Far', latitude=FAR[0], longitude=FAR[1])

        results = Property.objects.near(12.98, 77.60, 5000)
        self.assertEqual([row.title for row in results], ['Near'])


class PropertyApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = UserModel.objects.create_user(
            email='api@example.com', password='secret123', name='Api Owner'
        )
        self.create_url = reverse('property-create')

    def authenticate(self):
        self.client.cookies[settings.AUTH_COOKIE_NAME] = create_token(self.user)

    def payload(self, **overrides):
        data = {
            'title': 'Ground-floor commercial space',
            'description': '1,400 sq ft with road frontage.',
            'category': 'commercial',
            'type': 'rent',
            'price': 95000,
            'area': 1400,
            'contactNumber': '9876543210',
            'status': 'available',
            'location': {'type': 'Point', 'coordinates': [NEAR[1], NEAR[0]]},
        }
        data.update(overrides)
        return data

    def post_property(self, **overrides):
        return self.client.post(
            self.create_url,
            self.payload(**overrides),
            content_type='application/json',
        )

    def test_creating_a_listing_requires_authentication(self):
        self.assertEqual(self.post_property().status_code, 401)
        self.assertFalse(Property.objects.exists())

    def test_create_listing(self):
        self.authenticate()
        response = self.post_property()

        self.assertEqual(response.status_code, 201, response.content)
        body = response.json()['property']
        self.assertEqual(body['title'], 'Ground-floor commercial space')
        self.assertEqual(body['contactNumber'], '9876543210')
        self.assertEqual(
            body['location'],
            {'type': 'Point', 'coordinates': [NEAR[1], NEAR[0]]},
        )
        self.assertEqual(body['ownerName'], 'Api Owner')
        self.assertEqual(Property.objects.get().owner, self.user)

    def test_nine_digit_contact_number_is_rejected(self):
        self.authenticate()
        response = self.post_property(contactNumber='987654321')
        self.assertEqual(response.status_code, 400)
        self.assertIn('10 digits', response.json()['error'])

    def test_non_numeric_contact_number_is_rejected(self):
        self.authenticate()
        response = self.post_property(contactNumber='98765abcde')
        self.assertEqual(response.status_code, 400)

    def test_negative_price_is_rejected(self):
        self.authenticate()
        response = self.post_property(price=-5)
        self.assertEqual(response.status_code, 400)

    def test_zero_area_is_rejected(self):
        self.authenticate()
        response = self.post_property(area=0)
        self.assertEqual(response.status_code, 400)

    def test_unknown_category_is_rejected(self):
        self.authenticate()
        response = self.post_property(category='spaceport')
        self.assertEqual(response.status_code, 400)

    def test_unknown_type_is_rejected(self):
        self.authenticate()
        response = self.post_property(type='barter')
        self.assertEqual(response.status_code, 400)

    def test_invalid_location_is_rejected(self):
        self.authenticate()
        response = self.post_property(location={'type': 'Point'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid location', response.json()['error'])

    def test_list_properties_is_public(self):
        self.authenticate()
        self.post_property()
        self.client.cookies.clear()

        response = self.client.get(reverse('property-list'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_list_filters_by_category_and_type(self):
        self.authenticate()
        self.post_property()
        self.post_property(
            title='Plot', category='land', type='sell', area=2800
        )

        by_category = self.client.get(
            reverse('property-list'), {'category': 'land'}
        )
        self.assertEqual(len(by_category.json()), 1)
        self.assertEqual(by_category.json()[0]['title'], 'Plot')

        by_type = self.client.get(reverse('property-list'), {'type': 'rent'})
        self.assertEqual(len(by_type.json()), 1)
        self.assertEqual(
            by_type.json()[0]['title'], 'Ground-floor commercial space'
        )

    def test_property_detail(self):
        self.authenticate()
        property_id = self.post_property().json()['property']['_id']

        response = self.client.get(
            reverse('property-detail', args=[property_id])
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['_id'], property_id)

    def test_missing_property_is_a_404(self):
        response = self.client.get(reverse('property-detail', args=['999999']))
        self.assertEqual(response.status_code, 404)

    def test_mongo_style_id_is_a_404_not_a_crash(self):
        response = self.client.get(
            reverse('property-detail', args=['67d98063b77f07757feacb1f'])
        )
        self.assertEqual(response.status_code, 404)

    def test_nearby_requires_coordinates(self):
        response = self.client.get(reverse('property-nearby'))
        self.assertEqual(response.status_code, 400)

    def test_nearby_returns_only_listings_in_radius(self):
        self.authenticate()
        self.post_property()
        self.post_property(
            title='Delhi plot',
            location={'type': 'Point', 'coordinates': [FAR[1], FAR[0]]},
        )

        response = self.client.get(
            reverse('property-nearby'),
            {'latitude': 12.98, 'longitude': 77.60, 'radius': 5000},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]['title'], 'Ground-floor commercial space')
        self.assertIsNotNone(body[0]['distance'])

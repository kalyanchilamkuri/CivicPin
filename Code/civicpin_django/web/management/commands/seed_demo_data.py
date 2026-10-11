"""Populate the database with demo users, demands, properties and reviews.

    python manage.py seed_demo_data
    python manage.py seed_demo_data --flush   # wipe the demo rows first

Useful for trying the UI without hand-entering data. Safe to re-run: records
are matched on a natural key and updated in place.
"""

import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from demands.models import Comment, Demand
from properties.models import Property
from ratings.models import Rating

UserModel = get_user_model()

DEMO_PASSWORD = 'civicpin123'

DEMO_USERS = [
    {
        'email': 'asha@example.com',
        'name': 'Asha Menon',
        'phone': '9876543210',
        'address': 'Indiranagar, Bengaluru, Karnataka',
        'gender': 'Female',
        'age': 32,
    },
    {
        'email': 'rahul@example.com',
        'name': 'Rahul Verma',
        'phone': '9123456780',
        'address': 'Connaught Place, New Delhi',
        'gender': 'Male',
        'age': 41,
    },
    {
        'email': 'priya@example.com',
        'name': 'Priya Nair',
        'phone': '9988776655',
        'address': 'Bandra West, Mumbai, Maharashtra',
        'gender': 'Female',
        'age': 27,
    },
]

DEMO_DEMANDS = [
    {
        'title': 'Primary health centre needed near Domlur',
        'description': (
            'The nearest clinic is 6 km away and the bus takes 40 minutes. '
            'A primary health centre here would serve roughly 8,000 residents '
            'across four neighbourhoods.'
        ),
        'category': 'healthcare',
        'latitude': 12.9611,
        'longitude': 77.6387,
    },
    {
        'title': 'Street lighting on the Marathahalli service road',
        'description': (
            'The 1.2 km stretch has no working lights. Pedestrians share the '
            'carriageway with traffic after dark.'
        ),
        'category': 'infrastructure',
        'latitude': 12.9569,
        'longitude': 77.7011,
    },
    {
        'title': 'Public ATM cluster at Koramangala 5th Block',
        'description': (
            'Shopkeepers and students queue at a single machine. Two or three '
            'ATMs near the junction would clear the backlog.'
        ),
        'category': 'public_service',
        'latitude': 12.9345,
        'longitude': 77.6260,
    },
    {
        'title': 'Feeder bus route to Yeshwanthpur station',
        'description': (
            'No direct service connects the residential blocks to the railway '
            'station; auto fares are prohibitive for daily commuters.'
        ),
        'category': 'transportation',
        'latitude': 13.0234,
        'longitude': 77.5520,
    },
    {
        'title': 'Government secondary school in Dwarka Sector 23',
        'description': (
            'Children travel to Sector 12 for classes IX-XII. A local school '
            'would cut a 50-minute commute for about 400 students.'
        ),
        'category': 'education',
        'latitude': 28.5733,
        'longitude': 77.0401,
    },
    {
        'title': 'Water treatment upgrade for Bandra East',
        'description': (
            'Supply is intermittent through summer and residents rely on '
            'tankers. The existing plant runs well over its rated capacity.'
        ),
        'category': 'utilities',
        'latitude': 19.0607,
        'longitude': 72.8470,
    },
]

DEMO_PROPERTIES = [
    {
        'title': 'Ground-floor commercial space, Domlur',
        'description': (
            '1,400 sq ft corner unit with road frontage, suited to a clinic or '
            'diagnostic centre. Parking for six vehicles.'
        ),
        'category': 'commercial',
        'type': 'rent',
        'price': 95000,
        'area': 1400,
        'contact_number': '9876543210',
        'latitude': 12.9625,
        'longitude': 77.6402,
        'status': 'available',
    },
    {
        'title': 'Warehouse shell near Marathahalli',
        'description': (
            '6,000 sq ft clear-span shed with 24 ft eaves, three-phase power '
            'and container access.'
        ),
        'category': 'industrial',
        'type': 'lease',
        'price': 220000,
        'area': 6000,
        'contact_number': '9123456780',
        'latitude': 12.9580,
        'longitude': 77.7025,
        'status': 'up_for_renting',
    },
    {
        'title': 'Corner plot, Dwarka Sector 23',
        'description': (
            '2,800 sq ft east-facing plot, clear title, approved for '
            'institutional use.'
        ),
        'category': 'land',
        'type': 'sell',
        'price': 14500000,
        'area': 2800,
        'contact_number': '9988776655',
        'latitude': 28.5740,
        'longitude': 77.0415,
        'status': 'available',
    },
    {
        'title': '3BHK apartment, Bandra West',
        'description': (
            'Sea-facing flat on the 11th floor, 1,650 sq ft, covered parking '
            'and 24-hour backup.'
        ),
        'category': 'residential',
        'type': 'sell',
        'price': 62000000,
        'area': 1650,
        'contact_number': '9988776655',
        'latitude': 19.0548,
        'longitude': 72.8301,
        'status': 'available',
    },
]

DEMO_COMMENTS = [
    'Backing this — my family has the same problem every week.',
    'Shared with the residents association; we can collect more signatures.',
    'The ward officer visited last month but nothing came of it.',
    'Happy to help with a site survey if that moves this along.',
    'This would make a real difference for the evening shift workers.',
]

DEMO_REVIEWS = [
    {
        'email': 'asha@example.com',
        'rating': 5,
        'review': (
            'Pinned a demand for a health centre and had 40 upvotes in a week. '
            'The ward office finally has data it can act on.'
        ),
    },
    {
        'email': 'rahul@example.com',
        'rating': 4,
        'review': (
            'The map view makes it obvious where the gaps are. Would love '
            'filters by ward boundary next.'
        ),
    },
    {
        'email': 'priya@example.com',
        'rating': 5,
        'review': (
            'Listed a commercial space and got three enquiries from businesses '
            'that saw the matching demand nearby.'
        ),
    },
]


class Command(BaseCommand):
    help = 'Seed the database with demo users, demands, properties and reviews.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete existing demands, properties and reviews first.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(20251010)

        if options['flush']:
            Comment.objects.all().delete()
            Demand.objects.all().delete()
            Property.objects.all().delete()
            Rating.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared existing demo rows.'))

        users = []
        for spec in DEMO_USERS:
            user, created = UserModel.objects.get_or_create(
                email=spec['email'], defaults=spec
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()
            users.append(user)

        self.stdout.write(self.style.SUCCESS(f'{len(users)} demo users ready.'))

        demands = []
        for index, spec in enumerate(DEMO_DEMANDS):
            demand, created = Demand.objects.get_or_create(
                title=spec['title'],
                defaults={**spec, 'user': users[index % len(users)]},
            )
            if created:
                # Give each demand a plausible vote count and a few comments.
                voters = random.sample(users, k=random.randint(1, len(users)))
                demand.upvoted_by.set(voters)
                demand.up_votes = len(voters)
                demand.save(update_fields=['up_votes', 'updated_at'])

                for text in random.sample(
                    DEMO_COMMENTS, k=random.randint(1, 3)
                ):
                    Comment.objects.create(
                        demand=demand,
                        user=random.choice(users),
                        text=text,
                    )
            demands.append(demand)

        self.stdout.write(
            self.style.SUCCESS(f'{len(demands)} demo demands ready.')
        )

        for index, spec in enumerate(DEMO_PROPERTIES):
            Property.objects.get_or_create(
                title=spec['title'],
                defaults={**spec, 'owner': users[index % len(users)]},
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'{len(DEMO_PROPERTIES)} demo properties ready.'
            )
        )

        for spec in DEMO_REVIEWS:
            Rating.objects.update_or_create(
                email=spec['email'],
                defaults={'rating': spec['rating'], 'review': spec['review']},
            )

        self.stdout.write(
            self.style.SUCCESS(f'{len(DEMO_REVIEWS)} demo reviews ready.')
        )
        self.stdout.write('')
        self.stdout.write(
            f'Sign in with any demo address above, password: {DEMO_PASSWORD}'
        )

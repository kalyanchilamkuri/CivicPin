"""Property listings offered by owners to businesses."""

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone

from demands.models import DemandQuerySet


class PropertyQuerySet(DemandQuerySet):
    """Reuses the haversine with_distance_from / near helpers."""


class Property(models.Model):
    CATEGORY_CHOICES = [
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
        ('industrial', 'Industrial'),
        ('land', 'Land'),
    ]

    TYPE_CHOICES = [
        ('sell', 'Sell'),
        ('rent', 'Rent'),
        ('lease', 'Lease'),
    ]

    STATUS_CHOICES = [
        ('available', 'Available'),
        ('up_for_renting', 'Up for renting'),
        ('rented', 'Rented'),
        ('sold', 'Sold'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='properties',
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    price = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(0)]
    )
    area = models.PositiveIntegerField(
        help_text='Area in square feet', validators=[MinValueValidator(1)]
    )
    contact_number = models.CharField(
        max_length=10,
        validators=[
            RegexValidator(
                r'^\d{10}$',
                'Invalid contact number. It must be 10 digits.',
            )
        ],
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='available'
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = PropertyQuerySet.as_manager()

    class Meta:
        verbose_name_plural = 'properties'
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['category']),
            models.Index(fields=['type']),
        ]

    def __str__(self):
        return self.title

    @property
    def coordinates(self):
        """GeoJSON ordering: [longitude, latitude]."""
        return [self.longitude, self.latitude]

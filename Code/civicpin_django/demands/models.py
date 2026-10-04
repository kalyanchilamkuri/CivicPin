"""Community infrastructure demands.

The original Mongoose schema stored a GeoJSON `location` point and ran
`$near` queries against a 2dsphere index. Here the point is kept as two float
columns and proximity search uses a great-circle (haversine) distance computed
in SQL — no GDAL/PostGIS install required, and the ordering matches `$near`.
"""

import math

from django.conf import settings
from django.db import models, transaction
from django.db.models import F, FloatField, Value
from django.db.models.functions import ACos, Cos, Least, Radians, Sin
from django.utils import timezone

EARTH_RADIUS_M = 6371008.8


class DemandQuerySet(models.QuerySet):
    def with_distance_from(self, latitude, longitude):
        """Annotate each row with `distance` in metres from the given point."""
        lat_rad = math.radians(float(latitude))
        lng_rad = math.radians(float(longitude))

        # Clamp to 1.0 so floating-point drift can't push ACos out of domain.
        cos_central_angle = Least(
            Sin(Value(lat_rad)) * Sin(Radians(F('latitude')))
            + Cos(Value(lat_rad))
            * Cos(Radians(F('latitude')))
            * Cos(Radians(F('longitude')) - Value(lng_rad)),
            Value(1.0),
            output_field=FloatField(),
        )
        return self.annotate(
            distance=ACos(cos_central_angle) * Value(EARTH_RADIUS_M)
        )

    def near(self, latitude, longitude, radius_m=5000):
        """Demands within `radius_m` metres, nearest first (like `$near`).

        A cheap latitude/longitude bounding box narrows the rows first (it can
        use the lat/lng index); the exact great-circle filter then trims the
        box's corners.
        """
        latitude, longitude = float(latitude), float(longitude)
        radius_m = float(radius_m)

        lat_delta = math.degrees(radius_m / EARTH_RADIUS_M)
        queryset = self.filter(
            latitude__gte=latitude - lat_delta,
            latitude__lte=latitude + lat_delta,
        )

        cos_lat = math.cos(math.radians(latitude))
        # Near a pole (or for a very wide box) longitude no longer narrows
        # anything, and the wrap-around at +/-180 would need two ranges.
        if cos_lat > 1e-6:
            lng_delta = math.degrees(radius_m / (EARTH_RADIUS_M * cos_lat))
            if lng_delta < 180 and not (
                longitude - lng_delta < -180 or longitude + lng_delta > 180
            ):
                queryset = queryset.filter(
                    longitude__gte=longitude - lng_delta,
                    longitude__lte=longitude + lng_delta,
                )

        return (
            queryset.with_distance_from(latitude, longitude)
            .filter(distance__lte=radius_m)
            .order_by('distance')
        )


class Demand(models.Model):
    CATEGORY_CHOICES = [
        ('infrastructure', 'Infrastructure'),
        ('public_service', 'Public Service'),
        ('transportation', 'Transportation'),
        ('utilities', 'Utilities'),
        ('education', 'Education'),
        ('healthcare', 'Healthcare'),
        ('other', 'Other'),
    ]

    STATUS_FULFILLED = 'fulfilled'
    STATUS_NOT_FULFILLED = 'not_fulfilled'
    STATUS_CHOICES = [
        (STATUS_FULFILLED, 'Fulfilled'),
        (STATUS_NOT_FULFILLED, 'Not fulfilled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='demands',
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    category = models.CharField(
        max_length=32, choices=CATEGORY_CHOICES, default='infrastructure'
    )
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default=STATUS_NOT_FULFILLED
    )
    up_votes = models.PositiveIntegerField(default=1)
    upvoted_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='upvoted_demands', blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = DemandQuerySet.as_manager()

    class Meta:
        # `-id` breaks ties when two demands share a timestamp.
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return self.title

    @property
    def coordinates(self):
        """GeoJSON ordering: [longitude, latitude]."""
        return [self.longitude, self.latitude]

    def toggle_upvote(self, user):
        """Add or remove `user`'s vote. Returns True when a vote was added."""
        through = self.upvoted_by.through
        with transaction.atomic():
            # Lock the demand row so two simultaneous toggles serialise
            # instead of both reading the same "no vote yet" state.
            Demand.objects.select_for_update().get(pk=self.pk)

            deleted, _ = through.objects.filter(
                demand_id=self.pk, user_id=user.pk
            ).delete()
            added = deleted == 0
            if added:
                through.objects.create(demand_id=self.pk, user_id=user.pk)

            # Recount from the join table so the stored total can't drift.
            self.up_votes = through.objects.filter(demand_id=self.pk).count()
            self.save(update_fields=['up_votes', 'updated_at'])
        return added


class Comment(models.Model):
    demand = models.ForeignKey(
        Demand, on_delete=models.CASCADE, related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='demand_comments',
    )
    text = models.TextField()
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp', 'id']

    def __str__(self):
        return f'{self.user_id} on {self.demand_id}'

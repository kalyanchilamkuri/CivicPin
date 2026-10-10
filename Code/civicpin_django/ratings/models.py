"""Customer reviews shown in the home page carousel."""

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Rating(models.Model):
    # One review per email address; submitting again updates the existing one.
    email = models.EmailField(unique=True)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # `-id` breaks ties when two reviews land in the same microsecond,
        # so the carousel order is stable.
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.email} ({self.rating}/5)'

    @property
    def masked_email(self):
        """`jo***@example.com` — safe to show publicly."""
        local, _, domain = self.email.partition('@')
        return f"{local[:2]}***@{domain}" if domain else '***'

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

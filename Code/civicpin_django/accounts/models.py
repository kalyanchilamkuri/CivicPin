"""User model for CivicPin.

Mirrors the fields of the original Mongoose `User` schema so existing clients
keep working, but backed by the Django ORM and `AbstractBaseUser`.
"""

import os
import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


def profile_image_path(instance, filename):
    """Store profile photos as `<user id><ext>`, as the Node backend did."""
    ext = os.path.splitext(filename)[1].lower() or '.jpg'
    return f'{instance.pk or uuid.uuid4().hex}{ext}'


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('An email address is required')
        email = self.normalize_email(email).strip().lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.ROLE_ADMIN)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        extra_fields.setdefault('name', email.split('@')[0])
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_USER = 0
    ROLE_ADMIN = 1
    ROLE_CHOICES = [
        (ROLE_USER, 'Normal user'),
        (ROLE_ADMIN, 'Admin'),
    ]

    AUTH_LOCAL = 'local'
    AUTH_GOOGLE = 'google'
    AUTH_PROVIDER_CHOICES = [
        (AUTH_LOCAL, 'Local'),
        (AUTH_GOOGLE, 'Google'),
    ]

    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    auth_provider = models.CharField(
        max_length=10, choices=AUTH_PROVIDER_CHOICES, default=AUTH_LOCAL
    )
    google_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True
    )
    phone = models.CharField(max_length=32, blank=True, default='')
    address = models.CharField(max_length=255, blank=True, default='')
    gender = models.CharField(
        max_length=10, choices=GENDER_CHOICES, blank=True, default=''
    )
    age = models.PositiveIntegerField(null=True, blank=True)
    role = models.IntegerField(choices=ROLE_CHOICES, default=ROLE_USER)
    profile_image = models.ImageField(
        upload_to=profile_image_path, blank=True, null=True
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.name} <{self.email}>'

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN

    @property
    def profile_image_url(self):
        """Public URL for the avatar, or '' when none is set."""
        if self.profile_image:
            try:
                return self.profile_image.url
            except ValueError:  # pragma: no cover - defensive
                return ''
        return ''

    def get_full_name(self):
        return self.name

    def get_short_name(self):
        return self.name.split(' ')[0] if self.name else self.email

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['-created_at']
    list_display = ['email', 'name', 'role', 'auth_provider', 'created_at']
    list_filter = ['role', 'auth_provider', 'is_staff', 'is_active']
    search_fields = ['email', 'name', 'phone']
    readonly_fields = ['created_at', 'updated_at', 'last_login']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (
            'Profile',
            {
                'fields': (
                    'name',
                    'phone',
                    'address',
                    'gender',
                    'age',
                    'profile_image',
                )
            },
        ),
        (
            'Access',
            {
                'fields': (
                    'role',
                    'auth_provider',
                    'google_id',
                    'is_active',
                    'is_staff',
                    'is_superuser',
                    'groups',
                    'user_permissions',
                )
            },
        ),
        ('Timestamps', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': ('email', 'name', 'password1', 'password2'),
            },
        ),
    )

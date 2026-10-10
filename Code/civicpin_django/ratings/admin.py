from django.contrib import admin

from .models import Rating


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ['email', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['email', 'review']
    readonly_fields = ['created_at', 'updated_at']

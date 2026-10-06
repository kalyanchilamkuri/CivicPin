from django.contrib import admin

from .models import Property


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'category',
        'type',
        'price',
        'area',
        'status',
        'owner',
        'created_at',
    ]
    list_filter = ['category', 'type', 'status', 'created_at']
    search_fields = ['title', 'description', 'contact_number']
    autocomplete_fields = ['owner']
    readonly_fields = ['created_at', 'updated_at']

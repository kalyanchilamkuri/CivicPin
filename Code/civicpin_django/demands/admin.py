from django.contrib import admin

from .models import Comment, Demand


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    readonly_fields = ['timestamp']
    autocomplete_fields = ['user']


@admin.register(Demand)
class DemandAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'category',
        'status',
        'up_votes',
        'user',
        'created_at',
    ]
    list_filter = ['category', 'status', 'created_at']
    search_fields = ['title', 'description']
    autocomplete_fields = ['user']
    filter_horizontal = ['upvoted_by']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [CommentInline]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['demand', 'user', 'timestamp']
    search_fields = ['text']
    autocomplete_fields = ['demand', 'user']

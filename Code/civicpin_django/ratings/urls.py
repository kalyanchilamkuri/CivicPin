"""URL routes for the review API."""

from django.urls import path

from . import views

urlpatterns = [
    path('rating', views.submit_rating, name='rating-submit'),
    path('reviews', views.list_reviews, name='rating-list'),
]

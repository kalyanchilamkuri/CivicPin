"""URL routes for the server-rendered pages."""

from django.urls import path

from . import views

app_name = 'web'

urlpatterns = [
    path('', views.home, name='home'),
    path('landing', views.landing, name='landing'),
    path('landing/', views.landing),
    path('auth', views.auth_page, name='auth'),
    path('auth/', views.auth_page),
    path('raise-request', views.raise_request, name='raise-request'),
    path('raise-request/', views.raise_request),
    path('property', views.property_page, name='property'),
    path('property/', views.property_page),
    path('search-demands', views.search_demands, name='search-demands'),
    path('search-demands/', views.search_demands),
    path('viewrequest', views.view_request, name='viewrequest'),
    path('viewrequest/', views.view_request),
    path('profile', views.profile, name='profile'),
    path('profile/', views.profile),
    path('rating', views.rating_page, name='rating'),
    path('rating/', views.rating_page),
    path('terms', views.terms, name='terms'),
    path('terms/', views.terms),
]

"""URL routes for the property API."""

from django.urls import path

from . import views

urlpatterns = [
    path('property', views.create_property, name='property-create'),
    path('getProperty', views.list_properties, name='property-list'),
    path(
        'getPropertyById/<str:property_id>',
        views.property_detail,
        name='property-detail',
    ),
    path('nearby', views.nearby_properties, name='property-nearby'),
]

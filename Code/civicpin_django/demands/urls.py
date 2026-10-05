"""URL routes for the demand API."""

from django.urls import path

from . import views

urlpatterns = [
    path('demand', views.create_demand, name='demand-create'),
    path('getDemand', views.list_demands, name='demand-list'),
    path(
        'getDemandById/<str:demand_id>',
        views.demand_detail,
        name='demand-detail',
    ),
    path('nearby', views.nearby_demands, name='demand-nearby'),
    path(
        '<str:demand_id>/upvote', views.toggle_upvote, name='demand-upvote'
    ),
    path(
        '<str:demand_id>/comments', views.add_comment, name='demand-comments'
    ),
    path(
        '<str:demand_id>/analysis',
        views.demand_analysis,
        name='demand-analysis',
    ),
]

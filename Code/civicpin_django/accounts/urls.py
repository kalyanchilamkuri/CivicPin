"""URL routes for the auth and user APIs."""

from django.urls import path

from . import views

auth_urlpatterns = [
    path('signup', views.signup, name='signup'),
    path('login', views.login, name='login'),
    path('google', views.google_login, name='google-login'),
    path('verify', views.verify, name='verify'),
    path('logout', views.logout, name='logout'),
    path('sendOTP', views.send_otp, name='send-otp'),
    path('verifyOTP', views.verify_otp, name='verify-otp'),
]

user_urlpatterns = [
    path('profile', views.profile, name='profile'),
]

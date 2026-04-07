from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('profile/', views.profile, name='profile'),
    path('account/edit/', views.account_edit, name='account_edit'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
]
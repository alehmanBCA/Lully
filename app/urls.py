from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('profile/', views.profile, name='profile'),
    path('account/edit/', views.account_edit, name='account_edit'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    
    path('monitor/<int:baby_id>/', views.monitor_dashboard, name='monitor_dashboard'),
    path('api/baby/<int:baby_id>/vitals/', views.api_latest_vitals, name='api_vitals'),
    # path('api/baby/<int:baby_id>/history/', views.baby_history_api, name='api_history'),
    
]

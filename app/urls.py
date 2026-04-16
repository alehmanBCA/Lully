from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/users/', views.admin_users, name='admin_users'),
    path('admin/users/<int:user_id>/toggle-active/', views.admin_toggle_active, name='admin_toggle_active'),
    path('admin/users/<int:user_id>/edit/', views.admin_edit_user, name='admin_edit_user'),
    path('profile/', views.profile, name='profile'),
    path('account/edit/', views.account_edit, name='account_edit'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    path('monitor/<int:baby_id>/', views.monitor_dashboard, name='monitor_dashboard'),
    path('api/baby/<int:baby_id>/vitals/', views.api_latest_vitals, name='api_vitals'),
    path('api/baby/<int:baby_id>/history/', views.baby_history_api, name='api_history'),
    path('delete_baby/<int:baby_id>/', views.delete_baby, name='delete_baby'),
    
]

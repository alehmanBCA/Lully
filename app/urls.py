from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('community/', views.community, name='community'),
    path('community/post/<int:post_id>/like/', views.like_post, name='community-like'),
    path('community/post/<int:post_id>/comment/', views.add_comment, name='community-comment'),
    path('community/post/<int:post_id>/delete/', views.delete_post, name='community-delete'),
    path('admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/users/', views.admin_users, name='admin_users'),
    path('admin/users/<int:user_id>/toggle-active/', views.admin_toggle_active, name='admin_toggle_active'),
    path('admin/users/<int:user_id>/edit/', views.admin_edit_user, name='admin_edit_user'),
    path('profile/', views.profile, name='profile'),
    path('account/edit/', views.account_edit, name='account_edit'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='/'), name='logout'),
    path('baby/<int:baby_id>/logs/', views.baby_logs, name='baby_logs'),
    path('api/baby/<int:baby_id>/timeline/', views.baby_timeline_api),
    path('api/quick-log/<int:baby_id>/', views.quick_log, name='quick_log'),
    path('api/baby/<int:baby_id>/feeding/save/', views.save_detailed_feeding, name='save_detailed_feeding'),
    path('api/baby/<int:baby_id>/diaper/detailed-save/', views.save_detailed_diaper, name='save_detailed_diaper'),
    path('api/baby/<int:baby_id>/sleep/detailed-save/', views.save_detailed_sleep, name='save_detailed_sleep'),
    path('api/baby/<int:baby_id>/growth/save/', views.save_detailed_growth, name='save_detailed_growth'),
    path('api/baby/<int:baby_id>/medical/notes/save/', views.save_medical_notes, name='save_medical_notes'),
    path('api/baby/<int:baby_id>/medical/medication/add/', views.add_medication, name='add_medication'),
    path('api/medication/<int:med_id>/delete/', views.delete_medication, name='delete_medication'),
    path('api/baby/<int:baby_id>/note/save/', views.save_daily_note, name='save_daily_note'),
    path('baby/<int:baby_id>/report/pdf/', views.download_report_pdf, name='download_report_pdf'),
    
    path('monitor/<int:baby_id>/', views.monitor_dashboard, name='monitor_dashboard'),
    path('api/baby/<int:baby_id>/vitals/', views.api_latest_vitals, name='api_vitals'),
    path('api/baby/<int:baby_id>/history/', views.baby_history_api, name='api_history'),
    path('delete_baby/<int:baby_id>/', views.delete_baby, name='delete_baby'),
    path('household/member/<int:member_id>/remove/', views.remove_household_member, name='remove_household_member'),
    
]

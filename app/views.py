import requests
from django.shortcuts import render
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.models import User
from django.db.models import Max
from datetime import date, timedelta
import time
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.conf import settings
import os
from datetime import datetime, timedelta
from .models import SleepSession
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt
from .models import SleepSession, Baby, HealthReading, DeviceStatus, DailyUserStat, Feeding


from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Baby, HealthReading, DeviceStatus, DailyUserStat
from .forms import BabyForm
from django.core.paginator import Paginator
from notifypy import Notify
# from notifications.signals import notify
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.http import require_http_methods
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.http import require_POST
from pathlib import Path

# Notification configuration: simple temp bounds. Set ALERT_COOLDOWN_SEC to 0
# to allow sending multiple notifications concurrently (no per-type cooldown).
# We keep this in-memory to avoid adding DB migrations; it's sufficient
# for a single-server/dev environment. If you want persistent throttling
# across restarts or multiple processes, add fields to a model (e.g.
# DeviceStatus) and persist the last alert timestamps there.
ALERT_COOLDOWN_SEC = 0
TEMP_HIGH_F = 100.4
TEMP_LOW_F = 95.0
# last_alerts maps baby_id -> {'hr': last_ts, 'temp': last_ts}
last_alerts = {}
# last_alert_state maps baby_id -> {'hr': bool, 'temp': bool}
last_alert_state = {}

# Create your views here.
def home(request):
    # Previously this sent a demo desktop notification on page load.
    # Remove that behavior — notifications are now sent when vitals are
    # detected as unhealthy in `api_latest_vitals`.
    return render(request, 'dashboard.html')

def admin_dashboard(request):
    """Render an analytics-style admin dashboard.

    This view computes current counts and persists a daily snapshot (DailyUserStat).
    - active_now: simple definition = users with is_active=True (quick, reliable)
    - total_users: total User objects
    - peak: stored peak from today's snapshot or historical peak
    - last_7_days: list of DailyUserStat for charting
    """
    # Simple "active" definition: users with is_active flag set. If you prefer
    # "recent activity" (users active in the last N minutes), we should track
    # last_activity timestamps (middleware) or inspect sessions.
    active_now = User.objects.filter(is_active=True).count()
    total_users = User.objects.count()

    today = date.today()
    stat, created = DailyUserStat.objects.get_or_create(
        date=today,
        defaults={
            'active_count': active_now,
            'total_users': total_users,
            'peak_active': active_now,
        }
    )

    if not created:
        # update today's snapshot and peak
        stat.active_count = active_now
        stat.total_users = total_users
        if active_now > stat.peak_active:
            stat.peak_active = active_now
        stat.save()

    # Historical / comparison data
    yesterday = today - timedelta(days=1)
    prev = DailyUserStat.objects.filter(date=yesterday).first()

    # Day-over-day change (relative difference). Handle division-by-zero.
    def pct_change(current, previous):
        if previous is None:
            return None
        try:
            if previous == 0:
                return None
            return round((current - previous) / previous * 100.0, 1)
        except Exception:
            return None

    active_change = pct_change(active_now, prev.active_count if prev else None)
    total_change = pct_change(total_users, prev.total_users if prev else None)

    # Global peak across stored days
    global_peak = DailyUserStat.objects.aggregate(Max('peak_active'))['peak_active__max'] or stat.peak_active

    # Last 7 days for a small chart/table
    last_7 = list(DailyUserStat.objects.order_by('-date')[:7])
    last_7.reverse()  # oldest -> newest

    context = {
        'active_now': active_now,
        'total_users': total_users,
        'global_peak': global_peak,
        'today_stat': stat,
        'prev_stat': prev,
        'active_change': active_change,
        'total_change': total_change,
        'last_7': last_7,
    }

    return render(request, 'admin_dashboard.html', context)

@staff_member_required
def admin_users(request):
    qs = User.objects.all().order_by('-date_joined')
    paginator = Paginator(qs, 25)
    page_num = request.GET.get('page', 1)
    page = paginator.get_page(page_num)

    return render(request, 'admin_users.html', {'page': page})

@staff_member_required
@require_POST
def admin_toggle_active(request, user_id):
    target = get_object_or_404(User, pk=user_id)
    if target == request.user:
        messages.error(request, "You can't deactivate yourself.")
        return redirect('admin_users')
    target.is_active = not target.is_active
    target.save()
    messages.success(request, f"{target.username} {'activated' if target.is_active else 'deactivated'}.")
    return redirect('admin_users')


@staff_member_required
@require_http_methods(["GET", "POST"])
def admin_edit_user(request, user_id):
    """Allow staff to edit basic fields for another user."""
    target = get_object_or_404(User, pk=user_id)
    # Permission rules:
    # - Superusers can edit any field and toggle staff status.
    # - Non-superuser staff (managers) can edit their own profile and non-admin users,
    #   but cannot edit other staff members or change is_staff.
    if not request.user.is_superuser:
        # if target is a staff member other than the current user, forbid
        if target.is_staff and target != request.user:
            messages.error(request, "You don't have permission to edit another admin.")
            return redirect('admin_users')

    if request.method == 'POST':
        name = request.POST.get('first_name', '').strip()
        email = request.POST.get('email', '').strip()
        is_active = True if request.POST.get('is_active') == 'on' else False

        # disallow deactivating yourself
        if target == request.user and not is_active:
            messages.error(request, "You can't deactivate yourself.")
            return redirect('admin_users')

        if name:
            target.first_name = name
        target.email = email
        target.is_active = is_active

        # Only superusers may toggle staff status
        if request.user.is_superuser:
            is_staff = True if request.POST.get('is_staff') == 'on' else False
            target.is_staff = is_staff

        target.save()
        messages.success(request, f"Saved changes for {target.username}.")
        return redirect('admin_users')

    # show whether current user can toggle staff in the form
    can_toggle_staff = request.user.is_superuser
    return render(request, 'admin_user_edit.html', {'target': target, 'can_toggle_staff': can_toggle_staff})

@login_required
def profile(request):
    user = request.user
    
    if request.method == 'POST':
        form = BabyForm(request.POST, request.FILES) 
        if form.is_valid():
            new_baby = form.save(commit=False)
            new_baby.parent = user
            new_baby.save()
            messages.success(request, f"Profile for {new_baby.name} created!")
            return redirect('profile')

    # find any file matching username.* in the profile_pics folder (handles png/jpg/webp/etc.)
    profile_url = None
    profile_dir = Path(settings.MEDIA_ROOT) / 'profile_pics'
    try:
        candidates = list(profile_dir.glob(f"{user.username}.*"))
    except Exception:
        candidates = []

    if candidates:
        p = candidates[0]
        try:
            mtime = int(p.stat().st_mtime)
            profile_url = settings.MEDIA_URL + f'profile_pics/{p.name}?v={mtime}'
        except Exception:
            profile_url = settings.MEDIA_URL + f'profile_pics/{p.name}'

    name = user.first_name or user.get_username()
    
    babies = Baby.objects.filter(parent=user)
    form = BabyForm()

    return render(request, 'profile.html', {
        'profile_url': profile_url, 
        'name': name,
        'babies': babies,
        'form': form
    })

@login_required
def delete_baby(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id, parent=request.user)
    
    if request.method == 'POST':
        baby.delete()
        messages.success(request, "Baby profile deleted successfully.")
        return redirect('profile')
    
    return redirect('profile')

@login_required
def account_edit(request):
    user = request.user
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        if name:
            user.first_name = name
            
        file = request.FILES.get('pfp')
        if file:
            profile_dir = Path(settings.MEDIA_ROOT) / 'profile_pics'
            profile_dir.mkdir(parents=True, exist_ok=True)

            # Determine extension: prefer file extension from name, else map from content_type
            _, ext = os.path.splitext(file.name)
            ext = ext.lower()
            if not ext:
                content_type = getattr(file, 'content_type', '')
                ct_map = {
                    'image/jpeg': '.jpg',
                    'image/jpg': '.jpg',
                    'image/png': '.png',
                    'image/gif': '.gif',
                    'image/webp': '.webp'
                }
                ext = ct_map.get(content_type, '.png')

            # Remove any existing profile images for this user (username.*)
            for old_path in profile_dir.glob(f"{user.username}.*"):
                try:
                    old_path.unlink()
                except Exception:
                    pass

            filepath = profile_dir / f"{user.username}{ext}"
            with open(filepath, 'wb+') as dest:
                for chunk in file.chunks():
                    dest.write(chunk)

        user.save()
        messages.success(request, 'Account updated')
        return redirect('profile')

    profile_url = None
    for ext in ('.png', '.jpg', '.jpeg', '.gif'):
        p = settings.MEDIA_ROOT / 'profile_pics' / f"{user.username}{ext}"
        if p.exists():
            try:
                mtime = int(p.stat().st_mtime)
                profile_url = settings.MEDIA_URL + f'profile_pics/{user.username}{ext}?v={mtime}'
            except Exception:
                profile_url = settings.MEDIA_URL + f'profile_pics/{user.username}{ext}'
            break

    return render(request, 'account_edit.html', {'profile_url': profile_url, 'name': user.first_name})


def signup(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        if password != confirm_password:
            messages.error(request, 'Passwords do not match')
        elif User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists')
        else:
            user = User.objects.create_user(username=username, password=password)
            auth_login(request, user)
            return redirect('home')
    return render(request, 'signup.html')

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            auth_login(request, user)
            return redirect('profile')
        else:
            messages.error(request, 'Invalid credentials')
    return render(request, 'login.html')



def monitor_dashboard(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)
    latest_vitals = baby.readings.order_by('-timestamp').first()
    device, created = DeviceStatus.objects.get_or_create(
        baby=baby, 
        defaults={'is_online': False, 'battery_level': 0}
        )
    
    return render(request, 'monitor.html', {
        'baby': baby,
        'vitals': latest_vitals,
        'device': device
    })


def api_latest_vitals(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)
    
    try:
        hr_response = requests.get("http://127.0.0.1:3000/api/hr", timeout=1).json()
        temp_response = requests.get("http://127.0.0.1:3000/api/temperature", timeout=1).json()
        
        hr = hr_response.get('heartRate')
        temp = temp_response.get('temperatureF')

        HealthReading.objects.create(
            baby=baby,
            heart_rate=hr,
            baby_temperature=temp,
            oxygen_level=98 # Placeholder
        )

        return JsonResponse({
            "heart_rate": hr,
            "temperature": float(temp),
            "status": "Online"
        })

    except Exception as e:
        latest = baby.readings.order_by('-timestamp').first()
        return JsonResponse({
            "heart_rate": latest.heart_rate if latest else "--",
            "temperature": float(latest.baby_temperature) if latest else "--",
            "status": "Offline (Using Last Known)",
            "error": str(e)
        })



def baby_history_api(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)
    readings = baby.readings.order_by('-timestamp')[:20]
    
    data = []
    for r in readings:
        data.append({
            "heart_rate": r.heart_rate,
            "temperature": float(r.baby_temperature), 
            "timestamp": r.timestamp.strftime("%H:%M:%S")
        })
    return JsonResponse(data, safe=False)

def get_weight_percentile(weight):
    if not weight:
        return 0
    if weight < 5:
        return 10
    elif weight < 7:
        return 40
    elif weight < 9:
        return 65
    else:
        return 90

@login_required
def baby_logs(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id, parent=request.user)

    # Calculate metrics
    next_nap = calculate_next_nap(baby)
    last_feed = Feeding.objects.filter(baby=baby).order_by('-time').first()
    percentile = get_weight_percentile(baby.weight_kg)

    return render(request, 'baby_logs.html', {
        'baby': baby,
        'next_nap': next_nap,
        'last_feed': last_feed,
        'percentile': percentile
    })

def calculate_next_nap(baby):
    last_sleep = SleepSession.objects.filter(
        baby=baby,
        end_time__isnull=False
    ).order_by('-end_time').first()

    if not last_sleep:
        return None

    # Simple age-based wake window (you can improve later)
    age_days = (datetime.now().date() - baby.birth_date).days
    age_months = age_days // 30

    if age_months <= 3:
        wake_window = 90  # minutes
    elif age_months <= 6:
        wake_window = 120
    else:
        wake_window = 150

    next_nap_time = last_sleep.end_time + timedelta(minutes=wake_window)
    return next_nap_time

def baby_timeline_api(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)

    sleeps = SleepSession.objects.filter(baby=baby)

    data = []
    for s in sleeps:
        data.append({
            "type": "sleep",
            "start": s.start_time.strftime("%H:%M"),
            "end": s.end_time.strftime("%H:%M") if s.end_time else None
        })

    return JsonResponse(data, safe=False)

@csrf_exempt
def quick_log(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)

    data = json.loads(request.body)
    log_type = data.get("type")

    if log_type == "sleep":
        SleepSession.objects.create(baby=baby, start_time=datetime.now())

    elif log_type == "diaper":
        # Placeholder: Add your Diaper model creation logic here later
        pass
        
    elif log_type == "feed":
        # Placeholder: Add logic to create a Feeding entry if you want a default behavior
        pass

    return JsonResponse({"status": "ok"})
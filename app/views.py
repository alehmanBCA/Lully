from collections import Counter
import re
from urllib.parse import parse_qs, urlparse

import requests
from pathlib import Path
from django.shortcuts import get_object_or_404, redirect, render
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.db.models import Count, Max, Q
from datetime import date, timedelta
import time
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.conf import settings
from .models import Baby, DailyUserStat, DeviceStatus, Household, HouseholdMember, HealthReading, LikePost, Post, Comment, UserPreference
import os
from datetime import datetime, timedelta
from .models import SleepSession
from django.http import JsonResponse
import json
from django.views.decorators.csrf import csrf_exempt
from .models import SleepSession, Baby, HealthReading, DeviceStatus, DailyUserStat, Feeding, DiaperLog, GrowthLog, Medication, DailyNote
from django.template.loader import render_to_string
from django.http import HttpResponse, JsonResponse
from weasyprint import HTML
from datetime import date
from datetime import datetime
from django.utils import timezone

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .forms import BabyForm, PostForm, CommentForm
from django.core.paginator import Paginator
from notifypy import Notify
# from notifications.signals import notify
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.http import require_POST

def get_accessible_babies(user):
    return Baby.objects.filter(
        Q(parent=user) |
        Q(household__memberships__user=user, household__memberships__is_active=True)
    ).distinct().select_related('household')

def get_user_household(user):
    membership = HouseholdMember.objects.select_related('household').filter(user=user, is_active=True).first()
    if membership:
        return membership.household

    owned_household = Household.objects.filter(owner=user).first()
    if owned_household:
        return owned_household

    baby_household = Baby.objects.filter(parent=user, household__isnull=False).select_related('household').first()
    if baby_household:
        return baby_household.household

    return None


def ensure_household(user):
    household = get_user_household(user)
    if household:
        return household

    household = Household.objects.create(
        owner=user,
        name=f"{user.get_username()}'s Family"
    )
    HouseholdMember.objects.create(household=household, user=user, role='owner')
    return household

def join_household(user, join_code):
    raw_input = (join_code or '').strip()
    if not raw_input:
        return None, 'Please enter a household code.'

    candidates = []
    parsed = urlparse(raw_input)
    if parsed.scheme and (parsed.netloc or parsed.path):
        query_values = parse_qs(parsed.query)
        for key in ('join_code', 'code', 'household_code', 'invite'):
            candidates.extend(query_values.get(key, []))
        candidates.extend(re.split(r'[^A-Za-z0-9]+', parsed.path or ''))

    candidates.append(raw_input)
    candidates.extend(re.split(r'[^A-Za-z0-9]+', raw_input))

    normalized_candidates = []
    seen = set()
    for candidate in candidates:
        normalized = re.sub(r'[^A-Z0-9]', '', (candidate or '').upper())
        if 6 <= len(normalized) <= 12 and normalized not in seen:
            seen.add(normalized)
            normalized_candidates.append(normalized)

    if not normalized_candidates:
        return None, 'Please enter a valid household code.'

    household = None
    for candidate in normalized_candidates:
        household = Household.objects.filter(join_code__iexact=candidate).first()
        if household:
            break

    if not household:
        return None, 'That household code was not found.'

    membership = HouseholdMember.objects.select_related('household').filter(user=user).first()
    if membership:
        if membership.household_id == household.id:
            membership.is_active = True
            membership.save(update_fields=['is_active'])
            return household, 'You are already in this household.'
        if not membership.is_active:
            membership.household = household
            membership.role = 'viewer'
            membership.is_active = True
            membership.save(update_fields=['household', 'role', 'is_active'])
            return household, f'Joined {household.name} successfully.'
        return None, 'You already belong to another household.'

    HouseholdMember.objects.create(household=household, user=user, role='viewer')
    return household, f'Joined {household.name} successfully.'


def can_manage_household(user, household):
    if not household:
        return False
    if household.owner_id == user.id:
        return True
    return HouseholdMember.objects.filter(
        household=household,
        user=user,
        role='owner',
        is_active=True,
    ).exists()
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


@login_required
def community(request):
    query = request.GET.get('q', '').strip()
    post_type = request.GET.get('type', 'all').strip().lower()
    sort_by = request.GET.get('sort', 'new').strip().lower()
    if post_type not in {'all', 'question', 'mine'}:
        post_type = 'all'
    if sort_by not in {'new', 'popular', 'trending'}:
        sort_by = 'new'

    if request.method == 'POST' and request.POST.get('action') == 'create_post':
        post_form = PostForm(request.POST, request.FILES)
        if post_form.is_valid():
            post = post_form.save(commit=False)
            post.user = request.user
            post.save()
            messages.success(request, 'Post shared successfully.')
            return redirect('community')
    else:
        post_form = PostForm()

    posts = Post.objects.select_related('user').prefetch_related('comments__user').all()
    if query:
        posts = posts.filter(
            Q(title__icontains=query) |
            Q(caption__icontains=query) |
            Q(tags__icontains=query)
        )
    if post_type == 'question':
        posts = posts.filter(post_type=post_type)
    elif post_type == 'mine':
        posts = posts.filter(user=request.user)

    if sort_by == 'popular':
        posts = posts.order_by('-no_of_likes', '-created_at')
    elif sort_by == 'trending':
        posts = posts.annotate(comment_count=Count('comments')).order_by('-comment_count', '-no_of_likes', '-created_at')
    else:
        posts = posts.order_by('-created_at')

    tag_counts = Counter()
    for raw_tags in Post.objects.exclude(tags__isnull=True).values_list('tags', flat=True):
        for token in re.split(r'[\s,]+', raw_tags or ''):
            cleaned_tag = token.strip().lstrip('#').lower()
            if cleaned_tag:
                tag_counts[cleaned_tag] += 1

    trending_tags = [tag for tag, _count in tag_counts.most_common(8)]
    suggested_tags = ['newborn', 'parenting', 'sleep', 'feeding', 'milestones', 'tips']

    comment_form = CommentForm(auto_id=False)

    return render(request, 'community.html', {
        'post_form': post_form,
        'comment_form': comment_form,
        'query': query,
        'current_type': post_type,
        'current_sort': sort_by,
        'posts': posts,
        'trending_tags': trending_tags,
        'suggested_tags': suggested_tags,
    })


@login_required
@require_POST
def like_post(request, post_id):
    post = get_object_or_404(Post, pk=post_id)
    existing_like = LikePost.objects.filter(post=post, user=request.user).first()

    if existing_like:
        existing_like.delete()
        if post.no_of_likes > 0:
            post.no_of_likes -= 1
    else:
        LikePost.objects.create(post=post, user=request.user)
        post.no_of_likes += 1

    post.save(update_fields=['no_of_likes'])
    return redirect(request.META.get('HTTP_REFERER', 'community'))


@login_required
@require_POST
def add_comment(request, post_id):
    post = get_object_or_404(Post, pk=post_id)
    form = CommentForm(request.POST)

    if form.is_valid():
        comment = form.save(commit=False)
        comment.post = post
        comment.user = request.user
        comment.save()
        messages.success(request, 'Comment added.')

    return redirect(request.META.get('HTTP_REFERER', 'community'))


@login_required
@require_POST
def delete_post(request, post_id):
    post = get_object_or_404(Post, pk=post_id, user=request.user)
    post.delete()
    messages.success(request, 'Post deleted successfully.')
    return redirect(request.META.get('HTTP_REFERER', 'community'))

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
    household = get_user_household(user)
    
    if request.method == 'POST':
        action = request.POST.get('action', 'create_baby')

        if action == 'join_household':
            _, message = join_household(user, request.POST.get('join_code'))
            messages.info(request, message)
            return redirect('profile')

        form = BabyForm(request.POST, request.FILES) 
        if form.is_valid():
            new_baby = form.save(commit=False)
            new_baby.parent = user
            new_baby.household = ensure_household(user)

            preference = UserPreference.objects.filter(user=user).first()
            if preference:
                new_baby.min_heart_rate = preference.default_min_heart_rate
                new_baby.max_heart_rate = preference.default_max_heart_rate

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
    
    babies = get_accessible_babies(user)
    form = BabyForm()
    household_members = HouseholdMember.objects.none()
    can_manage_members = False
    is_household_owner = False
    if household:
        household_members = HouseholdMember.objects.select_related('user').filter(household=household, is_active=True).order_by('joined_at')
        can_manage_members = can_manage_household(user, household)
        is_household_owner = household.owner_id == user.id

    return render(request, 'profile.html', {
        'profile_url': profile_url, 
        'name': name,
        'babies': babies,
        'household': household,
        'household_members': household_members,
        'can_manage_members': can_manage_members,
        'is_household_owner': is_household_owner,
        'form': form
    })


@login_required
@require_POST
def remove_household_member(request, member_id):
    household = get_user_household(request.user)
    if not household:
        messages.error(request, 'No household found.')
        return redirect('profile')

    membership = get_object_or_404(
        HouseholdMember.objects.select_related('user'),
        id=member_id,
        household=household,
        is_active=True,
    )

    is_self_remove = membership.user_id == request.user.id

    if not is_self_remove and not can_manage_household(request.user, household):
        messages.error(request, 'Only household owners can remove members.')
        return redirect('profile')

    if membership.role == 'owner' or membership.user_id == household.owner_id:
        if is_self_remove:
            messages.error(request, 'Household owners cannot leave their own household.')
        else:
            messages.error(request, 'Owner accounts cannot be removed.')
        return redirect('profile')

    membership.is_active = False
    membership.save(update_fields=['is_active'])

    if is_self_remove:
        messages.success(request, 'You left the household.')
    else:
        messages.success(request, f"Removed {membership.user.get_username()} from the household.")
    return redirect('profile')

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
    preference, _ = UserPreference.objects.get_or_create(user=user)

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

        min_hr_raw = request.POST.get('default_min_heart_rate', '').strip()
        max_hr_raw = request.POST.get('default_max_heart_rate', '').strip()
        min_temp_raw = request.POST.get('default_min_temperature', '').strip()
        max_temp_raw = request.POST.get('default_max_temperature', '').strip()

        try:
            min_hr = int(min_hr_raw)
            if min_hr > 0:
                preference.default_min_heart_rate = min_hr
        except (TypeError, ValueError):
            pass

        try:
            max_hr = int(max_hr_raw)
            if max_hr > 0:
                preference.default_max_heart_rate = max_hr
        except (TypeError, ValueError):
            pass

        try:
            min_temp = float(min_temp_raw)
            preference.default_min_temperature = min_temp
        except (TypeError, ValueError):
            pass

        try:
            max_temp = float(max_temp_raw)
            preference.default_max_temperature = max_temp
        except (TypeError, ValueError):
            pass

        temperature_unit = request.POST.get('temperature_unit', preference.temperature_unit)
        if temperature_unit in {'c', 'f'}:
            preference.temperature_unit = temperature_unit

        weight_unit = request.POST.get('weight_unit', preference.weight_unit)
        if weight_unit in {'kg', 'lb'}:
            preference.weight_unit = weight_unit

        preference.save()

        user.save()
        messages.success(request, 'Account updated')
        return redirect('account_edit')

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

    return render(request, 'account_edit.html', {
        'profile_url': profile_url,
        'name': user.first_name,
        'preference': preference,
    })


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


def logout_view(request):
    auth_logout(request)
    return redirect('home')



@login_required
def monitor_dashboard(request, baby_id):
    baby = get_object_or_404(get_accessible_babies(request.user), id=baby_id)
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

# def api_latest_vitals(request, baby_id):
#     baby = get_object_or_404(Baby, id=baby_id)
#     latest = baby.readings.order_by('-timestamp').first()
    
@login_required

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
            oxygen_level=98
        )

        # Coerce numeric types where possible
        try:
            hr_val = int(hr) if hr is not None else None
        except Exception:
            hr_val = None

        try:
            temp_val = float(temp) if temp is not None else None
        except Exception:
            temp_val = None

        # Notification on state transition (normal -> alert) to avoid spam.
        now = time.time()
        baby_alerts = last_alerts.setdefault(baby.id, {'hr': 0, 'temp': 0})
        baby_state = last_alert_state.setdefault(baby.id, {'hr': False, 'temp': False})

        # Heart rate alert logic: send notification when we transition
        # from non-alert to alert. When value returns to normal, clear state
        # (optionally send a recovery notification).
        if hr_val is not None:
            hr_alert = hr_val > (baby.max_heart_rate or 9999) or hr_val < (baby.min_heart_rate or 0)
            if hr_alert and not baby_state.get('hr'):
                # send alert now
                # respect cooldown only if >0 and last sent recently
                if ALERT_COOLDOWN_SEC <= 0 or now - baby_alerts.get('hr', 0) > ALERT_COOLDOWN_SEC:
                    notification = Notify()
                    notification.title = f"Vital alert — {baby.name}"
                    if hr_val > (baby.max_heart_rate or 9999):
                        notification.message = f"Heart rate high: {hr_val} BPM (limit {baby.max_heart_rate})"
                    else:
                        notification.message = f"Heart rate low: {hr_val} BPM (limit {baby.min_heart_rate})"
                    try:
                        notification.send()
                        baby_alerts['hr'] = now
                    except Exception:
                        pass
                    baby_state['hr'] = True
            elif not hr_alert and baby_state.get('hr'):
                # recovered
                baby_state['hr'] = False

        # Temperature alerts: similar transition logic
        if temp_val is not None:
            temp_alert = temp_val > TEMP_HIGH_F or temp_val < TEMP_LOW_F
            if temp_alert and not baby_state.get('temp'):
                if ALERT_COOLDOWN_SEC <= 0 or now - baby_alerts.get('temp', 0) > ALERT_COOLDOWN_SEC:
                    notification = Notify()
                    notification.title = f"Vital alert — {baby.name}"
                    if temp_val > TEMP_HIGH_F:
                        notification.message = f"High temperature: {temp_val:.1f}°F"
                    else:
                        notification.message = f"Low temperature: {temp_val:.1f}°F"
                    try:
                        notification.send()
                        baby_alerts['temp'] = now
                    except Exception:
                        pass
                    baby_state['temp'] = True
            elif not temp_alert and baby_state.get('temp'):
                baby_state['temp'] = False

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



@login_required
def baby_history_api(request, baby_id):
    baby = get_object_or_404(get_accessible_babies(request.user), id=baby_id)
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
    next_nap = calculate_next_nap(baby)

    feeding_history = Feeding.objects.filter(baby=baby).order_by('-time')[:5]
    diaper_history = DiaperLog.objects.filter(baby=baby).order_by('-time')[:5]
    growth_history = GrowthLog.objects.filter(baby=baby).order_by('-time')[:5]
    medical_notes_history = DailyNote.objects.filter(baby=baby).order_by('-date')[:10]

    all_sleep = SleepSession.objects.filter(baby=baby)
    positions = [s.position for s in all_sleep if s.position]
    preferred_position = Counter(positions).most_common(1)[0][0] if positions else "Back"

    sleep_history = SleepSession.objects.filter(baby=baby).order_by('-start_time')[:5]

    last_diaper = DiaperLog.objects.filter(baby=baby).order_by('-time').first()
    medications = Medication.objects.filter(baby=baby)

    today = timezone.localdate()
    diapers = DiaperLog.objects.filter(baby=baby, time__date=today)
    today_feedings_count = Feeding.objects.filter(baby=baby, time__date=today).count()
    today_diapers_count = DiaperLog.objects.filter(baby=baby, time__date=today).count()
    today_sleeps_count = SleepSession.objects.filter(baby=baby, start_time__date=today).count()
    today_growth_count = GrowthLog.objects.filter(baby=baby, time__date=today).count()
    today_meds_count = Medication.objects.filter(baby=baby).count()
    today_notes_count = DailyNote.objects.filter(baby=baby, date=today).count()
    # today_note = DailyNote.objects.filter(baby=baby, date=today).first()
    
    daily_notes_history = DailyNote.objects.filter(baby=baby).exclude(notes='').exclude(notes__isnull=True).order_by('-date')[:7]

    return render(request, 'baby_logs.html', {
        'baby': baby,
        'next_nap': next_nap,
        'sleep_history': sleep_history,
        'feeding_history': feeding_history,
        'diaper_history': diaper_history,
        'growth_history': growth_history,
        'medical_notes_history': medical_notes_history,
        'diapers': diapers,

        'preferred_position': preferred_position,

        'last_diaper': last_diaper,
        'medications': medications,

        # 'today_note': today_note,
        # 'today_feedings_count': Feeding.objects.filter(baby=baby, time__date=today).count(),
        # 'today_diapers_count': DiaperLog.objects.filter(baby=baby, time__date=today).count(),
        # 'today_sleeps_count': SleepSession.objects.filter(baby=baby, start_time__date=today).count(),
        # 'today_growth_count': GrowthLog.objects.filter(baby=baby, time__date=today).count(),
        'daily_notes_history': daily_notes_history,
        # 'today_meds_count': Medication.objects.filter(baby=baby).count(),
        # 'today_notes_count': DailyNote.objects.filter(baby=baby, date=today).exists(),
        'today_feedings_count': today_feedings_count,
        'today_diapers_count': today_diapers_count,
        'today_sleeps_count': today_sleeps_count,
        'today_growth_count': today_growth_count,
        'today_meds_count': today_meds_count,
        'today_notes_count': today_notes_count,
    })

@csrf_exempt
@login_required
def save_detailed_feeding(request, baby_id):
    if request.method == 'POST':
        data = json.loads(request.body)
        baby = get_object_or_404(Baby, id=baby_id, parent=request.user)
        
        Feeding.objects.create(
            baby=baby,
            side=data.get('side'),
            duration=data.get('duration')
        )
        return JsonResponse({'status': 'success'})

def calculate_next_nap(baby):
    last_sleep = SleepSession.objects.filter(
        baby=baby,
        end_time__isnull=False
    ).order_by('-end_time').first()

    if not last_sleep:
        return None

    age_days = (datetime.now().date() - baby.birth_date).days
    age_months = age_days // 30

    if age_months <= 3:
        wake_window = 90
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
        pass
        
    elif log_type == "feed":
        pass

    return JsonResponse({"status": "ok"})

@csrf_exempt
@login_required
def save_detailed_diaper(request, baby_id):
    if request.method == 'POST':
        baby = get_object_or_404(Baby, id=baby_id)
        data = json.loads(request.body)
        
        time_str = data.get('time')
        if time_str:
            naive_time = datetime.strptime(time_str, '%Y-%m-%dT%H:%M')
            log_time = timezone.make_aware(naive_time)   # ← fix: make it timezone-aware
        else:
            log_time = timezone.now()                    # ← fix: use timezone.now() not datetime.now()
            
        result = DiaperLog.objects.create(
            baby=baby,
            time=log_time,
            status=data.get('status', 'Pee'),
            color=data.get('color', '')
        )
        
        return JsonResponse({'status': 'ok'})
    
    return JsonResponse({'status': 'error'}, status=400)
    

@csrf_exempt
@login_required
def save_detailed_sleep(request, baby_id):
    if request.method == 'POST':
        baby = get_object_or_404(Baby, id=baby_id)
        data = json.loads(request.body)
        
        start_time_str = data.get('start_time')

        start_time = datetime.strptime(start_time_str, '%Y-%m-%dT%H:%M')
        start_time = timezone.make_aware(start_time)

        SleepSession.objects.create(
            baby=baby,
            start_time=start_time,
            duration=data.get('duration', 0),
            position=data.get('position', 'Back')
        )
        
        return JsonResponse({'status': 'ok'})
    
@csrf_exempt
def save_detailed_growth(request, baby_id):
    if request.method == 'POST':
        baby = get_object_or_404(Baby, id=baby_id)
        data = json.loads(request.body)
        
        time_str = data.get('time')

        if time_str:
            naive_time = datetime.strptime(time_str, '%Y-%m-%dT%H:%M')
            log_time = timezone.make_aware(naive_time)
        else:
            log_time = timezone.now()
        
        GrowthLog.objects.create(
            baby=baby,
            time=log_time,
            unit=data.get('unit', 'metric'),
            weight=data.get('weight') or None,
            length=data.get('length') or None,
            head_circumference=data.get('head_circumference') or None
        )
        return JsonResponse({'status': 'ok'})
    
@csrf_exempt
@login_required
def save_medical_notes(request, baby_id):
    if request.method == 'POST':
        baby = get_object_or_404(Baby, id=baby_id)
        data = json.loads(request.body)
        new_note = data.get('notes', '').strip()

        if new_note:
            now = datetime.now().strftime("%b %d, %Y - %I:%M %p")
            formatted_note = f"[{now}]\n{new_note}\n"
            
            if baby.medical_notes:
                baby.medical_notes = formatted_note + "\n---\n" + baby.medical_notes
            else:
                baby.medical_notes = formatted_note
            
            baby.save()
            return JsonResponse({'status': 'ok'})
            
    return JsonResponse({'status': 'error'}, status=400)
    
@csrf_exempt
@login_required
def add_medication(request, baby_id):
    if request.method == 'POST':
        baby = get_object_or_404(Baby, id=baby_id)
        data = json.loads(request.body)
        
        Medication.objects.create(
            baby=baby,
            name=data.get('name'),
            dosage=data.get('dosage', ''),
            times_per_day=data.get('times_per_day', 1),
            days_per_week=data.get('days_per_week', 7)
        )
        
        return JsonResponse({'status': 'ok'})
    
@csrf_exempt
def delete_medication(request, med_id):
    if request.method == 'POST':
        medication = get_object_or_404(Medication, id=med_id)
        medication.delete()
        return JsonResponse({'status': 'ok'})
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

@csrf_exempt
def save_daily_note(request, baby_id):
    if request.method == 'POST':
        baby = get_object_or_404(Baby, id=baby_id)
        data = json.loads(request.body)
        
        new_text = data.get('notes', '').strip()
        
        if new_text:
            note, created = DailyNote.objects.get_or_create(baby=baby, date=date.today())
            
            time_str = datetime.now().strftime('%I:%M %p')
            formatted_entry = f"• {time_str} - {new_text}"
            
            if note.notes and not created:
                note.notes += f"\n{formatted_entry}"
            else:
                note.notes = formatted_entry
                
            note.save()
        
        return JsonResponse({'status': 'ok'})

def download_report_pdf(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)
    today = date.today()
    
    context = {
        'baby': baby,
        'today': today,
        'feedings': Feeding.objects.filter(baby=baby, time__date=today),
        'diapers': DiaperLog.objects.filter(baby=baby, time__date=today),
        'sleeps': SleepSession.objects.filter(baby=baby, start_time__date=today),
        'note': DailyNote.objects.filter(baby=baby, date=today).first()
    }
    
    html_string = render_to_string('report_pdf.html', context)
    
    pdf_file = HTML(string=html_string).write_pdf()
    
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{baby.name}_Report_{today}.pdf"'
    
    return response
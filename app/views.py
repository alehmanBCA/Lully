from django.shortcuts import render
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.conf import settings
import os


from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Baby, HealthReading, DeviceStatus
from .forms import BabyForm

# Create your views here.
def home(request):
    return render(request, 'dashboard.html')



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

    profile_url = None
    for ext in ('.png', '.jpg', '.jpeg', '.gif'):
        p = settings.MEDIA_ROOT / 'profile_pics' / f"{user.username}{ext}"
        if p.exists():
            profile_url = settings.MEDIA_URL + f'profile_pics/{user.username}{ext}'
            break

    name = user.first_name or user.get_username()
    
    babies = Baby.objects.filter(parent=user)
    form = BabyForm()

    return render(request, 'profile.html', {
        'profile_url': profile_url, 
        'name': name,
        'babies': babies,
        'form': form
    })


# def profile(request):
#     user = request.user
#     profile_url = None
#     if user.is_authenticated:
#         # try to find an uploaded profile picture for this user
#         from django.conf import settings
#         for ext in ('.png', '.jpg', '.jpeg', '.gif'):
#             p = settings.MEDIA_ROOT / 'profile_pics' / f"{user.username}{ext}"
#             if p.exists():
#                 profile_url = settings.MEDIA_URL + f'profile_pics/{user.username}{ext}'
#                 break

#     name = ''
#     if user.is_authenticated:
#         name = user.first_name or user.get_username()

#     return render(request, 'profile.html', {'profile_url': profile_url, 'name': name})

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
            profile_dir = settings.MEDIA_ROOT / 'profile_pics'
            os.makedirs(profile_dir, exist_ok=True)
            _, ext = os.path.splitext(file.name)
            ext = ext.lower()
            
            for old_ext in ('.png', '.jpg', '.jpeg', '.gif'):
                old_path = profile_dir / f"{user.username}{old_ext}"
                if old_path.exists():
                    old_path.unlink()

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
    latest = baby.readings.order_by('-timestamp').first()
    
    return JsonResponse({
        "heart_rate": latest.heart_rate if latest else None,
        "oxygen": latest.oxygen_level if latest else None,
        "max_heart_rate": baby.max_heart_rate,
        "min_heart_rate": baby.min_heart_rate,
        "min_oxygen_level": baby.min_oxygen_level,
        "status": latest.sleep_status if latest else "Unknown"
    })

def baby_history_api(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)
    readings = baby.readings.order_by('-timestamp')[:20]
    
    data = []
    for r in readings:
        data.append({
            "timestamp": r.timestamp.strftime('%H:%M:%S'),
            "heart_rate": r.heart_rate,
            "oxygen": r.oxygen_level
        })
    

    return JsonResponse(data, safe=False)
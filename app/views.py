from django.shortcuts import render
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.models import User
from django.contrib import messages

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import Baby, HealthReading, DeviceStatus
from .forms import BabyForm

# Create your views here.
def home(request):
    return render(request, 'dashboard.html')

# def profile(request):
#     return render(request, 'profile.html')


def profile(request):
    if request.method == 'POST':
        form = BabyForm(request.POST)
        if form.is_valid():
            new_baby = form.save(commit=False)
            new_baby.parent = request.user
            new_baby.save()
            return redirect('profile')
    
    babies = Baby.objects.filter(parent=request.user)
    form = BabyForm()
    return render(request, 'profile.html', {'babies': babies, 'form': form})



def signup(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        if User.objects.filter(username=username).exists():
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
            return redirect('home')
        else:
            messages.error(request, 'Invalid credentials')
    return render(request, 'login.html')



def monitor_dashboard(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)
    latest_vitals = baby.readings.order_by('-timestamp').first()
    device = DeviceStatus.objects.filter(baby=baby).first()
    
    return render(request, 'monitor.html', {
        'baby': baby,
        'vitals': latest_vitals,
        'device': device
    })

def api_latest_vitals(request, baby_id):
    baby = get_object_or_404(Baby, id=baby_id)
    latest = baby.readings.order_by('-timestamp').first()
    
    return JsonResponse({
        "heart_rate": latest.heart_rate if latest else "--",
        "oxygen": latest.oxygen_level if latest else "--",
        "temp": float(latest.baby_temperature) if latest else "--",
        "status": latest.sleep_status if latest else "Unknown"
    })
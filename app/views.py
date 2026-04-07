from django.shortcuts import render
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.conf import settings
import os

# Create your views here.
def home(request):
    return render(request, 'dashboard.html')

def profile(request):
    return render(request, 'profile.html')


@login_required
def account_edit(request):
    user = request.user
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        if name:
            user.first_name = name

        # handle uploaded profile picture
        file = request.FILES.get('pfp')
        if file:
            profile_dir = settings.MEDIA_ROOT / 'profile_pics'
            os.makedirs(profile_dir, exist_ok=True)
            _, ext = os.path.splitext(file.name)
            filename = f"{user.username}{ext}"
            filepath = profile_dir / filename
            # write file
            with open(filepath, 'wb+') as dest:
                for chunk in file.chunks():
                    dest.write(chunk)

        user.save()
        messages.success(request, 'Account updated')
        return redirect('profile')

    # determine existing profile image if any
    profile_url = None
    for ext in ('.png', '.jpg', '.jpeg', '.gif'):
        p = settings.MEDIA_ROOT / 'profile_pics' / f"{user.username}{ext}"
        if p.exists():
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
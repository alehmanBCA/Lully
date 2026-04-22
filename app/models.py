import secrets

from django.db import models
from django.conf import settings

class Community(models.Model):
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_communities')
    
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        through='CommunityMember', 
        related_name='joined_communities'
    )

    def __str__(self):
        return self.name


class CommunityMember(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('moderator', 'Moderator'),
        ('member', 'Member'),
    ]

    community = models.ForeignKey(Community, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('community', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.community.name} ({self.role})"

class Household(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_households')
    name = models.CharField(max_length=150)
    join_code = models.CharField(max_length=12, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.join_code:
            self.join_code = self._generate_join_code()
        super().save(*args, **kwargs)

    def _generate_join_code(self):
        while True:
            code = secrets.token_hex(4).upper()
            if not Household.objects.filter(join_code=code).exists():
                return code

    def __str__(self):
        return self.name


class HouseholdMember(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('caregiver', 'Caregiver'),
        ('viewer', 'Viewer'),
    ]

    household = models.ForeignKey(Household, on_delete=models.CASCADE, related_name='memberships')
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='household_membership')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} in {self.household} ({self.role})"


class Baby(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    household = models.ForeignKey(Household, on_delete=models.SET_NULL, null=True, blank=True, related_name='babies')
    birth_date = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    profile_picture = models.ImageField(upload_to='baby_profiles/', null=True, blank=True)
    
    # For alerts
    min_heart_rate = models.IntegerField(default=60)
    max_heart_rate = models.IntegerField(default=160)
    min_oxygen_level = models.IntegerField(default=90)

    def __str__(self):
        return self.name


class UserPreference(models.Model):
    TEMPERATURE_UNIT_CHOICES = [
        ('c', 'Celsius (°C)'),
        ('f', 'Fahrenheit (°F)'),
    ]

    WEIGHT_UNIT_CHOICES = [
        ('kg', 'Kilograms (kg)'),
        ('lb', 'Pounds (lb)'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    default_min_heart_rate = models.IntegerField(default=60)
    default_max_heart_rate = models.IntegerField(default=160)
    default_min_temperature = models.FloatField(default=36.0)
    default_max_temperature = models.FloatField(default=38.0)
    temperature_unit = models.CharField(max_length=1, choices=TEMPERATURE_UNIT_CHOICES, default='c')
    weight_unit = models.CharField(max_length=2, choices=WEIGHT_UNIT_CHOICES, default='kg')
    visible_metrics = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"UserPreference({self.user_id})"


class Post(models.Model):
    POST_TYPES = [
        ('question', 'Question'),
        ('fun', 'Fun'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_posts')
    post_type = models.CharField(max_length=20, choices=POST_TYPES, default='fun')
    title = models.CharField(max_length=200, blank=True)
    caption = models.TextField(blank=True)
    tags = models.CharField(max_length=300, blank=True, default='')
    image = models.ImageField(upload_to='community_posts/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    no_of_likes = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_post_type_display()} post by {self.user}"


class LikePost(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_likes')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['post', 'user'], name='unique_community_like')
        ]


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='community_comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

class HealthReading(models.Model):
    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='readings')
    
    # Vitals
    heart_rate = models.IntegerField()
    oxygen_level = models.IntegerField(help_text="SpO2 percentage")
    baby_temperature = models.DecimalField(max_digits=4, decimal_places=1)
    
    # Environment
    room_temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True)
    room_humidity = models.IntegerField(null=True, blank=True)
    
    # Status
    is_moving = models.BooleanField(default=False)
    sleep_status = models.CharField(
        max_length=20, 
        choices=[('AWAKE', 'Awake'), ('LIGHT', 'Light Sleep'), ('DEEP', 'Deep Sleep')],
        default='AWAKE'
    )
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['baby', '-timestamp'])]

class SleepSession(models.Model):
    baby = models.ForeignKey(Baby, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    
    POSITION_CHOICES = [
        ('Back', 'Back'),
        ('Belly', 'Belly'),
        ('Side', 'Side'),
    ]
    position = models.CharField(max_length=10, choices=POSITION_CHOICES, default='Back')
    duration = models.IntegerField(null=True, blank=True, help_text="Duration in minutes")

class Feeding(models.Model):
    baby = models.ForeignKey(Baby, on_delete=models.CASCADE)
    time = models.DateTimeField(auto_now_add=True)

    SIDE_CHOICES = [
        ('L', 'Left'),
        ('R', 'Right'),
        ('B', 'Both'),
    ]
    side = models.CharField(max_length=1, choices=SIDE_CHOICES)
    duration = models.IntegerField(null=True, blank=True, help_text="Duration in minutes")

class DiaperLog(models.Model):
    baby = models.ForeignKey(Baby, on_delete=models.CASCADE, related_name='diapers')
    time = models.DateTimeField()
    TYPE_CHOICES = [
        ('Wet', 'Wet'),
        ('Dirty', 'Dirty'),
        ('Both', 'Both'),
    ]
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)

    class Meta:
        ordering = ['-time']

class DeviceStatus(models.Model):
    baby = models.OneToOneField(Baby, on_delete=models.CASCADE)
    is_online = models.BooleanField(default=False)
    battery_level = models.IntegerField(default=100)
    last_seen = models.DateTimeField(auto_now=True)


class DailyUserStat(models.Model):
    """Daily snapshot of user metrics for analytics on the admin dashboard.

    - date: the day the snapshot represents (date only)
    - active_count: number of active users recorded for that day
    - total_users: total number of user accounts on that day
    - peak_active: the highest observed active users value for that day
    """
    date = models.DateField(unique=True)
    active_count = models.IntegerField(default=0)
    total_users = models.IntegerField(default=0)
    peak_active = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"DailyUserStat({self.date}: active={self.active_count}, total={self.total_users}, peak={self.peak_active})"
from django.db import models
from django.conf import settings

class Baby(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]
    
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
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
    default_min_oxygen_level = models.IntegerField(default=90)
    temperature_unit = models.CharField(max_length=1, choices=TEMPERATURE_UNIT_CHOICES, default='c')
    weight_unit = models.CharField(max_length=2, choices=WEIGHT_UNIT_CHOICES, default='kg')
    visible_metrics = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"UserPreference({self.user_id})"

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
    quality_score = models.IntegerField(default=100)

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
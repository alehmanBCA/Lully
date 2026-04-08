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
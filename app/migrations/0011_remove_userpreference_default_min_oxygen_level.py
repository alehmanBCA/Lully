from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0010_userpreference_temperature_thresholds'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userpreference',
            name='default_min_oxygen_level',
        ),
    ]

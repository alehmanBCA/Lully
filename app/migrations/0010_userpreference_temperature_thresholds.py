from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0009_household_sharing'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpreference',
            name='default_min_temperature',
            field=models.FloatField(default=36.0),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='default_max_temperature',
            field=models.FloatField(default=38.0),
        ),
    ]
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0014_merge_20260421_0029'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userpreference',
            name='temperature_unit',
            field=models.CharField(
                choices=[('c', 'Celsius (°C)'), ('f', 'Fahrenheit (°F)')],
                default='f',
                max_length=1,
            ),
        ),
        migrations.AlterField(
            model_name='userpreference',
            name='weight_unit',
            field=models.CharField(
                choices=[('kg', 'Kilograms (kg)'), ('lb', 'Pounds (lb)')],
                default='lb',
                max_length=2,
            ),
        ),
    ]

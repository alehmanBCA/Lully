
import secrets

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def forwards(apps, schema_editor):
    Baby = apps.get_model('app', 'Baby')
    Household = apps.get_model('app', 'Household')
    HouseholdMember = apps.get_model('app', 'HouseholdMember')
    User = apps.get_model(*settings.AUTH_USER_MODEL.split('.'))

    for baby in Baby.objects.select_related('parent').filter(household__isnull=True):
        parent = baby.parent
        if parent is None:
            continue

        household = Household.objects.filter(owner_id=parent.id).first()
        if household is None:
            username = getattr(parent, 'username', None) or f'User {parent.id}'
            while True:
                join_code = secrets.token_hex(4).upper()
                if not Household.objects.filter(join_code=join_code).exists():
                    break
            household = Household.objects.create(
                owner_id=parent.id,
                name=f"{username}'s Family",
                join_code=join_code,
            )

        HouseholdMember.objects.get_or_create(
            user_id=parent.id,
            defaults={
                'household_id': household.id,
                'role': 'owner',
                'is_active': True,
            },
        )

        if baby.household_id is None:
            baby.household_id = household.id
            baby.save(update_fields=['household'])


def backwards(apps, schema_editor):
    Baby = apps.get_model('app', 'Baby')
    Baby.objects.update(household=None)


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0008_post_comment_likepost'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Household',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('join_code', models.CharField(editable=False, max_length=12, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='owned_households', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='HouseholdMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('owner', 'Owner'), ('caregiver', 'Caregiver'), ('viewer', 'Viewer')], default='viewer', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('household', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='memberships', to='app.household')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='household_membership', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='baby',
            name='household',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='babies', to='app.household'),
        ),
        migrations.RunPython(forwards, backwards),
    ]

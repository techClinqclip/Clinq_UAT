from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('settings', '0004_legaldocument'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformPayoutSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('require_payout_approval', models.BooleanField(default=True, help_text='If enabled, admin must approve withdrawals before Razorpay autopay.')),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_platform_payout_settings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Platform Payout Settings',
                'verbose_name_plural': 'Platform Payout Settings',
            },
        ),
    ]

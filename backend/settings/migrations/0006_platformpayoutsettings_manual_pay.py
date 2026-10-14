from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0005_platformpayoutsettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformpayoutsettings',
            name='manual_pay',
            field=models.BooleanField(
                default=True,
                help_text='If enabled, withdrawals are paid manually (no RazorpayX autopay).',
            ),
        ),
        migrations.AlterField(
            model_name='platformpayoutsettings',
            name='require_payout_approval',
            field=models.BooleanField(
                default=True,
                help_text='Used only when manual_pay is False. If enabled, admin must approve before RazorpayX.',
            ),
        ),
    ]

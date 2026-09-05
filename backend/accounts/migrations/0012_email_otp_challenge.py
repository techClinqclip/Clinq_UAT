from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_profile_onboarding_data'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailOTPChallenge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(db_index=True, max_length=254)),
                ('otp_hash', models.CharField(max_length=255)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('attempts', models.PositiveIntegerField(default=0)),
                ('max_attempts', models.PositiveIntegerField(default=5)),
                ('verified_at', models.DateTimeField(db_index=True, null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'indexes': [
                    (models.Index(fields=['email', 'expires_at'], name='accounts_email_otp_challenge_email_expires_inde')), 
                ],
            },
        ),
    ]


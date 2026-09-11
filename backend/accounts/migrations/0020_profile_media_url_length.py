# Generated manually for persistent Supabase Storage URLs.

import accounts.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0019_profile_bank_account_holder_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='profile',
            name='avatar',
            field=models.ImageField(blank=True, max_length=500, null=True, upload_to=accounts.models.user_avatar_upload_path),
        ),
        migrations.AlterField(
            model_name='profile',
            name='cover',
            field=models.ImageField(blank=True, max_length=500, null=True, upload_to=accounts.models.user_cover_upload_path),
        ),
    ]

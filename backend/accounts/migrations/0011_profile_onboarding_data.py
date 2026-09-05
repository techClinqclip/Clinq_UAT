from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_alter_profile_views_generated'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='onboarding_data',
            field=models.JSONField(blank=True, default=dict),
        ),
    ]

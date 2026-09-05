from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('content', '0026_campaign_public_access_key'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='campaignsubmission',
            constraint=models.UniqueConstraint(
                condition=models.Q(is_deleted=False),
                fields=('participant', 'content_url'),
                name='unique_active_participant_content_url',
            ),
        ),
    ]
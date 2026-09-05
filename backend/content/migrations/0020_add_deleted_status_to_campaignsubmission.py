# Generated migration: Add "deleted" status choice to CampaignSubmission

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0019_content_final_video_url_content_proxy_video_url_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='campaignsubmission',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('deleted', 'Deleted'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
            ),
        ),
    ]

# Generated migration to consolidate Content (gigs) and Campaign models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('content', '0017_add_pending_earning_to_campaignsubmission'),
    ]

    operations = [
        # Add new fields to Campaign model to support gigs
        migrations.AddField(
            model_name='campaign',
            name='type',
            field=models.CharField(
                choices=[('campaign', 'Brand Campaign'), ('gig', 'Creator Gig')],
                db_index=True,
                default='campaign',
                max_length=20
            ),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='highlight_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('none', 'Standard'),
                    ('day', 'Gig of the Day'),
                    ('week', 'Gig of the Week'),
                    ('premium', 'Premium Listing'),
                ],
                default='none',
                max_length=20
            ),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='is_paid_listing',
            field=models.BooleanField(db_index=True, default=False),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='is_biddable',
            field=models.BooleanField(default=False),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='assigned_clipper',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_campaigns',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='raw_video_url',
            field=models.URLField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='proxy_video_url',
            field=models.URLField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='review_url',
            field=models.URLField(blank=True, null=True),
        ),
        
        migrations.AddField(
            model_name='campaign',
            name='final_video_url',
            field=models.URLField(blank=True, null=True),
        ),
        
        # Add composite index for efficient filtering
        migrations.AddIndex(
            model_name='campaign',
            index=models.Index(fields=['type', 'status'], name='content_camp_type_st_idx'),
        ),
    ]

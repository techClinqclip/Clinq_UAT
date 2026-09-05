# Generated migration: Replace status-based soft-delete with is_deleted boolean field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0020_add_deleted_status_to_campaignsubmission'),
    ]

    operations = [
        # Add is_deleted boolean field to preserve submission data for calculations
        migrations.AddField(
            model_name='campaignsubmission',
            name='is_deleted',
            field=models.BooleanField(default=False, db_index=True),
        ),
        
        # Remove the "deleted" status choice and revert to original 3 statuses
        migrations.AlterField(
            model_name='campaignsubmission',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                ],
                db_index=True,
                default='pending',
                max_length=20,
            ),
        ),
    ]

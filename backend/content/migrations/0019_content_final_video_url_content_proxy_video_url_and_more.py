# This migration is now a no-op since the video URL fields already exist
# in the Content model from earlier schema

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0018_consolidate_gigs_campaigns'),
    ]

    operations = [
        # Fields already exist, no operations needed
    ]

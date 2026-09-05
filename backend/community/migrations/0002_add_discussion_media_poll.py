from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('community', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='discussion',
            name='content',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='discussion',
            name='media',
            field=models.JSONField(default=list, blank=True, help_text='List of media URLs for the discussion'),
        ),
        migrations.AddField(
            model_name='discussion',
            name='poll',
            field=models.JSONField(default=dict, blank=True, help_text='Poll payload for the discussion'),
        ),
    ]

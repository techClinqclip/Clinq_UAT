from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0002_resource_sample_template'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='resourcesampletemplate',
            name='document',
        ),
        migrations.AddField(
            model_name='resourcesampletemplate',
            name='document_url',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='resourcesampletemplate',
            name='filename',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]

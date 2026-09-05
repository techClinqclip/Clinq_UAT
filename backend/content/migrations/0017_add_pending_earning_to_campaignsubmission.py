from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0016_alter_campaignsubmission_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='campaignsubmission',
            name='pending_earning',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]

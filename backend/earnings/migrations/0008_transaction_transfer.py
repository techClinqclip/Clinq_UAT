from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('earnings', '0007_transaction_lock_settlement'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transaction',
            name='transaction_type',
            field=models.CharField(
                choices=[
                    ('earning', 'Viral Earning'),
                    ('withdrawal', 'Withdrawal'),
                    ('deposit', 'Wallet Deposit'),
                    ('lock', 'Budget Lock'),
                    ('settlement', 'Campaign Settlement'),
                    ('transfer', 'Earnings Transfer'),
                    ('commission', 'Platform Fee'),
                    ('listing_fee', 'Premium Listing'),
                    ('bid_fee', 'Premium Bid Fee'),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
    ]

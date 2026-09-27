# Generated manually for wallet deposit + Razorpay payment method

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('earnings', '0005_transaction_payment_details_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transaction',
            name='payment_method',
            field=models.CharField(
                blank=True,
                choices=[
                    ('upi', 'UPI'),
                    ('bank_transfer', 'Bank Transfer'),
                    ('paypal', 'PayPal'),
                    ('razorpay', 'Razorpay'),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='transaction_type',
            field=models.CharField(
                choices=[
                    ('earning', 'Viral Earning'),
                    ('withdrawal', 'Withdrawal'),
                    ('deposit', 'Wallet Deposit'),
                    ('commission', 'Platform Fee'),
                    ('listing_fee', 'Premium Listing'),
                    ('bid_fee', 'Premium Bid Fee'),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
    ]

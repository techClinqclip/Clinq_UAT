from decimal import Decimal
from .models import Transaction
from faker import Faker

fake = Faker()

def seed_viral_earnings(clippers):
    """Generates viral earnings to test the ₹2500 withdrawal threshold."""
    for clipper in clippers:
        # Give them a random balance between ₹0 and ₹5000
        amount = Decimal(fake.random_int(min=0, max=5000))
        Transaction.objects.create(
            user=clipper,
            amount=amount,
            transaction_type='earning',
            status='completed',
            bot_notes="Seeded viral earnings for testing reach logic."
        )
        # Manually update profile wallet to match seeded earnings
        profile = clipper.profile
        profile.total_earnings = amount
        profile.save()
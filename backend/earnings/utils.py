from decimal import Decimal

from django.db.models import Sum

from content.models import CampaignSubmission

from .models import Transaction


def get_available_withdrawable_earnings(user) -> Decimal:
    """
    Withdrawable balance = approved clip earnings minus pending/completed
    withdrawals and earnings→spend transfers. Same definition used by the
    Creator wallet, transfer-to-spend, and payout request endpoints.
    """
    earned = CampaignSubmission.objects.filter(
        participant__clipper=user,
        status='approved',
    ).aggregate(total=Sum('earning'))['total'] or Decimal('0')
    already_moved = Transaction.objects.filter(
        user=user,
        transaction_type__in=['withdrawal', 'transfer'],
        status__in=['pending', 'completed'],
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    return max(Decimal(str(earned)) - Decimal(str(already_moved)), Decimal('0'))


def get_total_withdrawn(user) -> Decimal:
    """Sum of pending + completed withdrawal requests."""
    total = Transaction.objects.filter(
        user=user,
        transaction_type='withdrawal',
        status__in=['pending', 'completed'],
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    return Decimal(str(total))


def seed_viral_earnings(clippers):
    """Generates viral earnings to test the ₹2500 withdrawal threshold."""
    from faker import Faker

    fake = Faker()
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

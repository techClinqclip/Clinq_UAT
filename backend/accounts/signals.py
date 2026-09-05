# accounts/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser, Profile

@receiver(post_save, sender=CustomUser)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically creates a Profile record when a new CustomUser is saved.
    """
    if created:
        # Use get_or_create to avoid race conditions
        Profile.objects.get_or_create(user=instance)
        
        # Create referral code for new user
        try:
            from referral.models import ReferralCode
            ReferralCode.objects.get_or_create(user=instance)
        except Exception:
            # Ignore if referral app is not available
            pass
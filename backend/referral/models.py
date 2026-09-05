import decimal
import uuid 

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models import F
from django.db import transaction as db_transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
import secrets

# Import notifications helpers for integration
try:
    from notifications.helpers import (
        notify_referral_signup,
        notify_referral_reward,
        notify_referral_milestone
    )
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    notify_referral_signup = None
    notify_referral_reward = None
    notify_referral_milestone = None


class ReferralCode(models.Model):
    """Referral codes for users"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referral_code_obj'
    )
    code = models.CharField(max_length=20, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    total_referrals = models.IntegerField(default=0)
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=decimal.Decimal("0.0"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.code}"

    def save(self, *args, **kwargs):
        if not self.code:
            # Generate unique code
            while True:
                code = secrets.token_urlsafe(8)[:12].upper()
                if not ReferralCode.objects.filter(code=code).exists():
                    self.code = code
                    break
        super().save(*args, **kwargs)


class Referral(models.Model):
    """Track referrals made by users"""
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referrals_made'
    )
    referred_user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referred_by'
    )
    referral_code = models.ForeignKey(
        ReferralCode,
        on_delete=models.CASCADE,
        related_name='referrals'
    )
    
    # Status tracking
    is_active = models.BooleanField(default=True)
    has_earned_bonus = models.BooleanField(default=False, help_text="Referrer earned bonus")
    
    # Bonus tracking
    referrer_bonus = models.DecimalField(max_digits=10, decimal_places=2, default=decimal.Decimal("0.0"))
    referred_bonus = models.DecimalField(max_digits=10, decimal_places=2, default=decimal.Decimal("0.0"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    bonus_paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ['referrer', 'referred_user']
        indexes = [
            models.Index(fields=['referrer', 'created_at']),
            models.Index(fields=['referred_user']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.referrer.email} -> {self.referred_user.email}"

    def calculate_bonus(self):
        """
        Calculate referral bonuses
        Referrer gets bonus when referred user completes first task
        Referred user gets signup bonus
        """
        from accounts.models import Profile
        
        # Referrer bonus (when referred user completes first clip/content)
        if not self.has_earned_bonus:
            # Check if referred user has completed any work
            from content.models import ClipSubmission, Content
            has_completed = (
                ClipSubmission.objects.filter(clipper=self.referred_user).exists() or
                Content.objects.filter(creator=self.referred_user).exists()
            )
            
            if has_completed:
                self.referrer_bonus = 500.00  # ₹500 bonus
                self.has_earned_bonus = True
                self.bonus_paid_at = timezone.now()
                
                # Use atomic transaction with F() expressions to prevent race conditions
                with db_transaction.atomic():
                    from accounts.models import Profile
                    # Update referrer's earnings atomically
                    Profile.objects.filter(user=self.referrer).update(
                        total_earnings=F('total_earnings') + self.referrer_bonus
                    )
                    
                    # Update referral code stats atomically
                    ReferralCode.objects.filter(pk=self.referral_code.pk).update(
                        total_referrals=F('total_referrals') + 1,
                        total_earnings=F('total_earnings') + self.referrer_bonus
                    )
                    
                    self.save()
        
        # Referred user signup bonus
        if self.referred_bonus == 0:
            self.referred_bonus = 100.00  # ₹100 signup bonus
            # Use atomic transaction with F() expressions to prevent race conditions
            with db_transaction.atomic():
                from accounts.models import Profile
                # Update referred user's earnings atomically
                Profile.objects.filter(user=self.referred_user).update(
                    total_earnings=F('total_earnings') + self.referred_bonus
                )
                self.save()


class ReferralInvite(models.Model):
    """Track referral invites sent"""
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referral_invites'
    )
    email = models.EmailField()
    referral_code = models.ForeignKey(
        ReferralCode,
        on_delete=models.CASCADE,
        related_name='invites'
    )
    invite_link = models.URLField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('sent', 'Sent'),
            ('opened', 'Opened'),
            ('accepted', 'Accepted'),
            ('expired', 'Expired'),
        ],
        default='sent'
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['referrer', 'sent_at']),
            models.Index(fields=['email', 'status']),
        ]
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.referrer.email} -> {self.email} ({self.status})"


# Signal handlers for notifications
@receiver(post_save, sender=Referral)
def referral_notification_handler(sender, instance, created, **kwargs):
    """
    Send notifications when referrals are created or updated
    """
    if not NOTIFICATIONS_AVAILABLE:
        return
    
    referrer_id = str(instance.referrer.id)
    referred_id = str(instance.referred_user.id)
    referred_name = instance.referred_user.get_full_name() or instance.referred_user.email
    
    # Notify when referral is created (new signup)
    if created and notify_referral_signup:
        notify_referral_signup(
            user_id=uuid.UUID(referrer_id),
            referee_id=uuid.UUID(referred_id),
            referee_name=referred_name # New user's name
        )
    
    # Notify when bonus is paid
    if instance.has_earned_bonus and notify_referral_reward:
        # Check if this is the moment bonus was earned (bonus_paid_at was just set)
        if kwargs.get('update_fields') is None or 'bonus_paid_at' in (kwargs.get('update_fields') or []):
            notify_referral_reward(
                user_id=uuid.UUID(referrer_id),
                amount=decimal.Decimal(instance.referrer_bonus),
                reason=f"Referral bonus for {instance.referred_user.email}"
            )
    
    # Check for referral milestones
    if notify_referral_milestone:
        total_referrals = Referral.objects.filter(
            referrer=instance.referrer,
            has_earned_bonus=True
        ).count()
        
        milestones = [5, 10, 25, 50, 100]
        for milestone in milestones:
            if total_referrals == milestone:
                # Find the next milestone for the helper's message
                next_milestone = next((m for m in milestones if m > total_referrals), None)
                notify_referral_milestone(
                    user_id=uuid.UUID(referrer_id),
                    referral_count=total_referrals,
                    next_milestone=next_milestone
                )


@receiver(post_save, sender=ReferralInvite)
def referral_invite_notification_handler(sender, instance, created, **kwargs):
    """
    Send notifications when invites are accepted
    """
    if not NOTIFICATIONS_AVAILABLE:
        return
    
    referrer_id = str(instance.referrer.id)
    referred_id = str(instance.referred_user.id)
    referred_name = instance.referred_user.get_full_name() or instance.referred_user.email
    
    # Notify when invite is accepted
    if instance.status == 'accepted' and notify_referral_signup:
        # This would typically trigger the referral creation, but just in case
        notify_referral_signup(
            user_id=uuid.UUID(referrer_id),
            referee_id=uuid.UUID(referred_id),
            referee_name=referred_name # New user's name
        )

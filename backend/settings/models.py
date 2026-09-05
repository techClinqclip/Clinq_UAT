from django.db import models
from django.conf import settings


class UserSettings(models.Model):
    """User preferences and settings"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_settings'
    )
    
    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    earnings_notifications = models.BooleanField(default=True)
    content_notifications = models.BooleanField(default=True)
    social_notifications = models.BooleanField(default=True)
    marketing_notifications = models.BooleanField(default=False)
    
    # Privacy settings
    profile_visibility = models.CharField(
        max_length=20,
        choices=[
            ('public', 'Public'),
            ('private', 'Private'),
            ('friends', 'Friends Only'),
        ],
        default='public'
    )
    show_earnings = models.BooleanField(default=True, help_text="Show earnings on profile")
    show_email = models.BooleanField(default=False)
    
    # App preferences
    theme = models.CharField(
        max_length=20,
        choices=[
            ('light', 'Light'),
            ('dark', 'Dark'),
            ('auto', 'Auto'),
        ],
        default='dark'
    )
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    
    # Content preferences
    default_content_category = models.CharField(max_length=50, blank=True)
    auto_claim_enabled = models.BooleanField(default=False, help_text="Auto-claim content matching skills")
    
    # Payment preferences
    preferred_payout_method = models.CharField(
        max_length=20,
        choices=[
            ('upi', 'UPI'),
            ('bank_transfer', 'Bank Transfer'),
            ('paypal', 'PayPal'),
        ],
        default='upi'
    )
    payout_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=2500.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Settings'
        verbose_name_plural = 'User Settings'

    def __str__(self):
        return f"Settings for {self.user.email}"

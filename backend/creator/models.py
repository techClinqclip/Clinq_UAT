from django.db import models
from django.conf import settings
from decimal import Decimal


class CreatorGig(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='creator_gigs')
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    description = models.TextField(blank=True)
    thumbnail_url = models.URLField(blank=True)
    views = models.BigIntegerField(default=0)
    submissions_count = models.IntegerField(default=0)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    paid_out = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class CreatorSubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='creator_submissions')
    gig = models.ForeignKey(CreatorGig, on_delete=models.CASCADE, related_name='submissions', null=True, blank=True)
    title = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reward = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    submitted_at = models.DateTimeField(auto_now_add=True)
    views = models.BigIntegerField(default=0)
    content_url = models.URLField(blank=True)
    feedback = models.TextField(blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)  # Soft-delete flag

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return self.title


class CreatorAnalyticsSnapshot(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='creator_analytics_snapshots')
    total_views = models.BigIntegerField(default=0)
    unique_viewers = models.BigIntegerField(default=0)
    avg_watch_time_seconds = models.IntegerField(default=0)
    total_earned = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_updated']

    def __str__(self):
        return f'Analytics snapshot for {self.user.email}'

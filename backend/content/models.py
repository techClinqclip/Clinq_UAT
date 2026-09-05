from decimal import Decimal
import uuid

from django.db import models
from django.conf import settings
from django.db.models import Count, Q, Sum
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

# Import notifications helpers for integration
try:
    from notifications.helpers import (
        notify_content_clipped,
        notify_content_engagement,
        notify_content_viral,
    )
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    notify_content_clipped = None
    notify_content_engagement = None
    notify_content_viral = None


class Content(models.Model):
    """Model representing a content/gig project."""

    HIGHLIGHT_CHOICES = [
        ("none", "Standard"),
        ("day", "Gig of the Day"),
        ("week", "Gig of the Week"),
        ("premium", "Premium Listing"),
    ]

    CATEGORY_CHOICES = [
        ("gaming", "Gaming"),
        ("lifestyle", "Lifestyle"),
        ("education", "Education"),
        ("entertainment", "Entertainment"),
        ("technology", "Technology"),
        ("sports", "Sports"),
        ("music", "Music"),
        ("art", "Art"),
        ("cooking", "Cooking"),
        ("fitness", "Fitness"),
    ]

    STATUS_CHOICES = [
        ("available", "Available"),
        ("claimed", "Claimed"),
        ("review", "In Review"),
        ("completed", "Completed"),
    ]

    # Creator relationship
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_projects",
    )

    # Basic info
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(
        max_length=50, choices=CATEGORY_CHOICES, db_index=True
    )

    # Media Logic: Storing cloud URLs
    raw_video_url = models.URLField()
    proxy_video_url = models.URLField(blank=True, null=True)
    review_url = models.URLField(blank=True, null=True)
    final_video_url = models.URLField(blank=True, null=True)
    thumbnail_url = models.URLField(blank=True, null=True)

    # Hybrid Strategy
    is_biddable = models.BooleanField(default=False)
    budget = models.DecimalField(max_digits=10, decimal_places=2)

    # Monetization Strategy
    highlight_type = models.CharField(
        max_length=20, choices=HIGHLIGHT_CHOICES, default="none"
    )
    is_paid_listing = models.BooleanField(default=False, db_index=True)

    # State Management
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="available", db_index=True
    )
    assigned_clipper = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    likes = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="liked_gigs", blank=True
    )

    class Meta:
        # Composite index: Optimization for specific get_queryset ordering
        indexes = [
            models.Index(fields=['-is_paid_listing', '-created_at']),
        ]

    def __str__(self) -> str:
        return self.title


class Bid(models.Model):
    """Model representing a bid on a content project."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

    content = models.ForeignKey(
        Content, on_delete=models.CASCADE, related_name="bids"
    )
    clipper = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    pitch = models.TextField()
    bid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.clipper.email} - {self.content} - {self.bid_amount}"


class ClipSubmission(models.Model):
    """Model representing a clip submission by a clipper."""

    PLATFORM_CHOICES = [
        ("instagram", "Instagram"),
        ("youtube", "YouTube"),
        ("tiktok", "TikTok"),
        ("facebook", "Facebook"),
        ("twitter", "Twitter/X"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    VIRAL_THRESHOLD = 10000

    # Mapping to the project
    project = models.ForeignKey(
        Content, on_delete=models.CASCADE, related_name="clip_submissions"
    )
    clipper = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE
    )

    # The "Proof of Post"
    post_url = models.URLField(unique=True)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)

    # Metric Tracking (Updated by Bots/APIs)
    views = models.IntegerField(default=0)
    reach = models.IntegerField(default=0)
    engagement_rate = models.DecimalField(
        max_digits=8, decimal_places=2, default=0.0
    )

    # Strict Moderation & Compliance
    is_moderated = models.BooleanField(default=False)
    meets_instructions = models.BooleanField(default=False)
    moderation_notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    payout_triggered = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.clipper.email} - {self.platform}"


class Campaign(models.Model):
    """Unified model for brand campaigns and creator gigs."""

    # Type differentiator
    TYPE_CHOICES = [
        ("campaign", "Brand Campaign"),
        ("gig", "Creator Gig"),
    ]

    STATUS_CHOICES = [
        # Campaign statuses
        ("active", "Active"),
        ("paused", "Paused"),
        ("inactive", "Inactive"),
        # Gig statuses
        ("available", "Available"),
        ("claimed", "Claimed"),
        ("review", "In Review"),
        # Common statuses
        ("completed", "Completed"),
        ("closed", "Closed"),
    ]

    CATEGORY_CHOICES = [
        ("gaming", "Gaming"),
        ("lifestyle", "Lifestyle"),
        ("education", "Education"),
        ("entertainment", "Entertainment"),
        ("technology", "Technology"),
        ("sports", "Sports"),
        ("music", "Music"),
        ("art", "Art"),
        ("cooking", "Cooking"),
        ("fitness", "Fitness"),
        ("podcast", "Podcast"),
        ("finance", "Finance"),
    ]

    HIGHLIGHT_CHOICES = [
        ("none", "Standard"),
        ("day", "Gig of the Day"),
        ("week", "Gig of the Week"),
        ("premium", "Premium Listing"),
    ]

    # Type field to differentiate campaigns from gigs
    type = models.CharField(
        max_length=20, 
        choices=TYPE_CHOICES, 
        default="campaign",
        db_index=True
    )
    public_access_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)

    # Creator/Brand relationship (works for both)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="campaigns",
    )

    # Basic info (common to both)
    name = models.CharField(max_length=255)  # Used for both campaigns and gigs
    brand_name = models.CharField(max_length=255, blank=True, db_index=True)  # For campaigns
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, db_index=True)
    thumbnail_url = models.TextField(blank=True, null=True)

    # Requirements and specs (common)
    clipper_requirements = models.TextField(blank=True)

    # Budget and earnings (common to both)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reward_per_1k = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # For campaigns
    max_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # For campaigns

    # Platforms (common)
    platforms = models.JSONField(default=list, blank=True)

    # Timeline (for campaigns)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Status (common)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="active", db_index=True
    )

    # Monetization (for gigs)
    highlight_type = models.CharField(
        max_length=20, choices=HIGHLIGHT_CHOICES, default="none", blank=True
    )
    is_paid_listing = models.BooleanField(default=False, db_index=True)  # For gigs
    is_biddable = models.BooleanField(default=False)  # For gigs

    # Assignment (for gigs)
    assigned_clipper = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_campaigns",
    )

    # Media URLs (for gigs)
    raw_video_url = models.URLField(blank=True, null=True)
    proxy_video_url = models.URLField(blank=True, null=True)
    review_url = models.URLField(blank=True, null=True)
    final_video_url = models.URLField(blank=True, null=True)

    # Metrics (common)
    views = models.BigIntegerField(default=0)
    submissions = models.PositiveIntegerField(default=0)
    paid_out = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closure_reason = models.CharField(max_length=20, choices=[('deadline', 'Deadline'), ('budget', 'Budget exhausted'), ('manual', 'Manual')], blank=True, default='')
    remaining_funds_settled = models.BooleanField(default=False)
    remaining_funds_settled_at = models.DateTimeField(null=True, blank=True)
    remaining_funds_settled_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Likes (for gigs)
    # Using ManyToMany would require migration, keeping as JSON for now
    # likes = models.ManyToManyField(...) 

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["creator", "-created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["type", "status"]),
        ]

    def __str__(self) -> str:
        return self.name

    def is_ended(self):
        """Check if campaign end date has passed."""
        from datetime import date
        if self.end_date and self.end_date < date.today():
            return True
        return False

    def remaining_budget_amount(self):
        """Return the unspent portion of the total budget that still requires settlement."""
        return max((self.budget or Decimal("0")) - (self.paid_out or Decimal("0")), Decimal("0"))

    def refresh_status_from_state(self):
        """Recompute campaign status from date and budget rules after edits or automatic changes."""
        from datetime import date

        if self.status == "closed":
            return True

        if self.budget and self.budget > 0 and (self.paid_out or Decimal("0")) >= self.budget:
            if self.status != "closed":
                self.status = "closed"
                self.closure_reason = 'budget'
                self.save(update_fields=["status", "closure_reason", "updated_at"])
                self._notify_closed()
            return True

        if self.end_date and self.end_date < date.today():
            if self.status != "closed":
                self.status = "closed"
                self.closure_reason = 'deadline'
                self.save(update_fields=["status", "closure_reason", "updated_at"])
                self._notify_closed()
            return True

        return False

    def _notify_closed(self):
        """Notify the owner and existing participants after an automatic close."""
        try:
            from notifications.helpers import notify_user_event, notify_users_event
            if self.creator.type == 'brand':
                notify_user_event(
                    user_id=self.creator_id,
                    event_type='content.campaign_completed',
                    title='Campaign completed',
                    message=f'{self.name} has completed.',
                    category='content',
                    entity_type='campaign',
                    payload={'campaign_id': self.id, 'reason': 'closed'},
                    idempotency_key=f'content.campaign_completed:{self.id}',
                )
            notify_users_event(
                user_ids=list(self.participants.values_list('clipper_id', flat=True)),
                event_type='content.joined_campaign_closed',
                title=f'{self.type.title()} closed',
                message=f'{self.name} is now closed.',
                category='content',
                entity_type='campaign',
                payload={'campaign_id': self.id},
                idempotency_key=f'content.joined_campaign_closed:{self.id}',
            )
        except Exception:
            # Notification delivery must never block campaign state updates.
            pass

    def update_status_if_ended(self):
        """Backward-compatible alias used by the app to close expired or exhausted campaigns."""
        return self.refresh_status_from_state()

    def recalculate_metrics(self):
        """Recalculate aggregate metrics from campaign submissions (exclude deleted from display counts, but include in earnings/views calculations)."""
        if not self.pk:
            return False

        # For submission counts only, exclude deleted submissions (for display accuracy)
        # For views and earnings, include deleted submissions so financial history is preserved
        display_stats = CampaignSubmission.objects.filter(
            participant__campaign=self,
            is_deleted=False  # Exclude deleted from submission count display
        ).aggregate(
            total_submissions=Count('id'),
        )
        
        # IMPORTANT: For views and earnings calculations, include deleted submissions
        # This ensures that when a user deletes a submission, their views and earnings are still counted
        financial_stats = CampaignSubmission.objects.filter(
            participant__campaign=self,
            status='approved'  # Include ALL approved submissions (deleted or not)
        ).aggregate(
            total_views=Sum('views'),  # Include deleted submissions' views
            total_paid_out=Sum('earning'),  # Include deleted submissions' earnings
        )

        total_views = financial_stats.get('total_views') or 0
        total_submissions = display_stats.get('total_submissions') or 0
        # Use earnings that include deleted submissions
        total_paid_out = financial_stats.get('total_paid_out') or 0

        changes = []
        if self.views != total_views:
            self.views = total_views
            changes.append('views')
        if self.submissions != total_submissions:
            self.submissions = total_submissions
            changes.append('submissions')
        if float(self.paid_out or 0) != float(total_paid_out or 0):
            self.paid_out = total_paid_out
            changes.append('paid_out')

        if self.budget and self.budget > 0 and (self.paid_out or Decimal('0')) >= self.budget and self.status != 'closed':
            self.status = 'closed'
            changes.append('status')

        if changes:
            self.save(update_fields=changes + ['updated_at'])
            return True

        return False


class CampaignResource(models.Model):
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="resources",
        db_index=True,
    )
    name = models.CharField(max_length=255, blank=True)
    url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]
        indexes = [
            models.Index(fields=["campaign", "order"]),
        ]

    def __str__(self) -> str:
        return self.name or f"Resource for {self.campaign.name}"


class CampaignParticipant(models.Model):
    """A clipper joined a campaign (even if they haven't submitted yet)."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("submitted", "Submitted"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="participants",
        db_index=True,
    )
    clipper = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="campaign_participations",
        db_index=True,
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
    )

    class Meta:
        ordering = ["-joined_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["campaign", "clipper"],
                name="unique_campaign_clipper_participant",
            )
        ]

    def __str__(self) -> str:
        return f"{self.clipper.email} in {self.campaign_id}"

    def get_total_earnings(self):
        """Get only the settled earnings already approved and transferred to the user's balance."""
        approved_submissions = self.submissions.filter(status="approved")
        total = approved_submissions.aggregate(total=Sum("earning"))["total"] or 0
        return float(total)

    def get_total_committed_earnings(self):
        """Get total committed earnings (active + pending) from approved submissions, including soft-deleted ones."""
        approved_submissions = self.submissions.filter(status="approved")
        total = sum(
            (submission.earning or Decimal("0")) + (submission.pending_earning or Decimal("0"))
            for submission in approved_submissions
        )
        return float(total)

    def has_reached_max_earnings(self):
        """Check if participant has reached the campaign's max earnings limit."""
        max_earnings = float(self.campaign.max_earnings or 0)
        if max_earnings <= 0:
            return False
        total_earnings = self.get_total_earnings()
        return total_earnings >= max_earnings

    def get_last_approved_submission(self):
        """Get the most recent approved submission (by update time)."""
        return self.submissions.filter(status="approved").order_by("-updated_at").first()

    def get_last_submission(self):
        """Get the most recent submission (any active status, by created time - excludes deleted)."""
        return self.submissions.filter(is_deleted=False).order_by("-created_at").first()

    def is_in_24hour_cooldown(self):
        """Check if participant is within 24 hours of last submission (pending or approved)."""
        from datetime import timedelta
        from django.utils import timezone
        
        last_submission = self.get_last_submission()
        if not last_submission:
            return False
        
        time_since_submission = timezone.now() - last_submission.created_at
        return time_since_submission < timedelta(hours=24)

    def is_in_48hour_cooldown(self):
        """Check if participant is within 48 hours of last approved submission (legacy)."""
        from datetime import timedelta
        from django.utils import timezone
        
        last_submission = self.get_last_approved_submission()
        if not last_submission:
            return False
        
        time_since_approval = timezone.now() - last_submission.updated_at
        return time_since_approval < timedelta(hours=48)

    def get_cooldown_info(self):
        """Return cooldown status and time remaining."""
        from datetime import timedelta
        from django.utils import timezone
        
        last_submission = self.get_last_submission()
        if not last_submission:
            return {
                'is_in_cooldown': False,
                'cooldown_ends_at': None,
                'hours_remaining': 0,
            }
        
        cooldown_hours = 24
        time_since_submission = timezone.now() - last_submission.created_at
        is_in_cooldown = time_since_submission < timedelta(hours=cooldown_hours)
        
        if is_in_cooldown:
            cooldown_end = last_submission.created_at + timedelta(hours=cooldown_hours)
            hours_remaining = round((cooldown_end - timezone.now()).total_seconds() / 3600, 2)
            return {
                'is_in_cooldown': True,
                'cooldown_ends_at': cooldown_end.isoformat(),
                'hours_remaining': max(0, hours_remaining),
                'last_submission_status': last_submission.status,
            }
        
        return {
            'is_in_cooldown': False,
            'cooldown_ends_at': None,
            'hours_remaining': 0,
        }

    def get_cooldown_debug_info(self):
        """Return debug info about cooldown status."""
        all_submissions = self.submissions.all().values('id', 'status', 'created_at', 'updated_at')
        last_approved = self.get_last_approved_submission()
        last_any = self.get_last_submission()
        
        debug = {
            'all_submissions': list(all_submissions),
            'last_approved_submission': {
                'id': last_approved.id,
                'status': last_approved.status,
                'updated_at': str(last_approved.updated_at),
            } if last_approved else None,
            'last_any_submission': {
                'id': last_any.id,
                'status': last_any.status,
                'created_at': str(last_any.created_at),
            } if last_any else None,
            'cooldown_info': self.get_cooldown_info(),
        }
        
        return debug


class CampaignSubmission(models.Model):
    """A published content submission made by a clipper for a campaign."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    participant = models.ForeignKey(
        CampaignParticipant,
        on_delete=models.CASCADE,
        related_name="submissions",
        db_index=True,
        null=True,
        blank=True,
    )
    platform = models.CharField(max_length=20, choices=ClipSubmission.PLATFORM_CHOICES)
    platform_username = models.CharField(max_length=100, blank=True)
    content_url = models.URLField(db_column='post_url', blank=True)
    earning = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pending_earning = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    review_checks = models.JSONField(default=dict, blank=True)
    review_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    payout_review_status = models.CharField(max_length=20, choices=[('pending', 'Pending'), ('approved', 'Approved'), ('held', 'Held')], default='pending', db_index=True)
    payout_review_notes = models.TextField(blank=True)
    payout_reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_payout_submissions')
    payout_reviewed_at = models.DateTimeField(null=True, blank=True)
    likes = models.IntegerField(default=0)
    views = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
    )
    is_deleted = models.BooleanField(default=False, db_index=True)  # Soft-delete flag (preserves original status for calculations)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'content_campaignsubmission'
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["participant", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["participant", "content_url"],
                condition=models.Q(is_deleted=False),
                name="unique_active_participant_content_url",
            ),
        ]

    def __str__(self) -> str:
        return f"CampaignSubmission {self.id} for participant {self.participant_id}"

    def save(self, *args, **kwargs):
        """Maintain approved and pending earning balances as view metrics change."""
        skip_earning_update = kwargs.pop("skip_earning_update", False)
        if not skip_earning_update:
            if self.status == "approved":
                if (self.views or 0) > 0:
                    self._reconcile_earnings_values()
                elif self.earning and Decimal(str(self.earning)) > 0:
                    self.pending_earning = Decimal("0")
                else:
                    self.earning = Decimal("0")
                    self.pending_earning = Decimal("0")
            else:
                self.earning = Decimal("0")
                self.pending_earning = Decimal("0")
        super().save(*args, **kwargs)

    def _should_recalculate_earning(self):
        """Return True when the earning needs to be recomputed due to meaningful changes."""
        if self.pk is None:
            return True

        try:
            previous = self.__class__.objects.only("views", "status", "participant_id", "earning", "pending_earning").get(pk=self.pk)
        except self.__class__.DoesNotExist:
            return True

        return (
            self.views != previous.views
            or self.status != previous.status
            or self.participant_id != previous.participant_id
            or self.earning in (None, Decimal("0"))
            or self.pending_earning in (None, Decimal("0"))
        )

    def _reconcile_earnings_values(self):
        """Grow the pending earning amount when approved submission reach increases."""
        target_total = Decimal(str(self.calculate_earning()))
        previous = None
        if self.pk:
            try:
                previous = self.__class__.objects.only("earning", "pending_earning").get(pk=self.pk)
            except self.__class__.DoesNotExist:
                previous = None

        if previous is None:
            self.earning = Decimal("0")
            self.pending_earning = target_total
            return

        previous_active = Decimal(previous.earning or 0)
        previous_pending = Decimal(previous.pending_earning or 0)
        previous_total = previous_active + previous_pending

        if target_total <= previous_total:
            reduction = previous_total - target_total
            if previous_pending >= reduction:
                self.pending_earning = previous_pending - reduction
            else:
                self.pending_earning = Decimal("0")
            self.earning = previous_active
            return

        self.earning = previous_active
        self.pending_earning = previous_pending + (target_total - previous_total)

    def approve_pending_earning(self):
        """Move pending earnings into active earning after admin settlement."""
        if self.status != "approved":
            return
        pending_amount = Decimal(self.pending_earning or 0)
        if pending_amount <= 0:
            return

        self.earning = Decimal(self.earning or 0) + pending_amount
        self.pending_earning = Decimal("0")
        self.save(update_fields=["earning", "pending_earning", "updated_at"], skip_earning_update=True)

    def calculate_earning(self):
        """Calculate earning based on views and the remaining campaign earning cap."""
        if not self.participant or not self.participant.campaign:
            return 0

        campaign = self.participant.campaign
        reward_per_1k = float(campaign.reward_per_1k or 0)
        if reward_per_1k <= 0 or self.views <= 0:
            return 0

        if self.status != "approved":
            return 0

        base_earning = (self.views / 1000) * reward_per_1k
        max_earnings = float(campaign.max_earnings or 0)
        if max_earnings <= 0:
            return round(float(base_earning), 2)

        existing_total = float(self.participant.get_total_committed_earnings() or 0)
        if self.pk:
            existing_total -= float(self.earning or 0)
            existing_total -= float(self.pending_earning or 0)

        remaining_capacity = max_earnings - existing_total
        if remaining_capacity <= 0:
            return 0

        return round(float(min(base_earning, remaining_capacity)), 2)

    def update_earning(self):
        """Refresh pending earning based on the latest approved views and cap."""
        self._reconcile_earnings_values()
        self.save(update_fields=["views", "earning", "pending_earning", "updated_at"], skip_earning_update=True)



# ============================================================================
# Signal Handlers
# ============================================================================


def sync_campaign_submissions_with_clip_submission(clip_submission):
    """Find CampaignSubmission(s) by the clip's post_url and sync views.

    This central helper updates `views` on matching CampaignSubmission rows
    and ensures approved submissions have their earnings recalculated.
    """
    if not clip_submission or not hasattr(clip_submission, 'post_url'):
        return

    try:
        related = CampaignSubmission.objects.filter(content_url=clip_submission.post_url)
        for cs in related:
            if cs.views != clip_submission.views:
                cs.views = clip_submission.views or 0
                try:
                    cs.save()
                except Exception:
                    pass
            else:
                try:
                    if cs.status == 'approved' and (cs.earning is None or float(cs.earning) <= 0):
                        cs.update_earning()
                except Exception:
                    pass
    except Exception:
        return




@receiver(post_save, sender=ClipSubmission)
def clip_submission_notification_handler(
    sender, instance, created, **kwargs
):
    """
    Send notifications when clip submissions are created or verified.
    """
    if not NOTIFICATIONS_AVAILABLE:
        return

    creator_id = str(instance.project.creator.id)
    clipper_id = str(instance.clipper.id)
    clipper_name = instance.clipper.email
    content_id = str(instance.project.id)
    content_title = instance.project.title

    # Notify creator when clipper submits work
    if created and notify_content_clipped:
        notify_content_clipped(
            user_id=creator_id,
            content_id=content_id,
            clipper_name=clipper_name,
            clipper_id=clipper_id,
            content_title=content_title,
        )

    # Notify when submission is verified (payment released)
    if instance.status == "verified" and not instance.payout_triggered:
        if notify_content_engagement:
            notify_content_engagement(
                user_id=clipper_id,
                content_id=content_id,
                content_title=content_title,
                views=instance.views,
            )


@receiver(post_save, sender=ClipSubmission)
def clip_submission_sync_handler(sender, instance, created, **kwargs):
    """Always sync CampaignSubmission views/earnings when a ClipSubmission is saved."""
    try:
        sync_campaign_submissions_with_clip_submission(instance)
    except Exception:
        pass


def check_viral_milestone(sender, instance, **kwargs):
    """
    Check if a clip submission has gone viral.
    Called after views are updated.
    """
    if not NOTIFICATIONS_AVAILABLE or not notify_content_viral:
        return

    if instance.views >= ClipSubmission.VIRAL_THRESHOLD:
        notify_content_viral(
            user_id=str(instance.clipper.id),
            content_id=str(instance.project.id),
            content_title=instance.project.title,
            views=instance.views,
        )


@receiver(post_save, sender=CampaignSubmission)
def campaign_submission_post_save(sender, instance, created, **kwargs):
    """Ensure earnings and campaign aggregate metrics remain correct.

    This handles create/update events for campaign submissions and keeps the
    parent campaign's views, submissions, and paid_out counters in sync.
    """
    try:
        if instance.participant and instance.participant.campaign:
            instance.participant.campaign.recalculate_metrics()
    except Exception:
        pass




@receiver(post_delete, sender=CampaignSubmission)
def campaign_submission_post_delete(sender, instance, **kwargs):
    """Update campaign aggregates when a campaign submission is deleted."""
    try:
        if instance.participant and instance.participant.campaign:
            instance.participant.campaign.recalculate_metrics()
    except Exception:
        pass


@receiver(pre_save, sender=CampaignSubmission)
def campaign_submission_pre_save(sender, instance, **kwargs):
    """Capture previous values before save so post_save knows what changed."""
    if not instance.pk:
        instance._prev_views = None
        instance._prev_status = None
        instance._prev_earning = None
        return

    try:
        prev = sender.objects.only("views", "status", "earning", "pending_earning").get(pk=instance.pk)
        instance._prev_views = prev.views
        instance._prev_status = prev.status
        instance._prev_earning = float(prev.earning or 0)
    except sender.DoesNotExist:
        instance._prev_views = None
        instance._prev_status = None
        instance._prev_earning = None


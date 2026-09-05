"""
Production-ready Notifications models for Django.

This module defines the notification data models including:
- NotificationCategory: Types of notifications
- NotificationChannel: Delivery channels (in-app, email, push)
- NotificationPreference: User preferences per category/channel
- NotificationEvent: Core event model with idempotency support
- UserNotification: User-bound notifications with read state
- BroadcastNotification: Role-based and global broadcast notifications

Design Decisions:
1. Uses AUTH_USER_MODEL for flexibility with custom user model
2. UUID primary keys for distributed systems compatibility
3. JSONField for flexible notification metadata
4. Unique constraints for idempotency prevention
5. Indexed fields for query optimization
"""

import uuid
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone

# Import CustomUser for USER_TYPE_CHOICES (used in BroadcastNotification)
# We import at module level to make the choices available
try:
    from accounts.models import CustomUser
    USER_TYPE_CHOICES = [('', 'All Users')] + list(CustomUser.USER_TYPE_CHOICES)
except ImportError:
    USER_TYPE_CHOICES = [('', 'All Users'), ('creator', 'Creator'), ('clipper', 'Clipper'), ('brand', 'Brand')]


class NotificationCategory(models.TextChoices):
    """
    Notification categories aligned with app modules.
    
    Categories are used to:
    - Group notifications logically
    - Enable category-specific user preferences
    - Filter notifications in the UI
    """
    SYSTEM = 'system', 'System'
    CONTENT = 'content', 'Content'
    COURSE = 'course', 'Course'
    ADMIN = 'admin', 'Admin'
    COMMUNITY = 'community', 'Community'
    SUPPORT = 'support', 'Support'
    LEADERBOARD = 'leaderboard', 'Leaderboard'
    REFERRAL = 'referral', 'Referral'
    EARNINGS = 'earnings', 'Earnings'


class NotificationChannel(models.TextChoices):
    """
    Delivery channels for notifications.
    
    Currently supports in-app notifications.
    Designed to be extended for email and push notifications.
    """
    IN_APP = 'in_app', 'In-App'
    EMAIL = 'email', 'Email'
    PUSH = 'push', 'Push'


class NotificationPriority(models.TextChoices):
    """
    Notification priority levels for sorting and delivery decisions.
    """
    LOW = 'low', 'Low'
    NORMAL = 'normal', 'Normal'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class NotificationPreference(models.Model):
    """
    User notification preferences per category and channel.
    
    This model allows granular control over which notifications
    users receive through which channels.
    
    Example:
        User can disable email notifications for content updates
        but keep push notifications enabled for earnings.
    
    Design:
    - Composite unique constraint on (user, category, channel)
    - Null enabled means default behavior (enabled)
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
        db_index=True, 
        null=True, 
        blank=True,
    )
    category = models.CharField(
        max_length=50,
        choices=NotificationCategory.choices,
        db_index=True
    )
    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices,
        db_index=True
    )
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'category', 'channel')
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'
        indexes = [
            models.Index(fields=['user', 'category']),
            models.Index(fields=['user', 'channel']),
        ]

    def __str__(self):
        status = 'enabled' if self.enabled else 'disabled'
        return f"{self.user.email} - {self.category} via {self.channel} ({status})"


class NotificationEvent(models.Model):
    """
    Core notification event model.
    
    Represents a single event that can trigger notifications to one or more users.
    Uses idempotency_key to prevent duplicate event creation.
    
    Design:
    - UUID primary key for distributed system compatibility
    - idempotency_key unique constraint prevents duplicates
    - JSON payload for flexible metadata
    - actor_id tracks who triggered the event
    - entity_type/entity_id link to related content
    
    Scalability:
    - Indexed idempotency_key for fast duplicate checks
    - Indexed created_at for time-based queries
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Event identification
    event_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Type of event (e.g., 'content.clipped', 'earnings.paid')"
    )
    
    # Actor tracking (who caused the event)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notification_events_created',
        db_index=True,
        help_text="User who triggered this event"
    )
    
    # Entity reference (what the event is about)
    entity_type = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Type of entity (e.g., 'content', 'user', 'leaderboard')"
    )
    entity_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="ID of the related entity"
    )
    
    # Content and metadata
    title = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Notification title template"
    )
    message = models.TextField(
        help_text="Notification message content",
        default="Hello"
    )
    payload = models.JSONField(
        default=dict,
        help_text="Additional event metadata (JSON)"
    )
    
    # Idempotency
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Unique key to prevent duplicate events"
    )
    
    # Priority and scope
    priority = models.CharField(
        max_length=20,
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL,
        db_index=True,
        help_text="Event priority for sorting"
    )
    category = models.CharField(
        max_length=50,
        choices=NotificationCategory.choices,
        default=NotificationCategory.SYSTEM,
        db_index=True
    )
    
    # Rate limiting
    rate_limit_key = models.CharField(
        max_length=255,
        blank=True,
        default='',
        db_index=True,
        help_text="Key for rate limiting (e.g., 'user:123:content')"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', '-created_at']),
            models.Index(fields=['category', '-created_at']),
            models.Index(fields=['actor', '-created_at']),
        ]
        verbose_name = 'Notification Event'
        verbose_name_plural = 'Notification Events'

    def __str__(self):
        return f"{self.event_type} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    @classmethod
    def get_idempotency_key(cls, event_type: str, entity_type: str, entity_id: str, actor_id: str = None) -> str:
        """
        Generate a unique idempotency key for an event.
        
        Args:
            event_type: Type of event
            entity_type: Type of entity
            entity_id: ID of the entity
            actor_id: ID of the actor (optional)
        
        Returns:
            Unique string key for this event combination
        """
        actor = str(actor_id) if actor_id else "system"
        # 1. Use a rare separator (like a colon or pipe) to reduce string overlap
        parts = [event_type, entity_type, str(entity_id)]
        if actor:
            parts.append(str(actor))

        raw_key = ':'.join(parts)

        # 2. Hash the key to prevent length issues in Redis/DB and ensure uniqueness
        # Using SHA-256 is standard for idempotency
        return hashlib.sha256(raw_key.encode()).hexdigest()


class UserNotification(models.Model):
    """
    User-bound notification with read/archived state.
    
    This is the main model users interact with. Each notification
    is bound to a specific user and has read/archived states.
    
    Design:
    - UUID primary key for distributed systems
    - Unique constraint on (user, event) prevents duplicate notifications
    - Indexed user_id and is_read for fast inbox queries
    - Soft delete via is_archived flag
    
    Performance:
    - Composite index on (user, -created_at) for inbox queries
    - Index on is_read for filtering
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # User binding
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
        null=True,
        blank=True
    )
    
    # Event reference
    event = models.ForeignKey(
        NotificationEvent,
        on_delete=models.CASCADE,
        related_name='user_notifications'
    )
    
    # State management
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether user has read this notification"
    )
    is_archived = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete - archived by user"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When user marked this as read"
    )

    class Meta:
        unique_together = ('user', 'event')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', 'is_archived', '-created_at']),
        ]
        verbose_name = 'User Notification'
        verbose_name_plural = 'User Notifications'

    def __str__(self):
        status = 'read' if self.is_read else 'unread'
        return f"{self.user.email} - {self.event.event_type} ({status})"

    def mark_as_read(self, using=None):
        """
        Mark this notification as read with timestamp.
        
        Uses update() for atomic operation and returns affected rows.
        """
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'], using=using)
        return self


class BroadcastNotification(models.Model):
    """
    Broadcast notifications for role-based or global announcements.
    
    Used for:
    - Platform-wide announcements
    - Role-specific notifications (e.g., all creators)
    - Marketing campaigns
    - System maintenance notices
    
    Design:
    - Optional targeting via user_type filter
    - Scheduled delivery with start/end times
    - Active flag for draft/publish control
    - Read tracking per user
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # Content
    title = models.CharField(
        max_length=255,
        help_text="Broadcast title"
    )
    message = models.TextField(
        help_text="Broadcast message content"
    )
    category = models.CharField(
        max_length=50,
        choices=NotificationCategory.choices,
        default=NotificationCategory.ADMIN,
        help_text="Notification category"
    )
    priority = models.CharField(
        max_length=20,
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL
    )
    
    # Targeting
    target_user_type = models.CharField(
        max_length=50,
        choices=[('', 'All Users')] + list(CustomUser.USER_TYPE_CHOICES),
        blank=True,
        default='',
        db_index=True,
        help_text="Specific user type to target (empty = all users)"
    )
    target_segment = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Optional segment filter (e.g., 'premium', 'active')"
    )
    
    # Scheduling
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether broadcast is active"
    )
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When to send the broadcast"
    )
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the broadcast expires"
    )
    
    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='broadcast_notifications_created'
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )
    
    # Statistics (updated via signals/tasks)
    total_recipients = models.IntegerField(
        default=0,
        help_text="Number of users who received this broadcast"
    )
    read_count = models.IntegerField(
        default=0,
        help_text="Number of users who read this broadcast"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', '-created_at']),
            models.Index(fields=['target_user_type', '-created_at']),
            models.Index(fields=['scheduled_at', 'is_active']),
        ]
        verbose_name = 'Broadcast Notification'
        verbose_name_plural = 'Broadcast Notifications'

    def __str__(self):
        return f"{self.title} - {self.created_at.strftime('%Y-%m-%d')}"


class BroadcastReadReceipt(models.Model):
    """
    Tracks which users have read which broadcast notifications.
    
    Design:
    - Unique constraint prevents duplicate tracking
    - Indexed for fast lookup
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='broadcast_read_receipts',
        db_index=True
    )
    broadcast = models.ForeignKey(
        BroadcastNotification,
        on_delete=models.CASCADE,
        related_name='read_receipts'
    )
    read_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ('user', 'broadcast')
        indexes = [
            models.Index(fields=['broadcast', 'user']),
        ]

    def __str__(self):
        return f"{self.user.email} read {self.broadcast.title}"


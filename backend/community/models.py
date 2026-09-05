from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging
logger = logging.getLogger(__name__)
# Import notifications helpers for integration
try:
    from notifications.helpers import (
        notify_community_reply,
        notify_community_featured,
        notify_community_event
    )
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    notify_community_reply = None
    notify_community_featured = None
    notify_community_event = None

class Discussion(models.Model):
    """Community discussion/forum posts"""
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussions'
    )
    category = models.CharField(
        max_length=50,
        choices=[
            ('general', 'General'),
            ('tips', 'Tips & Tricks'),
            ('showcase', 'Showcase'),
            ('help', 'Help & Support'),
            ('announcements', 'Announcements'),
        ],
        default='general'
    )
    tags = models.CharField(max_length=255, blank=True, help_text="Comma-separated tags")
    media = models.JSONField(default=list, blank=True, help_text="List of media URLs for the discussion")
    poll = models.JSONField(default=dict, blank=True, help_text="Poll payload for the discussion")
    views_count = models.IntegerField(default=0)
    likes_count = models.IntegerField(default=0)
    replies_count = models.IntegerField(default=0)
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['category', '-created_at']),
            models.Index(fields=['author', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} by {self.author.email}"


class DiscussionReply(models.Model):
    """Replies to discussions"""
    discussion = models.ForeignKey(
        Discussion,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussion_replies'
    )
    content = models.TextField()
    likes_count = models.IntegerField(default=0)
    is_solution = models.BooleanField(default=False, help_text="Marked as solution by OP")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['discussion', 'created_at']),
        ]

    def __str__(self):
        return f"Reply to {self.discussion.title} by {self.author.email}"


class DiscussionLike(models.Model):
    """Track likes on discussions and replies"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussion_likes'
    )
    discussion = models.ForeignKey(
        Discussion,
        on_delete=models.CASCADE,
        related_name='likes',
        null=True,
        blank=True
    )
    reply = models.ForeignKey(
        DiscussionReply,
        on_delete=models.CASCADE,
        related_name='likes',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [
            ('user', 'discussion'),
            ('user', 'reply'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(discussion__isnull=False) | models.Q(reply__isnull=False),
                name='discussion_or_reply_required'
            )
        ]

    def __str__(self):
        if self.discussion:
            return f"{self.user.email} liked {self.discussion.title}"
        return f"{self.user.email} liked reply"


class CommunityEvent(models.Model):
    """Community events and meetups"""
    title = models.CharField(max_length=255)
    description = models.TextField()
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='organized_events'
    )
    event_type = models.CharField(
        max_length=50,
        choices=[
            ('webinar', 'Webinar'),
            ('workshop', 'Workshop'),
            ('meetup', 'Meetup'),
            ('contest', 'Contest'),
            ('challenge', 'Challenge'),
        ],
        default='webinar'
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_online = models.BooleanField(default=True)
    meeting_link = models.URLField(blank=True)
    max_participants = models.IntegerField(null=True, blank=True)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='events_participated',
        blank=True
    )
    participants_count = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_featured', 'start_date']
        indexes = [
            models.Index(fields=['event_type', 'start_date']),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_event_type_display()}"


# Signal handlers for notifications
@receiver(post_save, sender=DiscussionReply)
def discussion_reply_notification_handler(sender, instance, created, **kwargs):
    """
    Send notification when someone replies to a discussion
    """
    if not NOTIFICATIONS_AVAILABLE or not notify_community_reply:
        return
    
    if created:
        # Notify the discussion author
        discussion_author_id = str(instance.discussion.author.id)
        # Don't notify if the reply is from the author themselves
        if str(instance.author.id) != discussion_author_id:
            try:
                notify_community_reply(
                    user_id=discussion_author_id,
                    author_id=str(instance.author.id),
                    author_name=instance.author.email,
                    discussion_title=instance.discussion.title,
                    reply_id=instance.id,
                )
            except Exception:
                logger.exception("Failed to send community reply notification")
                
                
@receiver(post_save, sender=Discussion)
def discussion_featured_notification_handler(sender, instance, created, **kwargs):
    """
    Send notification when a discussion is featured/pinned
    """
    if not NOTIFICATIONS_AVAILABLE or not notify_community_featured:
        return
    
    # Check if is_pinned was just set to True
    if kwargs.get('update_fields') and 'is_pinned' in kwargs.get('update_fields', []):
        if instance.is_pinned:
            try:
                notify_community_featured(
                    user_id=str(instance.author.id),
                    content_type='discussion',
                    title=instance.title,
                )
            except Exception:
                logger.exception("Failed to send community featured notification")
                
@receiver(post_save, sender=CommunityEvent)
def community_event_notification_handler(sender, instance, created, **kwargs):
    """
    Send notification when a new community event is created
    """
    if not NOTIFICATIONS_AVAILABLE or not notify_community_event:
        return
    
    if created:
        # Notify the organizer that their event was created
        try:
            notify_community_event(
                user_ids=[str(instance.organizer.id)],
                event_title=instance.title,
                event_description=instance.description,
                event_date=str(instance.start_date),
            )
        except Exception:
            logger.exception("Failed to send community event notification")
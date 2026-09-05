"""
Notification Serializers for DRF.

Provides serialization/deserialization for notification models:
- UserNotificationSerializer: User notification representation
- NotificationPreferenceSerializer: User preferences
- BroadcastNotificationSerializer: Admin broadcast management
- NotificationCreateSerializer: Creating new notifications

Design:
- Read-only fields for computed/generated values
- Proper validation for user input
- Nested serializers for related objects
"""

from rest_framework import serializers
from datetime import timedelta
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field

from .models import (
    UserNotification,
    NotificationPreference,
    NotificationEvent,
    BroadcastNotification,
    BroadcastReadReceipt,
    NotificationCategory,
    NotificationChannel,
    NotificationPriority,
)


class NotificationEventSerializer(serializers.ModelSerializer):
    """Serializer for NotificationEvent model."""
    
    class Meta:
        model = NotificationEvent
        fields = [
            'id',
            'event_type',
            'actor',
            'entity_type',
            'entity_id',
            'title',
            'message',
            'payload',
            'priority',
            'category',
            'created_at',
        ]
        read_only_fields = fields


class UserNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for UserNotification model.
    
    Includes nested event details for full notification context.
    """
    
    event = NotificationEventSerializer(read_only=True)
    time_since_created = serializers.SerializerMethodField()
    
    class Meta:
        model = UserNotification
        fields = [
            'id',
            'event',
            'is_read',
            'is_archived',
            'created_at',
            'read_at',
            'time_since_created',
        ]
        read_only_fields = ['id', 'event', 'created_at', 'read_at', 'time_since_created']
    @extend_schema_field(serializers.DateTimeField)
    def get_time_since_created(self, obj):
        """Calculate human-readable time since notification was created."""
        now = timezone.now()
        delta = now - obj.created_at
        
        seconds = delta.total_seconds()
        if seconds < 60:
            return 'Just now'
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f'{minutes} minute{"s" if minutes > 1 else ""} ago'
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f'{hours} hour{"s" if hours > 1 else ""} ago'
        else:
            days = int(seconds / 86400)
            return f'{days} day{"s" if days > 1 else ""} ago'


class UserNotificationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating notifications via API.
    
    Used by admin endpoints to create notifications for users.
    """
    
    user_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=1000,
        help_text="List of user IDs to notify"
    )
    event_type = serializers.CharField(
        max_length=100,
        help_text="Type of event (e.g., 'content.liked')"
    )
    title = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default='',
        help_text="Notification title"
    )
    message = serializers.CharField(
        help_text="Notification message"
    )
    category = serializers.ChoiceField(
        choices=NotificationCategory.choices,
        default=NotificationCategory.SYSTEM,
        help_text="Notification category"
    )
    priority = serializers.ChoiceField(
        choices=NotificationPriority.choices,
        default=NotificationPriority.NORMAL,
        required=False,
        help_text="Notification priority"
    )
    entity_type = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        default='',
        help_text="Type of related entity"
    )
    entity_id = serializers.UUIDField(
        required=False,
        allow_null=True,
        default=None,
        help_text="ID of related entity"
    )
    payload = serializers.JSONField(
        required=False,
        default=dict,
        help_text="Additional metadata"
    )
    
    def validate_user_ids(self, value):
        """Validate that all user IDs are provided."""
        if not value:
            raise serializers.ValidationError("At least one user ID is required")
        return value


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for NotificationPreference model.
    
    Allows users to manage their notification preferences.
    """
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'category',
            'channel',
            'enabled',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate preference data."""
        # Ensure unique constraint won't be violated
        if self.instance:
            existing = NotificationPreference.objects.filter(
                user=self.instance.user,
                category=data.get('category', self.instance.category),
                channel=data.get('channel', self.instance.channel),
            ).exclude(id=self.instance.id)
        else:
            existing = NotificationPreference.objects.filter(
                user=data['user'],
                category=data['category'],
                channel=data['channel'],
            )
        
        if existing.exists():
            raise serializers.ValidationError(
                "Preference for this category and channel already exists"
            )
        
        return data


class NotificationPreferenceBulkSerializer(serializers.Serializer):
    """
    Serializer for bulk updating notification preferences.
    
    Allows setting preferences for multiple categories/channels at once.
    """
    
    preferences = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of preference dictionaries"
    )
    
    def validate_preferences(self, value):
        """Validate each preference in the list."""
        valid_categories = [c[0] for c in NotificationCategory.choices]
        valid_channels = [c[0] for c in NotificationChannel.choices]
        
        for i, pref in enumerate(value):
            if 'category' not in pref:
                raise serializers.ValidationError(
                    f"Preference {i}: category is required"
                )
            if 'channel' not in pref:
                raise serializers.ValidationError(
                    f"Preference {i}: channel is required"
                )
            if pref['category'] not in valid_categories:
                raise serializers.ValidationError(
                    f"Preference {i}: invalid category '{pref['category']}'"
                )
            if pref['channel'] not in valid_channels:
                raise serializers.ValidationError(
                    f"Preference {i}: invalid channel '{pref['channel']}'"
                )
        
        return value


class BroadcastNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for BroadcastNotification model.
    
    Used by admin endpoints for broadcast management.
    """
    
    read_rate = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = BroadcastNotification
        fields = [
            'id',
            'title',
            'message',
            'category',
            'priority',
            'target_user_type',
            'target_segment',
            'is_active',
            'scheduled_at',
            'expires_at',
            'created_by',
            'created_at',
            'updated_at',
            'total_recipients',
            'read_count',
            'read_rate',
            'status',
        ]
        read_only_fields = [
            'id',
            'created_by',
            'created_at',
            'updated_at',
            'total_recipients',
            'read_count',
            'read_rate',
            'status',
        ]
    @extend_schema_field(serializers.FloatField)
    def get_read_rate(self, obj):
        """Calculate read rate percentage."""
        if obj.total_recipients > 0:
            return round(obj.read_count / obj.total_recipients * 100, 2)
        return 0
    @extend_schema_field(serializers.StringRelatedField)
    def get_status(self, obj):
        """Get broadcast status."""
        if not obj.is_active:
            return 'cancelled'
        if obj.expires_at and timezone.now() > obj.expires_at:
            return 'expired'
        if obj.scheduled_at and timezone.now() < obj.scheduled_at:
            return 'scheduled'
        return 'active'
    
    def create(self, validated_data):
        """Set created_by from request."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class BroadcastNotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating broadcast notifications.
    
    Simplified serializer for broadcast creation.
    """
    
    class Meta:
        model = BroadcastNotification
        fields = [
            'title',
            'message',
            'category',
            'priority',
            'target_user_type',
            'target_segment',
            'scheduled_at',
            'expires_at',
        ]
    def validate_scheduled_at(self, value):
        """Field-level validation for scheduled_at."""
        if value:
            # Allow a 60-second grace period for network/processing latency
            if value < timezone.now() - timedelta(seconds=60):
                raise serializers.ValidationError("Scheduled time must be in the future.")
        return value

    def validate(self, data):
        """Validate broadcast data."""
        # Ensure scheduled broadcasts have a scheduled_at time
        """Cross-field validation for scheduling vs expiration."""
        scheduled_at = data.get('scheduled_at')
        expires_at = data.get('expires_at')

        # If it's an immediate broadcast, use 'now' for comparison logic
        comparison_start = scheduled_at or timezone.now()

        if expires_at:
            if expires_at <= comparison_start:
                raise serializers.ValidationError({
                    'expires_at': 'Expiration time must be after the start/scheduled time.'
                })
        
        return data


class BroadcastReadReceiptSerializer(serializers.ModelSerializer):
    """Serializer for BroadcastReadReceipt model."""
    
    class Meta:
        model = BroadcastReadReceipt
        fields = ['id', 'user', 'broadcast', 'read_at']
        read_only_fields = fields


class MarkReadSerializer(serializers.Serializer):
    """
    Serializer for marking notifications as read.
    
    Can mark single or multiple notifications.
    """
    
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text="List of notification IDs to mark as read"
    )
    all = serializers.BooleanField(
        default=False,
        required=False,
        help_text="Mark all notifications as read"
    )

    
    def validate(self, data):
        """Validate that either notification_ids or all is provided."""
        if not data.get('notification_ids') and not data.get('all'):
            raise serializers.ValidationError(
                "Either notification_ids or all=true must be provided"
            )
        return data


class NotificationArchiveSerializer(serializers.Serializer):
    """
    Serializer for archiving notifications.
    
    Soft delete functionality.
    """
    
    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100,
        help_text="List of notification IDs to archive"
    )


class NotificationListFilterSerializer(serializers.Serializer):
    """
    Serializer for notification list filtering parameters.
    """
    
    is_read = serializers.BooleanField(required=False, allow_null=True)
    is_archived = serializers.BooleanField(default=False)
    category = serializers.ChoiceField(
        choices=NotificationCategory.choices,
        required=False,
        allow_null=True
    )
    event_type = serializers.CharField(max_length=100, required=False)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)


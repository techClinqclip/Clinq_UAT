"""
Notification Dispatcher Service.

This module provides the core notification dispatching logic including:
- Bulk notification creation with atomic transactions
- Idempotency handling to prevent duplicates
- Rate limiting support
- User preference filtering

Design Principles:
1. Atomic operations for data consistency
2. Graceful degradation when notifications module is unavailable
3. Efficient bulk operations for scalability
4. Idempotency keys for duplicate prevention
"""

import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from django.conf import settings

from notifications.models import (
    NotificationEvent,
    UserNotification,
    NotificationPreference,
    NotificationCategory,
    NotificationChannel,
)
from .rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class NotificationDispatchError(Exception):
    """Custom exception for notification dispatching errors."""
    pass


class NotificationDispatcher:
    """
    Core service for dispatching notifications to users.
    
    Handles:
    - Event creation with idempotency
    - User notification generation
    - Rate limiting
    - User preference filtering
    
    Usage:
        dispatcher = NotificationDispatcher()
        event = dispatcher.create_event(
            event_type="content.liked",
            message="Your content was liked by user123",
            category=NotificationCategory.CONTENT,
            actor_id=user_id,
            entity_type="content",
            entity_id=content_id
        )
        dispatcher.dispatch_to_users(event, [user1_id, user2_id])
    """
    
    def __init__(self, rate_limiter: Optional[RateLimiter] = None):
        """
        Initialize the dispatcher.
        
        Args:
            rate_limiter: Optional custom rate limiter instance
        """
        self.rate_limiter = rate_limiter or RateLimiter()
    
    def create_event(
        self,
        event_type: str,
        message: str,
        category: str,
        actor_id: Optional[uuid.UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        title: str = "",
        payload: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        priority: str = "normal",
        rate_limit_key: str = "",
    ) -> NotificationEvent:
        """
        Create a notification event with idempotency support.
        
        This method ensures that duplicate events are not created
        based on the idempotency_key. If an event with the same
        key already exists, it returns the existing event.
        
        Args:
            event_type: Type of event (e.g., 'content.liked')
            message: Notification message
            category: Notification category
            actor_id: User who triggered the event
            entity_type: Type of related entity
            entity_id: ID of related entity
            title: Optional title
            payload: Additional metadata
            idempotency_key: Unique key to prevent duplicates
            priority: Event priority level
            rate_limit_key: Key for rate limiting
        
        Returns:
            The created or existing NotificationEvent
        
        Raises:
            NotificationDispatchError: If event creation fails
        """
        payload = payload or {}
        
        # Generate idempotency key if not provided
        if not idempotency_key:
            idempotency_key = self._generate_idempotency_key(
                event_type, entity_type, entity_id, actor_id
            )
        
        try:
            # Use get_or_create for idempotency
            with transaction.atomic():
                event, created = NotificationEvent.objects.select_for_update().get_or_create(
                    idempotency_key=idempotency_key,
                    defaults={
                        'event_type': event_type,
                        'message': message,
                        'category': category,
                        'actor_id': actor_id,
                        'entity_type': entity_type or '',
                        'entity_id': entity_id,
                        'title': title,
                        'payload': payload,
                        'priority': priority,
                        'rate_limit_key': rate_limit_key,
                    }
                )
            
            if created:
                logger.info(f"Created notification event: {event_type} (id: {event.id})")
            else:
                logger.debug(f"Returned existing notification event: {event_type}")
            
            return event
            
        except Exception as e:
            logger.error(f"Failed to create notification event: {e}")
            raise NotificationDispatchError(f"Event creation failed: {e}")
    
    def dispatch_to_users(
        self,
        event: NotificationEvent,
        user_ids: List[uuid.UUID],
        skip_preferences: bool = False,
    ) -> List[UserNotification]:
        """
        Dispatch a notification event to multiple users.
        
        Creates UserNotification records for each user, respecting
        their notification preferences. Uses bulk_create for efficiency.
        
        Args:
            event: The NotificationEvent to dispatch
            user_ids: List of user IDs to notify
            skip_preferences: If True, skip preference checking
        
        Returns:
            List of created UserNotification objects
        
        Raises:
            NotificationDispatchError: If dispatch fails
        """
        if not user_ids:
            return []
        
        try:
            # Filter users by preferences if not skipped
            if not skip_preferences:
                user_ids = self._filter_by_preferences(user_ids, event.category)
            
            if not user_ids:
                logger.debug(f"No users to notify after preference filtering")
                return []
            
            # Check rate limits for bulk dispatch
            if self.rate_limiter:
                allowed, _ = self.rate_limiter.check_rate_limit(
                    f"bulk_dispatch:{event.event_type}",
                    len(user_ids)
                )
                if not allowed:
                    logger.warning(f"Rate limit exceeded for bulk dispatch")
                    # Continue anyway, but log warning
            
            # Get existing notifications to avoid duplicates
            existing = set(
                UserNotification.objects.filter(
                    event=event,
                    user_id__in=user_ids
                ).values_list('user_id', flat=True)
            )
            
            # Filter out users who already have this notification
            new_user_ids = [uid for uid in user_ids if uid not in existing]
            
            if not new_user_ids:
                logger.debug("All users already have this notification")
                return []
            
            # Bulk create user notifications
            user_notifications = [
                UserNotification(
                    user_id=user_id,
                    event=event,
                )
                for user_id in new_user_ids
            ]
            
            with transaction.atomic():
                created = UserNotification.objects.bulk_create(
                    user_notifications,
                    ignore_conflicts=True  # Handles race conditions
                )
            
            logger.info(
                f"Dispatched notification {event.event_type} to {len(created)} users"
            )
            
            # Return the created notifications
            return created
            
        except Exception as e:
            logger.error(f"Failed to dispatch notifications: {e}")
            raise NotificationDispatchError(f"Dispatch failed: {e}")
    
    def dispatch_to_single_user(
        self,
        event: NotificationEvent,
        user_id: uuid.UUID,
        skip_preference: bool = False,
    ) -> Optional[UserNotification]:
        """
        Dispatch a notification to a single user.
        
        Args:
            event: The NotificationEvent
            user_id: Target user ID
            skip_preference: Skip preference check
        
        Returns:
            Created UserNotification or None if skipped
        """
        # Check user preference
        if not skip_preference:
            if not self._is_notification_enabled(user_id, event.category):
                logger.debug(f"Notification disabled for user {user_id}")
                return None
        
        # Check rate limit for individual user
        if self.rate_limiter:
            key = f"user:{user_id}:{event.category}"
            allowed, _ = self.rate_limiter.check_rate_limit(key, 1)
            if not allowed:
                logger.warning(f"Rate limit exceeded for user {user_id}")
                return None
        
        # Create or get user notification
        try:
            notification, created = UserNotification.objects.get_or_create(
                user_id=user_id,
                event=event,
                defaults={'is_read': False}
            )
            
            if created:
                logger.debug(f"Created notification for user {user_id}")
            else:
                logger.debug(f"User {user_id} already has this notification")
            
            return notification
            
        except Exception as e:
            logger.error(f"Failed to dispatch to user {user_id}: {e}")
            return None
    
    def _generate_idempotency_key(
        self,
        event_type: str,
        entity_type: str,
        entity_id: Optional[uuid.UUID],
        actor_id: Optional[uuid.UUID],
    ) -> str:
        """Generate a unique idempotency key."""
        parts = [event_type]
        if entity_type:
            parts.append(entity_type)
        if entity_id:
            parts.append(str(entity_id))
        if actor_id:
            parts.append(str(actor_id))
        return '_'.join(parts)
    
    def _filter_by_preferences(
        self,
        user_ids: List[uuid.UUID],
        category: str,
    ) -> List[uuid.UUID]:
        """
        Filter user IDs by their notification preferences.
        
        Returns users who have enabled notifications for the category.
        """
        # Get users who have disabled this category
        disabled = set(
            NotificationPreference.objects.filter(
                user_id__in=user_ids,
                category=category,
                channel=NotificationChannel.IN_APP,
                enabled=False
            ).values_list('user_id', flat=True)
        )
        
        # Also get users who have disabled all notifications globally
        # (This would require a UserSettings model check)
        
        return [uid for uid in user_ids if uid not in disabled]
    
    def _is_notification_enabled(
        self,
        user_id: uuid.UUID,
        category: str,
    ) -> bool:
        """Check if user has notifications enabled for a category."""
        try:
            pref = NotificationPreference.objects.get(
                user_id=user_id,
                category=category,
                channel='in_app'
            )
            return pref.enabled
        except NotificationPreference.DoesNotExist:
            # Default to enabled if no preference set
            return True


class BulkNotificationService:
    """
    Service for bulk notification operations.
    
    Designed for:
    - Processing notification queues
    - Batch notifications from background tasks
    - Scheduled notification delivery
    """
    
    def __init__(self):
        self.dispatcher = NotificationDispatcher()
    
    def process_notification_batch(
        self,
        notifications: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Process a batch of notification requests.
        
        Args:
            notifications: List of notification data dictionaries
        
        Returns:
            Summary of processing results
        """
        results = {
            'total': len(notifications),
            'created': 0,
            'skipped': 0,
            'errors': 0,
        }
        
        for notification_data in notifications:
            try:
                # Create event
                event = self.dispatcher.create_event(
                    event_type=notification_data['event_type'],
                    message=notification_data['message'],
                    category=notification_data.get('category', 'system'),
                    actor_id=notification_data.get('actor_id'),
                    entity_type=notification_data.get('entity_type'),
                    entity_id=notification_data.get('entity_id'),
                    title=notification_data.get('title', ''),
                    payload=notification_data.get('payload', {}),
                    priority=notification_data.get('priority', 'normal'),
                )
                
                # Dispatch to users
                user_ids = notification_data.get('user_ids', [])
                if user_ids:
                    created = self.dispatcher.dispatch_to_users(event, user_ids)
                    results['created'] += len(created)
                else:
                    results['skipped'] += 1
                    
            except Exception as e:
                logger.error(f"Failed to process notification: {e}")
                results['errors'] += 1
        
        return results


def get_notification_dispatcher() -> NotificationDispatcher:
    """
    Factory function to get a NotificationDispatcher instance.
    
    Returns a new dispatcher instance.
    """
    return NotificationDispatcher()


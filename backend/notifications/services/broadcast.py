"""
Broadcast Notification Service.

Handles creation and delivery of broadcast notifications:
- Role-based broadcasts (creators, clippers, brands)
- Global broadcasts (all users)
- Scheduled broadcasts
- Read receipt tracking

Design:
- Efficient bulk user retrieval using Django's iterator
- Background task friendly for large broadcasts
- Scheduled delivery support
"""

import logging
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone

from .dispatcher import NotificationDispatcher, BulkNotificationService
from notifications.models import (
    BroadcastNotification,
    BroadcastReadReceipt,
    NotificationCategory,
    NotificationPriority,
)

logger = logging.getLogger(__name__)

User = get_user_model()


class BroadcastError(Exception):
    """Exception for broadcast-related errors."""
    pass


class BroadcastService:
    """
    Service for managing broadcast notifications.
    
    Capabilities:
    - Create and send role-based broadcasts
    - Create and send global broadcasts
    - Schedule broadcasts for future delivery
    - Track read receipts
    - Cancel scheduled broadcasts
    
    Usage:
        service = BroadcastService()
        
        # Create global broadcast
        broadcast = service.create_global_broadcast(
            title="Maintenance Notice",
            message="Scheduled maintenance tonight",
            category=NotificationCategory.ADMIN,
        )
        
        # Send to specific user type
        broadcast = service.create_role_broadcast(
            title="New Feature",
            message="Check out our new dashboard",
            user_type="creator",
            category=NotificationCategory.SYSTEM,
        )
    """
    
    def __init__(
        self,
        dispatcher: Optional[NotificationDispatcher] = None,
        bulk_service: Optional[BulkNotificationService] = None,
    ):
        """
        Initialize broadcast service.
        
        Args:
            dispatcher: Optional custom NotificationDispatcher
            bulk_service: Optional custom BulkNotificationService
        """
        self.dispatcher = dispatcher or NotificationDispatcher()
        self.bulk_service = bulk_service or BulkNotificationService()
    
    def create_global_broadcast(
        self,
        title: str,
        message: str,
        category: str = NotificationCategory.ADMIN,
        priority: str = NotificationPriority.NORMAL,
        created_by_id: Optional[UUID] = None,
        scheduled_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None,
    ) -> BroadcastNotification:
        """
        Create a global broadcast notification for all users.
        
        Args:
            title: Broadcast title
            message: Broadcast message
            category: Notification category
            priority: Notification priority
            created_by_id: Admin user ID who created the broadcast
            scheduled_at: Optional scheduled delivery time
            expires_at: Optional expiration time
        
        Returns:
            Created BroadcastNotification
        """
        return self._create_broadcast(
            title=title,
            message=message,
            category=category,
            priority=priority,
            created_by_id=created_by_id,
            target_user_type='',  # Empty means all users
            target_segment='',
            scheduled_at=scheduled_at,
            expires_at=expires_at,
        )
    
    def create_role_broadcast(
        self,
        title: str,
        message: str,
        user_type: str,
        category: str = NotificationCategory.ADMIN,
        priority: str = NotificationPriority.NORMAL,
        created_by_id: Optional[UUID] = None,
        scheduled_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None,
    ) -> BroadcastNotification:
        """
        Create a broadcast for a specific user type.
        
        Args:
            title: Broadcast title
            message: Broadcast message
            user_type: Target user type (creator, clipper, brand)
            category: Notification category
            priority: Notification priority
            created_by_id: Admin user ID
            scheduled_at: Optional scheduled delivery time
            expires_at: Optional expiration time
        
        Returns:
            Created BroadcastNotification
        """
        return self._create_broadcast(
            title=title,
            message=message,
            category=category,
            priority=priority,
            created_by_id=created_by_id,
            target_user_type=user_type,
            target_segment='',
            scheduled_at=scheduled_at,
            expires_at=expires_at,
        )
    
    def _create_broadcast(
        self,
        title: str,
        message: str,
        category: str,
        priority: str,
        created_by_id: Optional[UUID],
        target_user_type: str,
        target_segment: str,
        scheduled_at: Optional[datetime],
        expires_at: Optional[datetime],
    ) -> BroadcastNotification:
        """Internal method to create broadcast notification."""
        try:
            broadcast = BroadcastNotification.objects.create(
                title=title,
                message=message,
                category=category,
                priority=priority,
                target_user_type=target_user_type,
                target_segment=target_segment,
                created_by_id=created_by_id,
                scheduled_at=scheduled_at,
                expires_at=expires_at,
                is_active=scheduled_at is None,  # Active if not scheduled
            )
            
            logger.info(f"Created broadcast: {broadcast.id}")
            
            # If not scheduled, deliver immediately
            if not scheduled_at:
                self.deliver_broadcast(broadcast.id)
            
            return broadcast
            
        except Exception as e:
            logger.error(f"Failed to create broadcast: {e}")
            raise BroadcastError(f"Broadcast creation failed: {e}")
    
    def deliver_broadcast(
        self,
        broadcast_id: UUID,
        batch_size: int = 1000,
    ) -> int:
        """
        Deliver a broadcast notification to all targeted users.
        
        Args:
            broadcast_id: BroadcastNotification ID
            batch_size: Number of users to process per batch
        
        Returns:
            Number of users notified
        """
        try:
            broadcast = BroadcastNotification.objects.get(id=broadcast_id)
            
            # Get target user IDs
            user_ids = self._get_target_user_ids(broadcast)
            
            if not user_ids:
                logger.info(f"No users to deliver broadcast {broadcast_id}")
                return 0
            
            # Update total recipients count
            broadcast.total_recipients = len(user_ids)
            broadcast.save(update_fields=['total_recipients'])
            
            # Create notification event
            event = self.dispatcher.create_event(
                event_type=f"broadcast.{broadcast.id}",
                message=broadcast.message,
                title=broadcast.title,
                category=broadcast.category,
                priority=broadcast.priority,
                actor_id=broadcast.created_by_id,
                idempotency_key=f"broadcast_{broadcast.id}",
            )
            
            # Dispatch to users in batches
            total_notified = 0
            for i in range(0, len(user_ids), batch_size):
                batch = user_ids[i:i + batch_size]
                created = self.dispatcher.dispatch_to_users(event, batch)
                total_notified += len(created)
            
            logger.info(f"Delivered broadcast {broadcast_id} to {total_notified} users")
            return total_notified
            
        except BroadcastNotification.DoesNotExist:
            logger.error(f"Broadcast {broadcast_id} not found")
            raise BroadcastError(f"Broadcast not found: {broadcast_id}")
        except Exception as e:
            logger.error(f"Failed to deliver broadcast {broadcast_id}: {e}")
            raise BroadcastError(f"Delivery failed: {e}")
    
    def _get_target_user_ids(self, broadcast: BroadcastNotification) -> List[UUID]:
        """
        Get list of user IDs targeted by the broadcast.
        
        Args:
            broadcast: BroadcastNotification instance
        
        Returns:
            List of user IDs
        """
        queryset = User.objects.filter(is_active=True)
        
        # Filter by user type if specified
        if broadcast.target_user_type:
            queryset = queryset.filter(type=broadcast.target_user_type)
        
        # Filter by segment if specified
        # This would require additional segment logic
        if broadcast.target_segment:
            # Placeholder for segment filtering
            # Could be based on UserProfile fields, subscriptions, etc.
            pass
        
        return list(queryset.values_list('id', flat=True))
    
    def cancel_broadcast(self, broadcast_id: UUID) -> bool:
        """
        Cancel a scheduled broadcast.
        
        Args:
            broadcast_id: BroadcastNotification ID
        
        Returns:
            True if cancelled, False if already sent
        """
        try:
            broadcast = BroadcastNotification.objects.get(id=broadcast_id)
            
            if broadcast.scheduled_at and timezone.now() < broadcast.scheduled_at:
                broadcast.is_active = False
                broadcast.save(update_fields=['is_active', 'updated_at'])
                logger.info(f"Cancelled broadcast {broadcast_id}")
                return True
            
            return False
            
        except BroadcastNotification.DoesNotExist:
            raise BroadcastError(f"Broadcast not found: {broadcast_id}")
    
    def mark_as_read(
        self,
        broadcast_id: UUID,
        user_id: UUID,
    ) -> bool:
        """
        Mark a broadcast as read for a specific user.
        
        Args:
            broadcast_id: BroadcastNotification ID
            user_id: User ID
        
        Returns:
            True if marked, False if already marked
        """
        try:
            broadcast = BroadcastNotification.objects.get(id=broadcast_id)
            
            # Check if already marked
            if BroadcastReadReceipt.objects.filter(
                broadcast=broadcast,
                user_id=user_id
            ).exists():
                return False
            
            # Create read receipt
            BroadcastReadReceipt.objects.create(
                broadcast=broadcast,
                user_id=user_id,
            )
            
            # Update read count
            broadcast.read_count = BroadcastReadReceipt.objects.filter(
                broadcast=broadcast
            ).count()
            broadcast.save(update_fields=['read_count'])
            
            return True
            
        except BroadcastNotification.DoesNotExist:
            raise BroadcastError(f"Broadcast not found: {broadcast_id}")
    
    def get_broadcast_stats(self, broadcast_id: UUID) -> dict:
        """
        Get statistics for a broadcast.
        
        Args:
            broadcast_id: BroadcastNotification ID
        
        Returns:
            Dictionary with broadcast statistics
        """
        try:
            broadcast = BroadcastNotification.objects.get(id=broadcast_id)
            
            read_count = BroadcastReadReceipt.objects.filter(
                broadcast=broadcast
            ).count()
            
            read_rate = (read_count / broadcast.total_recipients * 100) if broadcast.total_recipients > 0 else 0
            
            return {
                'id': str(broadcast.id),
                'title': broadcast.title,
                'total_recipients': broadcast.total_recipients,
                'read_count': read_count,
                'read_rate': round(read_rate, 2),
                'status': 'active' if broadcast.is_active else 'cancelled',
                'created_at': broadcast.created_at.isoformat(),
            }
            
        except BroadcastNotification.DoesNotExist:
            raise BroadcastError(f"Broadcast not found: {broadcast_id}")
    
    def list_broadcasts(
        self,
        active_only: bool = False,
        limit: int = 20,
    ) -> List[BroadcastNotification]:
        """
        List broadcast notifications.
        
        Args:
            active_only: Only return active broadcasts
            limit: Maximum number to return
        
        Returns:
            List of BroadcastNotification instances
        """
        queryset = BroadcastNotification.objects.all()
        
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        return list(queryset.order_by('-created_at')[:limit])


class ScheduledBroadcastProcessor:
    """
    Processor for handling scheduled broadcasts.
    
    Designed to be run as a periodic task (e.g., Celery beat).
    """
    
    def __init__(self):
        self.broadcast_service = BroadcastService()
    
    def process_scheduled_broadcasts(self) -> int:
        """
        Process all broadcasts that are scheduled for now.
        
        Returns:
            Number of broadcasts processed
        """
        now = timezone.now()
        
        # Find broadcasts that should be sent now
        scheduled = BroadcastNotification.objects.filter(
            is_active=True,
            scheduled_at__lte=now,
        )
        
        count = 0
        for broadcast in scheduled:
            try:
                self.broadcast_service.deliver_broadcast(broadcast.id)
                count += 1
            except BroadcastError as e:
                logger.error(f"Failed to deliver scheduled broadcast {broadcast.id}: {e}")
        
        return count
    
    def cleanup_expired_broadcasts(self) -> int:
        """
        Deactivate expired broadcasts.
        
        Returns:
            Number of broadcasts deactivated
        """
        now = timezone.now()
        
        # Find and deactivate expired broadcasts
        expired = BroadcastNotification.objects.filter(
            is_active=True,
            expires_at__lte=now,
        )
        
        count = expired.update(is_active=False)
        
        if count > 0:
            logger.info(f"Deactivated {count} expired broadcasts")
        
        return count


def get_broadcast_service() -> BroadcastService:
    """
    Factory function to get a BroadcastService instance.
    
    Returns:
        Configured BroadcastService instance
    """
    return BroadcastService()


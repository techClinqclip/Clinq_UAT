"""
Notification API Views.

Production-ready DRF ViewSets for notification management:
- NotificationViewSet: User notification inbox
- NotificationPreferenceViewSet: User preferences management
- BroadcastNotificationViewSet: Admin broadcast management

Design:
- Proper authentication and authorization
- Pagination for list endpoints
- Atomic operations for state changes
- Rate limiting for write operations
"""

import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import (
    UserNotification,
    NotificationPreference,
    BroadcastNotification,
    NotificationCategory,
)
from .serializers import (
    UserNotificationSerializer,
    NotificationPreferenceSerializer,
    NotificationPreferenceBulkSerializer,
    BroadcastNotificationSerializer,
    BroadcastNotificationCreateSerializer,
    NotificationArchiveSerializer,
    NotificationListFilterSerializer,
)
from .services.broadcast import BroadcastService, BroadcastError

logger = logging.getLogger(__name__)

@extend_schema(parameters=[
    OpenApiParameter("id", type=OpenApiTypes.UUID, location=OpenApiParameter.PATH)
])
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for user notification management.
    
    Endpoints:
    - GET /notifications/ - List user notifications (paginated)
    - GET /notifications/{id}/ - Get single notification
    - POST /notifications/{id}/read/ - Mark single as read
    - POST /notifications/mark_all_read/ - Mark all as read
    - POST /notifications/archive/ - Archive notifications
    - GET /notifications/unread_count/ - Get unread count
    - GET /notifications/summary/ - Get notification summary
    
    Permissions:
    - All endpoints require authentication
    - Users can only access their own notifications
    """
    
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['-created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Get notifications for the current user.
        """
        user = self.request.user
        
        queryset = UserNotification.objects.filter(
            user=user,
            event__isnull=False
        ).select_related('event', 'event__actor')
        
        # Apply filters from query params
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        is_archived = self.request.query_params.get('is_archived', 'false')
        queryset = queryset.filter(is_archived=is_archived.lower() == 'true')
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(event__category=category)
        
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event__event_type__icontains=event_type)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """List notifications with pagination and filtering."""
        filter_serializer = NotificationListFilterSerializer(data=request.query_params)
        if not filter_serializer.is_valid():
            return Response(
                {'error': 'Invalid filter parameters', 'details': filter_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        params = filter_serializer.validated_data
        page = params.get('page', 1)
        page_size = min(params.get('page_size', 20), 100)
        
        queryset = self.get_queryset()
        
        start_date = params.get('start_date')
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        
        end_date = params.get('end_date')
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        from django.core.paginator import Paginator
        paginator = Paginator(queryset, page_size)

        if paginator.count == 0:
            return Response({
                'count': 0,
                'num_pages': 0,
                'current_page': page,
                'results': [],
            })
        
        try:
            page_obj = paginator.page(page)
        except Exception:
            return Response(
                {'error': 'Invalid page number'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(page_obj.object_list, many=True)
        
        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page,
            'results': serializer.data,
        })
    
    @action(detail=True, methods=['post'], url_path='read')
    def mark_as_read(self, request, pk=None):
        """Mark a single notification as read."""
        notification = self.get_object()
        
        if notification.is_read:
            return Response(
                {'message': 'Notification already read'},
                status=status.HTTP_200_OK
            )
        
        from django.db.models import F
        updated = UserNotification.objects.filter(
            id=notification.id,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        if updated:
            notification.refresh_from_db()
            logger.info(f"Notification {notification.id} marked as read")
        
        serializer = self.get_serializer(notification)
        return Response({
            'message': 'Notification marked as read',
            'notification': serializer.data
        })
    
    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_as_read(self, request):
        """Mark all notifications as read."""
        category = request.data.get('category')
        unread_only = request.data.get('unread_only', True)
        
        queryset = UserNotification.objects.filter(
            user=request.user,
            is_archived=False,
        )
        
        if unread_only:
            queryset = queryset.filter(is_read=False)
        
        if category:
            queryset = queryset.filter(event__category=category)
        
        from django.db.models import F
        updated_count = queryset.update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'Marked {updated_count} notifications as read',
            'count': updated_count,
        })
    
    @action(detail=False, methods=['post'], url_path='archive')
    def archive(self, request):
        """Archive notifications."""
        serializer = NotificationArchiveSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notification_ids = serializer.validated_data['notification_ids']
        
        updated_count = UserNotification.objects.filter(
            id__in=notification_ids,
            user=request.user,
            is_archived=False,
        ).update(is_archived=True)
        
        return Response({
            'message': f'Archived {updated_count} notifications',
            'count': updated_count,
        })
    
    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        """Get unread notification count."""
        category = request.query_params.get('category')
        
        queryset = UserNotification.objects.filter(
            user=request.user,
            is_read=False,
            is_archived=False,
        )
        
        if category:
            queryset = queryset.filter(event__category=category)
        
        count = queryset.count()
        
        return Response({
            'unread_count': count,
            'category': category or 'all',
        })
    
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Get notification summary."""
        user = request.user
        
        total = UserNotification.objects.filter(user=user).count()
        unread = UserNotification.objects.filter(
            user=user,
            is_read=False,
            is_archived=False,
        ).count()
        archived = UserNotification.objects.filter(
            user=user,
            is_archived=True,
        ).count()
        
        from django.db.models import Count
        by_category = UserNotification.objects.filter(
            user=user,
            is_archived=False,
        ).values('event__category').annotate(
            count=Count('id'),
            unread=Count('id', filter=Q(is_read=False))
        )
        
        category_summary = {
            item['event__category']: {
                'total': item['count'],
                'unread': item['unread'],
            }
            for item in by_category
        }
        
        recent = UserNotification.objects.filter(
            user=user,
            is_archived=False,
        ).select_related('event').order_by('-created_at')[:5]
        
        recent_serializer = UserNotificationSerializer(recent, many=True)
        
        return Response({
            'total': total,
            'unread': unread,
            'archived': archived,
            'by_category': category_summary,
            'recent': recent_serializer.data,
        })
    
    @action(detail=False, methods=['delete'], url_path='clear')
    def clear(self, request):
        """Delete all archived notifications."""
        deleted_count, _ = UserNotification.objects.filter(
            user=request.user,
            is_archived=True,
        ).delete()
        
        return Response({
            'message': f'Deleted {deleted_count} archived notifications',
            'count': deleted_count,
        })


class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notification preferences.
    """
    
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Spectacular/Swagger fix: return empty queryset if it's a schema generation call
        if getattr(self, "swagger_fake_view", False):
            return NotificationPreference.objects.none()
        
        """Get preferences for the current user."""
        return NotificationPreference.objects.filter(
            user=self.request.user
        )
    
    def get_serializer_context(self):
        """Add user to serializer context."""
        context = super().get_serializer_context()
        context['user'] = self.request.user
        return context
    
    def perform_create(self, serializer):
        """Set user on creation."""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'], url_path='bulk_update')
    def bulk_update(self, request):
        """Bulk update notification preferences."""
        serializer = NotificationPreferenceBulkSerializer(
            data=request.data,
            context={'user': request.user}
        )
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        preferences = serializer.validated_data['preferences']
        user = request.user
        
        updated_count = 0
        created_count = 0
        
        for pref_data in preferences:
            pref, created = NotificationPreference.objects.update_or_create(
                user=user,
                category=pref_data['category'],
                channel=pref_data['channel'],
                defaults={'enabled': pref_data.get('enabled', True)}
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        return Response({
            'message': 'Preferences updated',
            'updated': updated_count,
            'created': created_count,
        })
    
    @action(detail=False, methods=['get'], url_path='defaults')
    def defaults(self, request):
        """Get default preferences."""
        from .models import NotificationChannel
        
        defaults = {}
        for category in NotificationCategory.values:
            defaults[category] = {}
            for channel in NotificationChannel.values:
                defaults[category][channel] = {
                    'enabled': True,
                    'set_by_user': False,
                }
        
        user_prefs = NotificationPreference.objects.filter(user=request.user)
        for pref in user_prefs:
            defaults[pref.category][pref.channel] = {
                'enabled': pref.enabled,
                'set_by_user': True,
            }
        
        return Response({'preferences': defaults})
    
    @action(detail=False, methods=['post'], url_path='reset')
    def reset(self, request):
        """Reset all preferences to defaults."""
        deleted_count, _ = NotificationPreference.objects.filter(
            user=request.user
        ).delete()
        
        return Response({
            'message': f'Reset {deleted_count} preferences to defaults',
            'count': deleted_count,
        })


class BroadcastNotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing broadcast notifications.
    """
    
    serializer_class = BroadcastNotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['-created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get broadcasts for the current user."""
        if self.request.user.is_staff:
            return BroadcastNotification.objects.all()
        else:
            return BroadcastNotification.objects.filter(
                is_active=True,
            )
    
    def get_serializer_class(self):
        """Use different serializer for create actions."""
        if self.action == 'create':
            return BroadcastNotificationCreateSerializer
        return BroadcastNotificationSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new broadcast notification (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff users can create broadcasts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Invalid data', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            broadcast_service = BroadcastService()
            
            target_user_type = serializer.validated_data.get('target_user_type', '')
            
            if target_user_type:
                broadcast = broadcast_service.create_role_broadcast(
                    title=serializer.validated_data['title'],
                    message=serializer.validated_data['message'],
                    category=serializer.validated_data.get('category', NotificationCategory.ADMIN),
                    priority=serializer.validated_data.get('priority', 'normal'),
                    created_by_id=request.user.id,
                    user_type=target_user_type,
                    scheduled_at=serializer.validated_data.get('scheduled_at'),
                    expires_at=serializer.validated_data.get('expires_at'),
                )
            else:
                broadcast = broadcast_service.create_global_broadcast(
                    title=serializer.validated_data['title'],
                    message=serializer.validated_data['message'],
                    category=serializer.validated_data.get('category', NotificationCategory.ADMIN),
                    priority=serializer.validated_data.get('priority', 'normal'),
                    created_by_id=request.user.id,
                    scheduled_at=serializer.validated_data.get('scheduled_at'),
                    expires_at=serializer.validated_data.get('expires_at'),
                )
            
            output_serializer = BroadcastNotificationSerializer(broadcast)
            return Response(
                output_serializer.data,
                status=status.HTTP_201_CREATED
            )
            
        except BroadcastError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='send')
    def send(self, request, pk=None):
        """Send a broadcast immediately."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff users can send broadcasts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        broadcast = self.get_object()
        
        try:
            broadcast_service = BroadcastService()
            count = broadcast_service.deliver_broadcast(broadcast.id)
            
            return Response({
                'message': f'Broadcast sent to {count} users',
                'recipients': count,
            })
            
        except BroadcastError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """Cancel a scheduled broadcast."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff users can cancel broadcasts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        broadcast = self.get_object()
        
        try:
            broadcast_service = BroadcastService()
            cancelled = broadcast_service.cancel_broadcast(broadcast.id)
            
            if cancelled:
                return Response({'message': 'Broadcast cancelled'})
            else:
                return Response(
                    {'error': 'Broadcast cannot be cancelled'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except BroadcastError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        """Get broadcast statistics."""
        broadcast = self.get_object()
        
        try:
            broadcast_service = BroadcastService()
            stats = broadcast_service.get_broadcast_stats(broadcast.id)
            return Response(stats)
            
        except BroadcastError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """Get all active broadcasts."""
        broadcasts = BroadcastNotification.objects.filter(
            is_active=True,
        ).order_by('-created_at')
        
        serializer = self.get_serializer(broadcasts, many=True)
        return Response(serializer.data)


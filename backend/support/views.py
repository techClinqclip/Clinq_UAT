from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.shortcuts import get_object_or_404
from django.db import transaction as db_transaction
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import SupportTicket, SupportTicketMessage, FAQ, FAQFeedback
from .serializers import (
    SupportTicketSerializer, SupportTicketSummarySerializer, SupportTicketCreateSerializer,
    SupportTicketMessageSerializer, FAQSerializer, FAQFeedbackSerializer
)


@extend_schema_view(
    list=extend_schema(summary='List support tickets', tags=['Support']),
    retrieve=extend_schema(summary='Get ticket details', tags=['Support']),
    create=extend_schema(summary='Create support ticket', tags=['Support']),
    update=extend_schema(summary='Update ticket', tags=['Support']),
    partial_update=extend_schema(summary='Partially update ticket', tags=['Support']),
    destroy=extend_schema(summary='Delete ticket', tags=['Support']),
)
class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for support tickets
    """
    permission_classes = [IsAuthenticated]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'priority']
    search_fields = ['subject', 'description', 'ticket_number']
    ordering_fields = ['created_at', 'priority']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return SupportTicketCreateSerializer
        if self.action == 'list' and self.request.query_params.get('summary') == 'true':
            return SupportTicketSummarySerializer
        return SupportTicketSerializer

    def get_serializer_context(self):
        return {'request': self.request, 'format': self.format_kwarg, 'view': self}

    def get_queryset(self):
        """Get tickets for current user, ordered by most recent"""
        # Handle schema generation when user is not authenticated
        if getattr(self, 'swagger_fake_view', False):
            return SupportTicket.objects.none()

        queryset = SupportTicket.objects.select_related('user', 'resolved_by').order_by('-created_at')
        if self.action == 'list' and self.request.query_params.get('summary') == 'true':
            if self.request.user.is_staff or self.request.user.is_superuser:
                return queryset
            return queryset.filter(user=self.request.user)

        queryset = queryset.prefetch_related('messages__sender')
        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(user=request.user)
        SupportTicketMessage.objects.create(ticket=ticket, sender=request.user, body=ticket.description)
        from notifications.helpers import notify_admins_event
        notify_admins_event(
            event_type='support.ticket_created',
            title='New support ticket',
            message=f'{request.user.email} created support ticket "{ticket.subject}".',
            category='support',
            entity_type='support_ticket',
            payload={'ticket_id': ticket.id, 'ticket_number': ticket.ticket_number},
            idempotency_key=f'support.ticket_created:{ticket.id}',
        )
        response_serializer = SupportTicketSerializer(ticket, context=self.get_serializer_context())
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        if request.user.is_staff or request.user.is_superuser:
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data
            next_status = validated_data.get('status', instance.status)
            resolution_data = {}
            if next_status == 'resolved' and instance.status != 'resolved':
                resolution_data = {'resolved_by': request.user, 'resolved_at': timezone.now()}
            elif next_status != 'resolved':
                resolution_data = {'resolved_by': None, 'resolved_at': None}
            serializer.save(**resolution_data)
            return Response(serializer.data)

        protected_fields = {'status', 'admin_response', 'resolved_by', 'resolved_at'}
        if protected_fields.intersection(request.data):
            raise PermissionDenied('Only support staff can update ticket status or responses.')
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['get', 'post'], url_path='messages')
    def messages(self, request, pk=None):
        ticket = self.get_object()
        if request.method == 'GET':
            serializer = SupportTicketMessageSerializer(
                ticket.messages.select_related('sender').all(),
                many=True,
                context=self.get_serializer_context(),
            )
            return Response(serializer.data)

        serializer = SupportTicketMessageSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        message = serializer.save(ticket=ticket, sender=request.user)
        if request.user.is_staff or request.user.is_superuser:
            ticket.admin_response = message.body
            ticket.save(update_fields=['admin_response', 'updated_at'])
            from notifications.helpers import notify_user_event
            notify_user_event(
                user_id=ticket.user_id,
                event_type='support.ticket_response',
                title='Support replied to your ticket',
                message=f'Support replied to "{ticket.subject}".',
                category='support',
                entity_type='support_ticket',
                entity_id=None,
                payload={'ticket_id': ticket.id, 'ticket_number': ticket.ticket_number},
                email=False,
                idempotency_key=f'support.ticket_response:{message.id}',
            )
        elif ticket.status in ('resolved', 'closed'):
            ticket.status = 'open'
            ticket.resolved_by = None
            ticket.resolved_at = None
            ticket.save(update_fields=['status', 'resolved_by', 'resolved_at', 'updated_at'])
        return Response(
            SupportTicketMessageSerializer(message, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )
    
    def retrieve(self, request, *args, **kwargs):
        """Get ticket details"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(summary='Close support ticket', tags=['Support'])
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close a ticket"""
        ticket = self.get_object()
        if ticket.status == 'closed':
            return Response(
                {'error': 'Ticket is already closed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        ticket.status = 'closed'
        ticket.save(update_fields=['status'])
        return Response({'message': 'Ticket closed successfully'})

    @extend_schema(summary='Create support ticket (backward compatibility)', tags=['Support'])
    @action(detail=False, methods=['post'], url_path='ticket')
    def create_ticket(self, request):
        """Create support ticket (backward compatibility endpoint)"""
        serializer = SupportTicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save(user=request.user)
        SupportTicketMessage.objects.create(ticket=ticket, sender=request.user, body=ticket.description)
        from notifications.helpers import notify_admins_event
        notify_admins_event(
            event_type='support.ticket_created',
            title='New support ticket',
            message=f'{request.user.email} created support ticket "{ticket.subject}".',
            category='support',
            entity_type='support_ticket',
            payload={'ticket_id': ticket.id, 'ticket_number': ticket.ticket_number},
            idempotency_key=f'support.ticket_created:{ticket.id}',
        )
        return Response(
            SupportTicketSerializer(ticket, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


@extend_schema_view(
    list=extend_schema(summary='List FAQs', tags=['Support']),
    retrieve=extend_schema(summary='Get FAQ details', tags=['Support']),
)
class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for FAQs
    Public read access
    """
    queryset = FAQ.objects.filter(is_published=True)
    serializer_class = FAQSerializer
    permission_classes = [AllowAny]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_featured']
    search_fields = ['question', 'answer']
    ordering_fields = ['order', 'views_count', 'created_at']
    ordering = ['order', '-is_featured', '-created_at']

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count atomically to prevent race conditions
        FAQ.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @extend_schema(summary='Submit FAQ feedback', tags=['Support'])
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def feedback(self, request, pk=None):
        """Submit feedback on FAQ"""
        faq = self.get_object()
        is_helpful = request.data.get('is_helpful', True)
        
        # Use atomic transaction to prevent race conditions
        with db_transaction.atomic():
            feedback, created = FAQFeedback.objects.select_for_update().get_or_create(
                faq=faq,
                user=request.user,
                defaults={'is_helpful': is_helpful}
            )
            
            if not created:
                # Update existing feedback
                old_value = feedback.is_helpful
                feedback.is_helpful = is_helpful
                feedback.save()
                
                # Update counts atomically using F() expressions
                if old_value and not is_helpful:
                    # Changed from helpful to not helpful
                    FAQ.objects.filter(pk=faq.pk).update(
                        helpful_count=F('helpful_count') - 1,
                        not_helpful_count=F('not_helpful_count') + 1
                    )
                elif not old_value and is_helpful:
                    # Changed from not helpful to helpful
                    FAQ.objects.filter(pk=faq.pk).update(
                        not_helpful_count=F('not_helpful_count') - 1,
                        helpful_count=F('helpful_count') + 1
                    )
            else:
                # New feedback - update counts atomically
                if is_helpful:
                    FAQ.objects.filter(pk=faq.pk).update(
                        helpful_count=F('helpful_count') + 1
                    )
                else:
                    FAQ.objects.filter(pk=faq.pk).update(
                        not_helpful_count=F('not_helpful_count') + 1
                    )
        
        return Response({
            'message': 'Feedback submitted',
            'is_helpful': is_helpful
        })

    @extend_schema(summary='List FAQs (backward compatibility)', tags=['Support'])
    @action(detail=False, methods=['get'], url_path='faq', permission_classes=[AllowAny])
    def list_faqs(self, request):
        """
        List FAQs (backward compatibility endpoint)
        Supports ?category=...&featured=true
        """
        category = request.query_params.get('category')
        is_featured = request.query_params.get('featured', '').lower() == 'true'
        
        queryset = FAQ.objects.filter(is_published=True)
        
        if category:
            queryset = queryset.filter(category=category)
        if is_featured:
            queryset = queryset.filter(is_featured=True)
        
        queryset = queryset.order_by('order', '-is_featured', '-created_at')
        serializer = FAQSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

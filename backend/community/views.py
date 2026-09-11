import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db.models import Q, Count, F
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import Discussion, DiscussionReply, DiscussionLike, CommunityEvent
from .serializers import DiscussionSerializer, DiscussionCreateSerializer, DiscussionReplySerializer, CommunityEventSerializer
from core.media_storage import upload_public_media

@extend_schema_view(
    list=extend_schema(summary='List discussions', tags=['Community']),
    retrieve=extend_schema(summary='Get discussion details', tags=['Community']),
    create=extend_schema(summary='Create discussion', tags=['Community']),
    update=extend_schema(summary='Update discussion', tags=['Community']),
    partial_update=extend_schema(summary='Partially update discussion', tags=['Community']),
    destroy=extend_schema(summary='Delete discussion', tags=['Community']),
)
class DiscussionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for community discussions
    """
    queryset = Discussion.objects.all()
    permission_classes = [AllowAny]  # Public read, auth required for write
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'author', 'is_pinned']
    search_fields = ['title', 'content', 'tags']
    ordering_fields = ['created_at', 'views_count', 'likes_count', 'replies_count']
    ordering = ['-is_pinned', '-created_at']
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        """Optimize queryset with select_related and prefetch_related"""
        queryset = super().get_queryset()
        return queryset.select_related('author', 'author__profile').prefetch_related(
            'replies__author', 'replies__author__profile', 'replies__likes', 'likes'
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return DiscussionCreateSerializer
        return DiscussionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'like', 'reply']:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()

        poll_value = payload.get('poll')
        if isinstance(poll_value, str) and poll_value:
            try:
                payload['poll'] = json.loads(poll_value)
            except json.JSONDecodeError:
                payload['poll'] = None

        media_urls = []
        if 'media' in payload:
            media_item = payload.getlist('media') if hasattr(payload, 'getlist') else payload.get('media')
            if isinstance(media_item, list):
                media_urls.extend([
                    url.strip() for url in media_item
                    if isinstance(url, str) and url.strip()
                ])
            elif isinstance(media_item, str) and media_item.strip():
                media_urls.append(media_item.strip())

        uploaded_media = request.FILES.getlist('media_files') or request.FILES.getlist('media')
        for uploaded_file in uploaded_media:
            if not uploaded_file:
                continue
            media_urls.append(upload_public_media(
                uploaded_file,
                folder=f"community/discussions/{request.user.id}",
            ))

        if media_urls:
            payload['media'] = [url for url in media_urls if isinstance(url, str) and url.strip()]

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count atomically (only if not the author viewing their own post)
        if instance.author != request.user:
            Discussion.objects.filter(pk=instance.pk).update(views_count=F('views_count') + 1)
            instance.refresh_from_db()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Like/unlike a discussion"""
        discussion = self.get_object()
        like, created = DiscussionLike.objects.get_or_create(
            user=request.user,
            discussion=discussion
        )
        
        if not created:
            like.delete()
            discussion.likes_count = max(0, discussion.likes_count - 1)
            liked = False
        else:
            discussion.likes_count += 1
            liked = True
        
        discussion.save(update_fields=['likes_count'])
        return Response({'liked': liked, 'likes_count': discussion.likes_count})

    @extend_schema(summary='Add reply to discussion', tags=['Community'])
    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        """Add a reply to a discussion"""
        discussion = self.get_object()
        
        if discussion.is_locked:
            return Response(
                {'error': 'This discussion is locked'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = DiscussionReplySerializer(data=request.data)
        if serializer.is_valid():
            reply = serializer.save(
                discussion=discussion,
                author=request.user
            )
            discussion.replies_count += 1
            discussion.save(update_fields=['replies_count'])
            return Response(
                DiscussionReplySerializer(reply, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema_view(
    list=extend_schema(summary='List replies', tags=['Community']),
    retrieve=extend_schema(summary='Get reply details', tags=['Community']),
    create=extend_schema(summary='Create reply', tags=['Community']),
    update=extend_schema(summary='Update reply', tags=['Community']),
    partial_update=extend_schema(summary='Partially update reply', tags=['Community']),
    destroy=extend_schema(summary='Delete reply', tags=['Community']),
)
class DiscussionReplyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for discussion replies
    """
    queryset = DiscussionReply.objects.all().select_related('author', 'author__profile', 'discussion')
    serializer_class = DiscussionReplySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        discussion_id = self.request.query_params.get('discussion')
        if discussion_id:
            queryset = queryset.filter(discussion_id=discussion_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @extend_schema(summary='Like/unlike reply', tags=['Community'])
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        """Like/unlike a reply"""
        reply = self.get_object()
        like, created = DiscussionLike.objects.get_or_create(
            user=request.user,
            reply=reply
        )
        
        if not created:
            like.delete()
            reply.likes_count = max(0, reply.likes_count - 1)
            liked = False
        else:
            reply.likes_count += 1
            liked = True
        
        reply.save(update_fields=['likes_count'])
        return Response({'liked': liked, 'likes_count': reply.likes_count})

    @action(detail=True, methods=['post'])
    def mark_solution(self, request, pk=None):
        """Mark a reply as the solution (only discussion author can do this)"""
        reply = self.get_object()
        discussion = reply.discussion
        
        if discussion.author != request.user:
            return Response(
                {'error': 'Only the discussion author can mark solutions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Unmark other solutions
        DiscussionReply.objects.filter(
            discussion=discussion,
            is_solution=True
        ).update(is_solution=False)
        
        reply.is_solution = True
        reply.save(update_fields=['is_solution'])
        return Response({'message': 'Reply marked as solution'})


class CommunityEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet for community events
    """
    queryset = CommunityEvent.objects.all().select_related('organizer', 'organizer__profile')
    serializer_class = CommunityEventSerializer
    permission_classes = [AllowAny]
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event_type', 'is_online', 'is_featured']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_date', 'created_at']
    ordering = ['-is_featured', 'start_date']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'register']:
            return [IsAuthenticated()]
        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(organizer=self.request.user)

    @extend_schema(summary='Register for event', tags=['Community'])
    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        """Register for an event"""
        event = self.get_object()
        
        if event.max_participants and event.participants_count >= event.max_participants:
            return Response(
                {'error': 'Event is full'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if event.participants.filter(id=request.user.id).exists():
            return Response(
                {'error': 'Already registered'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.participants.add(request.user)
        event.participants_count += 1
        event.save(update_fields=['participants_count'])
        return Response({'message': 'Successfully registered for event'})

    @extend_schema(summary='Unregister from event', tags=['Community'])
    @action(detail=True, methods=['post'])
    def unregister(self, request, pk=None):
        """Unregister from an event"""
        event = self.get_object()
        
        if not event.participants.filter(id=request.user.id).exists():
            return Response(
                {'error': 'Not registered for this event'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.participants.remove(request.user)
        event.participants_count = max(0, event.participants_count - 1)
        event.save(update_fields=['participants_count'])
        return Response({'message': 'Successfully unregistered from event'})

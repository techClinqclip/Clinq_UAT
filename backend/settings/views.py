from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import UserSettings
from .serializers import UserSettingsSerializer


@extend_schema_view(
    list=extend_schema(summary='List user settings', tags=['Settings']),
    retrieve=extend_schema(summary='Get user settings', tags=['Settings']),
    create=extend_schema(summary='Create user settings', tags=['Settings']),
    update=extend_schema(summary='Update user settings', tags=['Settings']),
    partial_update=extend_schema(summary='Partially update user settings', tags=['Settings']),
    destroy=extend_schema(summary='Delete user settings', tags=['Settings']),
)
class SettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user settings
    Provides full CRUD operations for user settings
    """
    serializer_class = UserSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Handle schema generation when user is not authenticated
        if getattr(self, 'swagger_fake_view', False):
            return UserSettings.objects.none()
        return UserSettings.objects.filter(user=self.request.user)

    def get_object(self):
        """Get or create settings for the current user"""
        obj, created = UserSettings.objects.get_or_create(user=self.request.user)
        return obj

    def list(self, request, *args, **kwargs):
        """Get user settings (single object, so return as list with one item)"""
        settings_obj, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(settings_obj)
        return Response([serializer.data])

    def retrieve(self, request, *args, **kwargs):
        """Get user settings"""
        settings_obj, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(settings_obj)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create user settings (if doesn't exist)"""
        settings_obj, created = UserSettings.objects.get_or_create(user=request.user)
        if not created:
            return Response(
                {'error': 'Settings already exist. Use update instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(settings_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update user settings"""
        settings_obj, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(settings_obj, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Partially update user settings"""
        settings_obj, created = UserSettings.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(summary='Get user settings (backward compatibility)', tags=['Settings'])
    @action(detail=False, methods=['get'], url_path='get')
    def get_settings(self, request):
        """Get user settings (backward compatibility)"""
        return self.retrieve(request)

    @extend_schema(summary='Update user settings (backward compatibility)', tags=['Settings'])
    @action(detail=False, methods=['put', 'patch'], url_path='update')
    def update_settings(self, request):
        """Update user settings (backward compatibility)"""
        if request.method == 'PATCH':
            return self.partial_update(request)
        return self.update(request)

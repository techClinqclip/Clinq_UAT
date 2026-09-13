from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from django.http import FileResponse
from drf_spectacular.utils import extend_schema, extend_schema_view

from .models import ResourceSampleTemplate, UserSettings
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


class ResourceSampleTemplateView(APIView):
    """Read the resource sample template, or replace it as a staff user."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    allowed_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'}

    @staticmethod
    def _payload(request, template):
        document_url = None
        filename = None
        if template.document:
            document_url = request.build_absolute_uri(template.document.url)
            filename = template.document.name.rsplit('/', 1)[-1]

        return {
            'documentUrl': document_url,
            'filename': filename,
            'updatedAt': template.updated_at,
        }

    @staticmethod
    def _require_staff(request):
        if not request.user.is_staff and not request.user.is_superuser:
            raise PermissionDenied('Only administrators can update the resource sample template.')

    def get(self, request):
        template, _ = ResourceSampleTemplate.objects.get_or_create(pk=1)
        return Response(self._payload(request, template))

    def put(self, request):
        self._require_staff(request)
        document = request.FILES.get('document')
        if not document:
            return Response({'detail': 'A template document is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not any(document.name.lower().endswith(extension) for extension in self.allowed_extensions):
            return Response(
                {'detail': 'Upload a PDF, Word, Excel, CSV, or text document.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        template, _ = ResourceSampleTemplate.objects.get_or_create(pk=1)
        previous_document = template.document
        template.document = document
        template.updated_by = request.user
        template.save()

        if previous_document and previous_document.name != template.document.name:
            previous_document.delete(save=False)

        return Response(self._payload(request, template))


class ResourceSampleTemplateDownloadView(APIView):
    """Stream the current template as an attachment for authenticated users."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        template = ResourceSampleTemplate.objects.filter(pk=1).first()
        if not template or not template.document:
            return Response({'detail': 'No resource sample template is available.'}, status=status.HTTP_404_NOT_FOUND)

        filename = template.document.name.rsplit('/', 1)[-1]
        return FileResponse(template.document.open('rb'), as_attachment=True, filename=filename)

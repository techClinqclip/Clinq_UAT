import logging
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.core.exceptions import ImproperlyConfigured
from django.db import DatabaseError
from django.http import FileResponse, HttpResponseRedirect
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.media_storage import upload_public_media

from .models import LegalDocument, ResourceSampleTemplate, UserSettings
from .serializers import UserSettingsSerializer

logger = logging.getLogger(__name__)

LEGAL_DOCUMENT_CONFIG = {
    LegalDocument.PRIVACY_POLICY: {
        'label': 'Privacy Policy',
        'folder': 'settings/legal_documents/privacy_policy',
        'stored_basename': 'Clinq_Privacy_and_Policy',
        'default_filename': 'Clinq_Privacy_and_Policy',
    },
    LegalDocument.TERMS_CONDITIONS: {
        'label': 'Terms & Conditions',
        'folder': 'settings/legal_documents/terms_conditions',
        'stored_basename': 'Clinq_Terms_and_Conditions',
        'default_filename': 'Clinq_Terms_and_Conditions',
    },
}

RESOURCE_TEMPLATE_STORED_BASENAME = 'Clinq_Event_Resourse_Template'


def _stored_filename(basename, uploaded_name):
    suffix = Path(str(uploaded_name or '')).suffix.lower() or '.pdf'
    return f'{basename}{suffix}'


def _document_payload(document, *, include_key=False):
    document_url = (getattr(document, 'document_url', '') or '').strip() or None
    filename = (getattr(document, 'filename', '') or '').strip() or None
    if document_url and not filename:
        filename = Path(document_url.split('?', 1)[0]).name or None

    payload = {
        'documentUrl': document_url,
        'filename': filename,
        'updatedAt': getattr(document, 'updated_at', None),
    }
    if include_key:
        payload['key'] = getattr(document, 'key', None)
    return payload


def _stream_remote_document(document_url, *, filename, missing_detail, download_error_detail):
    document_url = (document_url or '').strip()
    if not document_url:
        return Response({'detail': missing_detail}, status=status.HTTP_404_NOT_FOUND)

    filename = (filename or '').strip() or Path(document_url.split('?', 1)[0]).name or 'document'

    if document_url.startswith(('https://', 'http://')):
        try:
            remote = urlopen(Request(document_url, method='GET'), timeout=30)
        except (URLError, TimeoutError, ValueError, OSError):
            return Response({'detail': download_error_detail}, status=status.HTTP_502_BAD_GATEWAY)
        return FileResponse(remote, as_attachment=True, filename=filename)

    if document_url.startswith('/'):
        return HttpResponseRedirect(document_url)

    return Response({'detail': missing_detail}, status=status.HTTP_404_NOT_FOUND)


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
    def _payload(template):
        return _document_payload(template)

    @staticmethod
    def _require_staff(request):
        if not request.user.is_staff and not request.user.is_superuser:
            raise PermissionDenied('Only administrators can update the resource sample template.')

    def get(self, request):
        template, _ = ResourceSampleTemplate.objects.get_or_create(pk=1)
        return Response(self._payload(template))

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

        original_filename = Path(document.name).name
        stored_filename = _stored_filename(RESOURCE_TEMPLATE_STORED_BASENAME, original_filename)
        try:
            document_url = upload_public_media(
                document,
                folder='settings/resource_templates',
                stored_filename=stored_filename,
                inline=True,
            )
        except ImproperlyConfigured:
            logger.exception('Resource template upload blocked: Supabase is not configured.')
            return Response(
                {'detail': 'Document storage is not configured. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception('Resource template upload to Supabase Storage failed.')
            return Response(
                {'detail': 'Unable to store the template document. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            template, _ = ResourceSampleTemplate.objects.get_or_create(pk=1)
            template.document_url = document_url or ''
            template.filename = stored_filename
            template.updated_by = request.user
            template.save(update_fields=['document_url', 'filename', 'updated_by', 'updated_at'])
        except DatabaseError:
            logger.exception(
                'Resource template uploaded to Supabase but database save failed. '
                'Confirm settings migration 0003 has been applied.'
            )
            return Response(
                {
                    'detail': (
                        'Template was uploaded, but the database schema is missing '
                        'document_url/filename. Run the settings migration and try again.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(self._payload(template))


class ResourceSampleTemplateDownloadView(APIView):
    """Stream the current template as an attachment for authenticated users."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        template = ResourceSampleTemplate.objects.filter(pk=1).first()
        document_url = (getattr(template, 'document_url', '') or '').strip() if template else ''
        filename = (getattr(template, 'filename', '') or '').strip() if template else ''
        return _stream_remote_document(
            document_url,
            filename=filename or 'resource-sample-template',
            missing_detail='No resource sample template is available.',
            download_error_detail='Unable to download the resource sample template.',
        )


class LegalDocumentView(APIView):
    """Read a legal document publicly, or replace it as a staff user."""

    parser_classes = [MultiPartParser, FormParser]
    allowed_extensions = {'.pdf', '.doc', '.docx', '.txt'}

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    @staticmethod
    def _require_staff(request):
        if not request.user.is_staff and not request.user.is_superuser:
            raise PermissionDenied('Only administrators can update legal documents.')

    def _resolve_key(self, document_key):
        if document_key not in LEGAL_DOCUMENT_CONFIG:
            return None
        return document_key

    def get(self, request, document_key):
        key = self._resolve_key(document_key)
        if not key:
            return Response({'detail': 'Unknown legal document.'}, status=status.HTTP_404_NOT_FOUND)
        document, _ = LegalDocument.objects.get_or_create(key=key)
        return Response(_document_payload(document, include_key=True))

    def put(self, request, document_key):
        self._require_staff(request)
        key = self._resolve_key(document_key)
        if not key:
            return Response({'detail': 'Unknown legal document.'}, status=status.HTTP_404_NOT_FOUND)

        config = LEGAL_DOCUMENT_CONFIG[key]
        document_file = request.FILES.get('document')
        if not document_file:
            return Response({'detail': 'A document is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not any(document_file.name.lower().endswith(extension) for extension in self.allowed_extensions):
            return Response(
                {'detail': 'Upload a PDF, Word, or text document.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        original_filename = Path(document_file.name).name
        stored_filename = _stored_filename(config['stored_basename'], original_filename)
        try:
            document_url = upload_public_media(
                document_file,
                folder=config['folder'],
                stored_filename=stored_filename,
                inline=True,
            )
        except ImproperlyConfigured:
            logger.exception('%s upload blocked: Supabase is not configured.', config['label'])
            return Response(
                {'detail': 'Document storage is not configured. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception('%s upload to Supabase Storage failed.', config['label'])
            return Response(
                {'detail': 'Unable to store the document. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            document, _ = LegalDocument.objects.get_or_create(key=key)
            document.document_url = document_url or ''
            document.filename = stored_filename
            document.updated_by = request.user
            document.save(update_fields=['document_url', 'filename', 'updated_by', 'updated_at'])
        except DatabaseError:
            logger.exception(
                '%s uploaded to Supabase but database save failed. '
                'Confirm settings migration 0004 has been applied.',
                config['label'],
            )
            return Response(
                {
                    'detail': (
                        'Document was uploaded, but the database schema is missing. '
                        'Run the settings migration and try again.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(_document_payload(document, include_key=True))


class LegalDocumentDownloadView(APIView):
    """Stream a legal document publicly for signup and footer links."""

    permission_classes = [AllowAny]

    def get(self, request, document_key):
        config = LEGAL_DOCUMENT_CONFIG.get(document_key)
        if not config:
            return Response({'detail': 'Unknown legal document.'}, status=status.HTTP_404_NOT_FOUND)

        document = LegalDocument.objects.filter(key=document_key).first()
        document_url = (getattr(document, 'document_url', '') or '').strip() if document else ''
        filename = (getattr(document, 'filename', '') or '').strip() if document else ''
        return _stream_remote_document(
            document_url,
            filename=filename or config['default_filename'],
            missing_detail=f"No {config['label']} document is available.",
            download_error_detail=f"Unable to download the {config['label']} document.",
        )

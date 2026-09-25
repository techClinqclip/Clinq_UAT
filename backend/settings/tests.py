from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import MagicMock, patch

from .models import ResourceSampleTemplate


class ResourceSampleTemplateApiTests(APITestCase):
    endpoint = '/api/settings/resource-template/'

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email='template-user@example.com', password='pass1234', type='brand'
        )
        self.admin = get_user_model().objects.create_superuser(
            email='template-admin@example.com', password='pass1234'
        )

    def test_authenticated_users_can_read_the_current_template(self):
        ResourceSampleTemplate.objects.create()
        self.client.force_authenticate(self.user)

        response = self.client.get(self.endpoint)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['documentUrl'])

    def test_only_staff_can_replace_the_template(self):
        upload = SimpleUploadedFile(
            'resource-sample.docx', b'resource template content',
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        self.client.force_authenticate(self.user)

        response = self.client.put(self.endpoint, {'document': upload}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        upload = SimpleUploadedFile(
            'resource-sample.docx', b'resource template content',
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        public_url = 'https://storage.example.com/settings/resource_templates/abc.docx'
        self.client.force_authenticate(self.admin)
        with patch('settings.views.upload_public_media', return_value=public_url) as upload_mock:
            response = self.client.put(self.endpoint, {'document': upload}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        upload_mock.assert_called_once()
        self.assertEqual(upload_mock.call_args.kwargs['folder'], 'settings/resource_templates')
        self.assertEqual(response.data['filename'], 'resource-sample.docx')
        self.assertEqual(response.data['documentUrl'], public_url)

        template = ResourceSampleTemplate.objects.get()
        self.assertEqual(template.updated_by, self.admin)
        self.assertEqual(template.document_url, public_url)
        self.assertEqual(template.filename, 'resource-sample.docx')

        remote = MagicMock()
        remote.read = MagicMock(return_value=b'resource template content')
        with patch('settings.views.urlopen', return_value=remote) as urlopen_mock:
            response = self.client.get(f'{self.endpoint}download/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        urlopen_mock.assert_called_once()
        self.assertIn('attachment;', response['Content-Disposition'])
        self.assertIn('resource-sample.docx', response['Content-Disposition'])

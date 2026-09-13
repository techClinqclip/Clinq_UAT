from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

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

        self.client.force_authenticate(self.admin)
        response = self.client.put(self.endpoint, {'document': upload}, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['filename'], 'resource-sample.docx')
        self.assertIn('resource-sample.docx', response.data['documentUrl'])
        self.assertEqual(ResourceSampleTemplate.objects.get().updated_by, self.admin)

        response = self.client.get(f'{self.endpoint}download/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('attachment;', response['Content-Disposition'])
        self.assertIn('resource-sample.docx', response['Content-Disposition'])

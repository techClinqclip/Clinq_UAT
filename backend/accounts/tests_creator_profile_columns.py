from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Profile


class CreatorProfileColumnPersistenceTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email='creator-columns@example.com', password='pass1234')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_onboarding_payload_persists_to_explicit_columns_and_response(self):
        response = self.client.patch('/api/auth/profile/me/', {
            'role': 'creator',
            'onboarding_data': {
                'niche': 'Tech',
                'interests': ['Reviews', 'Tutorials'],
                'handles': {'youtube': '@techchannel'},
                'portfolioUrl': 'https://example.com/portfolio',
            },
        }, format='json')

        self.assertEqual(response.status_code, 200)
        profile = Profile.objects.get(user=self.user)
        self.assertEqual(profile.primary_niche, 'Tech')
        self.assertEqual(profile.content_interests, ['Reviews', 'Tutorials'])
        self.assertEqual(profile.handles.get('youtube'), '@techchannel')
        self.assertEqual(profile.portfolio_url, 'https://example.com/portfolio')
        self.assertEqual(response.json()['onboarding_data']['niche'], 'Tech')

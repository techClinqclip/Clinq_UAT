from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from content.models import Campaign, CampaignParticipant, CampaignSubmission


class EarningsOverviewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email='clipper@example.com',
            password='testpass123',
        )
        self.profile, _ = Profile.objects.get_or_create(user=self.user)

        self.creator = get_user_model().objects.create_user(
            email='creator@example.com',
            password='testpass123',
        )
        self.campaign = Campaign.objects.create(
            creator=self.creator,
            name='Live Campaign',
            brand_name='Test Brand',
            category='technology',
            budget=Decimal('500.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            status='active',
        )
        self.participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=self.user,
            status='submitted',
        )
        submission = CampaignSubmission(
            participant=self.participant,
            platform='instagram',
            platform_username='clipper',
            content_url='https://example.com/post-1',
            earning=Decimal('20.00'),
            pending_earning=Decimal('5.00'),
            views=1200,
            status='approved',
        )
        submission.save(skip_earning_update=True)

    def test_overview_uses_campaign_submission_earnings(self):
        self.client.force_authenticate(self.user)

        response = self.client.get('/api/earnings/overview/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_earnings'], 25.0)
        self.assertEqual(response.data['available_balance'], 20.0)
        self.assertEqual(response.data['pending_earnings'], 5.0)

    def test_overview_includes_submission_history_in_monthly_chart_and_recent_transactions(self):
        self.client.force_authenticate(self.user)

        response = self.client.get('/api/earnings/overview/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item['amount'] > 0 for item in response.data['monthly_earnings']))
        self.assertTrue(len(response.data['recent_transactions']) >= 1)
        self.assertTrue(any(item['amount'] > 0 for item in response.data['recent_transactions']))

    def test_wallet_includes_real_gig_and_earning_activity(self):
        self.user.type = 'creator'
        self.user.save(update_fields=['type'])
        Campaign.objects.create(
            creator=self.user,
            name='Creator Gig Budget',
            category='technology',
            budget=Decimal('300.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            type='gig',
            status='active',
        )

        self.client.force_authenticate(self.user)
        response = self.client.get('/api/earnings/wallet/')

        self.assertEqual(response.status_code, 200)
        activity = response.data['recent_transactions']
        self.assertTrue(any(item['transactionType'] == 'Earning' and item['amount'] == 20.0 for item in activity))
        self.assertTrue(any(item['transactionType'] == 'Locked' and item['amount'] == 300.0 for item in activity))

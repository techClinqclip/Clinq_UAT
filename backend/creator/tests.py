from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from content.models import Campaign, CampaignParticipant, CampaignSubmission
from earnings.models import Transaction


class CreatorDashboardApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email='creator-test@example.com', password='pass1234')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_dashboard_endpoint_returns_200_for_authenticated_user(self):
        response = self.client.get('/api/creator/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('campaign_participations', response.data.get('stats', {}))

    def test_dashboard_endpoint_returns_campaign_participation_count(self):
        brand = get_user_model().objects.create_user(email='brand-campaigns@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Joined Campaign',
            category='gaming',
            description='Campaign participation count',
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        response = self.client.get('/api/creator/dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['stats']['campaign_participations'], 1)

    def test_dashboard_endpoint_returns_total_earnings_from_approved_campaign_submissions(self):
        brand = get_user_model().objects.create_user(email='brand-earnings@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Earning Campaign',
            category='gaming',
            description='Campaign earnings count',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')
        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@creatoruser',
            content_url='https://instagram.com/p/earnings123',
            earning=Decimal('250.00'),
            status='approved',
        )

        response = self.client.get('/api/creator/dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['stats']['total_earnings'], 250.0)

    def test_dashboard_brand_deals_and_total_submissions_counts(self):
        brand = get_user_model().objects.create_user(email='brand-counts@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Counts Campaign',
            category='gaming',
            description='Campaign counts',
            status='active',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')
        # create one campaign submission
        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@countuser',
            content_url='https://instagram.com/p/counts123',
            earning=Decimal('100.00'),
            status='pending',
        )

        response = self.client.get('/api/creator/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['stats']['brand_deals'], 1)
        self.assertEqual(response.data['stats']['total_submissions'], 1)

    def test_dashboard_uses_active_and_soft_deleted_submission_data_for_real_totals(self):
        brand = get_user_model().objects.create_user(email='brand-soft-delete@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Soft Delete Campaign',
            category='gaming',
            description='Dashboard should use real totals from active and soft-deleted submissions',
            status='active',
            reward_per_1k=Decimal('100.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        active_submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@softdelete-active',
            content_url='https://instagram.com/p/active123',
            views=1200,
            status='approved',
            is_deleted=False,
        )
        deleted_submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@softdelete-deleted',
            content_url='https://youtube.com/watch?v=deleted123',
            views=2000,
            status='approved',
            is_deleted=True,
        )

        active_submission.update_earning()
        deleted_submission.update_earning()

        dashboard_response = self.client.get('/api/creator/dashboard/')
        self.assertEqual(dashboard_response.status_code, 200)
        self.assertEqual(dashboard_response.data['stats']['total_submissions'], 2)
        self.assertEqual(dashboard_response.data['stats']['total_earnings'], 320.0)
        self.assertEqual(dashboard_response.data['stats']['views_generated'], 0.0)

    def test_dashboard_reads_real_gig_records_from_content_campaigns(self):
        creator = get_user_model().objects.create_user(email='creator-gigs@example.com', password='pass1234', type='creator')
        self.client.force_authenticate(user=creator)

        Campaign.objects.create(
            creator=creator,
            name='Weekend Product Demo',
            category='technology',
            description='Real gig data from content campaigns',
            type='gig',
            status='active',
            views=1340,
            submissions=7,
        )
        Campaign.objects.create(
            creator=creator,
            name='Brand Story Reel',
            category='lifestyle',
            description='Another creator gig',
            type='gig',
            status='available',
            views=890,
            submissions=3,
        )
        Campaign.objects.create(
            creator=creator,
            name='Old Draft Gig',
            category='gaming',
            type='gig',
            status='draft',
            views=10,
            submissions=1,
        )

        response = self.client.get('/api/creator/dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['stats']['total_gigs'], 3)
        self.assertEqual(response.data['stats']['active_gigs'], 2)
        self.assertEqual(response.data['stats']['views_generated'], 2240)
        self.assertEqual(len(response.data['top_gigs']), 3)
        self.assertEqual(response.data['top_gigs'][0]['title'], 'Weekend Product Demo')
        self.assertEqual(response.data['top_gigs'][0]['views'], 1340)
        self.assertEqual(response.data['top_gigs'][0]['submissions_count'], 7)

    def test_creator_analytics_uses_real_db_totals_and_keeps_placeholders_for_non_real_fields(self):
        brand = get_user_model().objects.create_user(email='brand-analytics@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Analytics Campaign',
            category='gaming',
            description='Analytics should use real DB data',
            type='campaign',
            status='active',
            reward_per_1k=Decimal('100.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        approved = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@analytics-approved',
            content_url='https://instagram.com/p/analytics1',
            views=5000,
            status='approved',
            is_deleted=False,
        )
        CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@analytics-deleted',
            content_url='https://youtube.com/watch?v=analytics2',
            views=7000,
            status='approved',
            is_deleted=True,
        )

        approved.update_earning()
        CampaignSubmission.objects.filter(id=approved.id).update(earning=Decimal('500.00'), pending_earning=Decimal('0'))

        response = self.client.get('/api/creator/analytics/')

        self.assertEqual(response.status_code, 200)
        payload = response.data[0]
        self.assertEqual(payload['total_views'], 12000)
        self.assertEqual(payload['total_earned'], 1200.0)
        self.assertEqual(payload['unique_viewers'], 0)
        self.assertEqual(payload['avg_watch_time_seconds'], 0)
        self.assertTrue(len(payload['platform_breakdown']) >= 2)
        self.assertTrue(payload['top_gigs'])

    def test_wallet_endpoint_returns_creator_gigs_and_recent_activity_from_db(self):
        brand = get_user_model().objects.create_user(email='brand-wallet@example.com', password='pass1234', type='brand')
        paid_gig = Campaign.objects.create(
            creator=self.user,
            name='Paid Creator Gig',
            category='technology',
            description='Real gig data from DB',
            type='gig',
            status='active',
            budget=Decimal('5000.00'),
            paid_out=Decimal('2200.00'),
            views=4500,
            submissions=8,
        )
        Campaign.objects.create(
            creator=self.user,
            name='Draft Creator Gig',
            category='lifestyle',
            description='Should not be included if not active?',
            type='gig',
            status='draft',
            budget=Decimal('1000.00'),
            paid_out=Decimal('0.00'),
            views=200,
            submissions=1,
        )
        Transaction.objects.create(
            user=self.user,
            amount=Decimal('1200.00'),
            transaction_type='earning',
            status='completed',
            payment_method='upi',
            payment_details='wallet-test@upi',
        )

        response = self.client.get('/api/earnings/wallet/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['campaigns_published']), 2)
        self.assertTrue(any(item['title'] == 'Paid Creator Gig' for item in response.data['campaigns_published']))
        self.assertTrue(any(item['title'] == 'Draft Creator Gig' for item in response.data['campaigns_published']))
        self.assertTrue(response.data['recent_transactions'])

    def test_submissions_endpoint_includes_campaign_participations_for_creator(self):
        brand = get_user_model().objects.create_user(email='brand@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Creator Campaign',
            category='gaming',
            description='Test campaign',
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        response = self.client.get('/api/creator/submissions/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item['title'] == 'Creator Campaign' for item in response.data))

    def test_submissions_endpoint_includes_joined_campaign_thumbnail(self):
        brand = get_user_model().objects.create_user(email='brand-thumbnail@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Thumbnail Campaign',
            category='gaming',
            description='Campaign with a thumbnail',
            thumbnail_url='https://example.com/campaign-thumbnail.jpg',
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        response = self.client.get('/api/creator/submissions/')

        self.assertEqual(response.status_code, 200)
        item = next(item for item in response.data if item['title'] == 'Thumbnail Campaign')
        self.assertEqual(item['campaign_thumbnail'], 'https://example.com/campaign-thumbnail.jpg')

    def test_submission_detail_endpoint_handles_campaign_participation_ids(self):
        brand = get_user_model().objects.create_user(email='brand-detail@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Detail Campaign',
            category='gaming',
            description='Test campaign detail',
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        response = self.client.get(f'/api/creator/submissions/campaign-{campaign.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['title'], 'Detail Campaign')
        self.assertEqual(response.data['source'], 'campaign-participation')

    def test_submission_detail_uuid_is_restricted_to_participant(self):
        brand = get_user_model().objects.create_user(email='brand-uuid@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='UUID Campaign',
            category='gaming',
            description='UUID access control',
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')
        other_clipper = get_user_model().objects.create_user(
            email='other-uuid@example.com', password='pass1234', type='clipper'
        )

        response = self.client.get(f'/api/creator/submissions/campaign-{campaign.public_access_key}/')
        self.assertEqual(response.status_code, 200)

        self.client.force_authenticate(user=other_clipper)
        response = self.client.get(f'/api/creator/submissions/campaign-{campaign.public_access_key}/')
        self.assertEqual(response.status_code, 404)

        response = self.client.get('/api/creator/submissions/campaign-not-a-uuid/')
        self.assertEqual(response.status_code, 400)

    def test_soft_deleted_approved_submission_still_counts_in_campaign_summary(self):
        brand = get_user_model().objects.create_user(email='brand-summary@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Summary Campaign',
            category='gaming',
            description='Soft deleted totals should still count',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')
        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@creatoruser',
            content_url='https://instagram.com/p/summary123',
            earning=Decimal('250.00'),
            status='approved',
            is_deleted=True,
        )

        response = self.client.get(f'/api/creator/submissions/campaign-{campaign.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['published_posts'], 1)
        self.assertEqual(response.data['approved_posts'], 1)
        self.assertEqual(response.data['total_reward'], 250.0)

    def test_submit_content_creates_campaign_submission(self):
        brand = get_user_model().objects.create_user(email='brand-submit@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Submit Campaign',
            category='gaming',
            description='Test submit campaign',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='pending')

        payload = {
            'platform': 'instagram',
            'platformUsername': '@creatoruser',
            'contentUrl': 'https://instagram.com/p/test123',
        }
        response = self.client.post(f'/api/creator/submissions/campaign-{campaign.id}/submit-content/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['title'], 'Submit Campaign')
        self.assertEqual(response.data['published_posts'], 0)
        self.assertEqual(response.data['approved_posts'], 0)
        self.assertEqual(response.data['status'], 'Submitted')
        self.assertEqual(response.data['published_submissions'][0]['platform'], 'Instagram')
        self.assertEqual(response.data['published_submissions'][0]['platformUsername'], '@creatoruser')
        self.assertEqual(response.data['published_submissions'][0]['contentUrl'], 'https://instagram.com/p/test123')
        self.assertEqual(response.data['published_submissions'][0]['likes'], 0)

        participant.refresh_from_db()
        self.assertEqual(participant.status, 'submitted')

    def test_delete_content_removes_campaign_submission(self):
        brand = get_user_model().objects.create_user(email='brand-delete@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Delete Campaign',
            category='gaming',
            description='Test delete campaign',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')
        submission = participant.submissions.create(
            platform='instagram',
            platform_username='@creatoruser',
            content_url='https://instagram.com/p/delete123',
        )

        response = self.client.delete(
            f'/api/creator/submissions/campaign-{campaign.id}/delete-content/',
            {'submissionId': submission.id},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['published_posts'], 0)
        self.assertEqual(response.data['approved_posts'], 0)
        self.assertTrue(participant.submissions.filter(id=submission.id, is_deleted=True).exists())

    def test_submit_content_applies_24_hour_cooldown_for_pending_submission(self):
        brand = get_user_model().objects.create_user(email='brand-cooldown@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Cooldown Campaign',
            category='gaming',
            description='Test cooldown enforcement',
            status='active',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')
        participant.submissions.create(
            platform='instagram',
            platform_username='@creatoruser',
            content_url='https://instagram.com/p/cooldown123',
            status='pending',
        )

        payload = {
            'platform': 'instagram',
            'platformUsername': '@creatoruser',
            'contentUrl': 'https://instagram.com/p/cooldown456',
        }
        response = self.client.post(f'/api/creator/submissions/campaign-{campaign.id}/submit-content/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('Cooling period active', response.data['detail'])

    def test_submit_content_rejects_after_campaign_end_date(self):
        brand = get_user_model().objects.create_user(email='brand-closed@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Closed Campaign',
            category='gaming',
            description='Test closed campaign',
            end_date=date.today() - timedelta(days=1),
            status='active',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        payload = {
            'platform': 'instagram',
            'platformUsername': '@creatoruser',
            'contentUrl': 'https://instagram.com/p/closed123',
        }
        response = self.client.post(f'/api/creator/submissions/campaign-{campaign.id}/submit-content/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'This campaign has ended and is no longer accepting submissions.')

        campaign.refresh_from_db()
        self.assertEqual(campaign.status, 'closed')
        participant.refresh_from_db()
        self.assertEqual(participant.status, 'submitted')

    def test_submit_content_rejects_for_paused_campaign(self):
        brand = get_user_model().objects.create_user(email='brand-paused@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Paused Campaign',
            category='gaming',
            description='Test paused campaign',
            status='paused',
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        payload = {
            'platform': 'instagram',
            'platformUsername': '@creatoruser',
            'contentUrl': 'https://instagram.com/p/paused123',
        }
        response = self.client.post(f'/api/creator/submissions/campaign-{campaign.id}/submit-content/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'This campaign is currently paused and not accepting new submissions.')

    def test_campaign_participation_status_shows_paused_for_paused_campaign(self):
        brand = get_user_model().objects.create_user(email='brand-paused-status@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Paused Participation Campaign',
            category='gaming',
            description='Paused campaign status visible to participants',
            status='paused',
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='submitted')

        response = self.client.get('/api/creator/submissions/')

        self.assertEqual(response.status_code, 200)
        item = next(item for item in response.data if item.get('id') == f'campaign-{campaign.public_access_key}')
        self.assertEqual(item['id'], f'campaign-{campaign.public_access_key}')
        self.assertEqual(item['campaign_status'], 'paused')
        self.assertEqual(item['status'], 'Paused')

    def test_submit_content_rejects_when_platform_not_allowed_by_campaign(self):
        brand = get_user_model().objects.create_user(email='brand-platform@example.com', password='pass1234', type='brand')
        campaign = Campaign.objects.create(
            creator=brand,
            name='Platform Restricted Campaign',
            category='gaming',
            description='Test platform restriction',
            platforms=['instagram', 'youtube'],
        )
        CampaignParticipant.objects.create(campaign=campaign, clipper=self.user, status='pending')

        payload = {
            'platform': 'tiktok',
            'platformUsername': '@creatoruser',
            'contentUrl': 'https://tiktok.com/@creatoruser/video/123',
        }
        response = self.client.post(f'/api/creator/submissions/campaign-{campaign.id}/submit-content/', payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data['detail'],
            'This campaign only accepts submissions on the following platforms: instagram, youtube.'
        )

from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.exceptions import ValidationError
from unittest.mock import patch

from .models import Campaign, CampaignParticipant, CampaignResource, CampaignSubmission, Content, Bid, ClipSubmission
from .serializers import CampaignSerializer
from accounts.models import Profile
from earnings.models import Transaction
from notifications.models import UserNotification

User = get_user_model()


class ContentModelTest(TestCase):
    """Test Content model functionality"""

    def setUp(self):
        self.creator = User.objects.create_user(
            email='creator@test.com',
            password='testpass123',
            type='creator'
        )

    def test_content_creation(self):
        """Test creating a Content instance"""
        content = Content.objects.create(
            creator=self.creator,
            title='Test Project',
            description='Test description',
            category='gaming',
            budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=False
        )
        self.assertEqual(content.status, 'available')
        self.assertEqual(content.creator, self.creator)
        self.assertIsNone(content.assigned_clipper)

    def test_content_str_representation(self):
        """Test Content string representation"""
        content = Content.objects.create(
            creator=self.creator,
            title='Test Project',
            description='Test',
            category='gaming',
            budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4'
        )
        self.assertEqual(str(content), 'Test Project')

    def test_campaign_submission_earning_stops_at_max_limit(self):
        """A later approved submission should not exceed the remaining campaign earning cap."""
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Max Earnings Campaign',
            description='Test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.creator)

        existing_submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='existing',
            content_url='https://instagram.com/p/existing',
            views=8000,
            earning=Decimal('80.00'),
            status='approved',
        )

        new_submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='new',
            content_url='https://instagram.com/p/new',
            views=6000,
            status='approved',
        )

        self.assertEqual(new_submission.calculate_earning(), Decimal('20.00'))

    def test_approved_submission_initializes_pending_earning(self):
        """An approved campaign submission should have its earning queued as pending until settled."""
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Pending Reward Campaign',
            description='Test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.creator)

        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='pending',
            content_url='https://instagram.com/p/pending',
            views=2000,
            status='approved',
        )

        self.assertEqual(submission.earning, Decimal('0.00'))
        self.assertEqual(submission.pending_earning, Decimal('20.00'))

    def test_settle_pending_earning_moves_amount_to_active_earning(self):
        """Admin settlement should move pending earning into active earning."""
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Settlement Campaign',
            description='Test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.creator)

        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='pending',
            content_url='https://instagram.com/p/settle',
            views=2000,
            status='approved',
        )

        submission.approve_pending_earning()
        submission.refresh_from_db()

        self.assertEqual(submission.earning, Decimal('20.00'))
        self.assertEqual(submission.pending_earning, Decimal('0.00'))

    def test_existing_submission_keeps_earning_on_unrelated_save(self):
        """Saving an existing submission without metric changes should not overwrite its stored earning."""
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Preserve Earnings Campaign',
            description='Test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.creator)
        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='existing',
            content_url='https://instagram.com/p/preserve',
            views=8000,
            earning=Decimal('0.00'),
            status='approved',
        )

        submission.earning = Decimal('42.50')
        submission.platform_username = 'updated-handle'
        submission.save()
        submission.refresh_from_db()

        self.assertEqual(submission.earning, Decimal('42.50'))

    def test_creator_can_delete_submission_via_campaign_endpoint(self):
        """Creator can delete a clipper submission through the campaign route."""
        clipper = User.objects.create_user(
            email='clipper@test.com',
            password='testpass123',
            type='clipper',
        )
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Delete Campaign',
            description='Test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            status='active',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=clipper)
        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='clipper-handle',
            content_url='https://youtube.com/shorts/delete-me',
            views=2000,
            status='pending',
        )

        client = APIClient()
        client.force_authenticate(user=self.creator)

        response = client.delete(
            f'/api/content/campaigns/{campaign.id}/clippers/{clipper.id}/submissions/{submission.id}/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        submission.refresh_from_db()
        self.assertTrue(submission.is_deleted)
        self.assertFalse(CampaignSubmission.objects.filter(id=submission.id, is_deleted=False).exists())

    def test_creator_delete_submission_accepts_and_echoes_reason(self):
        """Delete endpoint should accept an optional rejection reason while soft-deleting the submission."""
        clipper = User.objects.create_user(
            email='clipper-reason@test.com',
            password='testpass123',
            type='clipper',
        )
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Delete Reason Campaign',
            description='Test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            status='active',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=clipper)
        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='clipper-reason',
            content_url='https://instagram.com/p/delete-reason',
            views=1500,
            status='pending',
        )

        client = APIClient()
        client.force_authenticate(user=self.creator)

        response = client.delete(
            f'/api/content/campaigns/{campaign.id}/clippers/{clipper.id}/submissions/{submission.id}/',
            {'reason': 'Duplicate post; violates campaign rules.'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get('reason'), 'Duplicate post; violates campaign rules.')
        submission.refresh_from_db()
        self.assertTrue(submission.is_deleted)

    def test_transaction_creation_without_payment_method_does_not_crash(self):
        """Transaction notification signal should tolerate blank payment methods."""
        clipper = User.objects.create_user(
            email='clipper-transaction@test.com',
            password='testpass123',
            type='clipper',
        )

        tx = Transaction.objects.create(
            user=clipper,
            amount=Decimal('486.00'),
            transaction_type='earning',
            status='completed',
        )

        self.assertEqual(tx.amount, Decimal('486.00'))
        self.assertEqual(tx.status, 'completed')

    def test_clip_submission_save_triggers_campaign_earning_recalc(self):
        """When a ClipSubmission's views update, linked CampaignSubmission earnings recalc."""
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Sync Campaign',
            description='Test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('1000.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.creator)

        # initial approved campaign submission with 1k views (pending earning = 10)
        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='sync',
            content_url='https://instagram.com/p/sync',
            views=1000,
            status='approved',
        )

        # create a Content and ClipSubmission that maps to the campaign submission
        content = Content.objects.create(
            creator=self.creator,
            title='Clip Content',
            description='desc',
            category='gaming',
            budget=Decimal('0.00'),
            raw_video_url='https://example.com/video.mp4',
        )

        clip = ClipSubmission.objects.create(
            project=content,
            clipper=self.creator,
            post_url='https://instagram.com/p/sync',
            platform='instagram',
            views=0,
        )

        # Simulate bot updating views
        clip.views = 5000
        clip.save()

        submission.refresh_from_db()
        self.assertEqual(submission.views, 5000)
        # expected earning = (5000/1000)*10 = 50
        self.assertEqual(submission.pending_earning, Decimal('50.00'))

    def test_update_status_if_ended_persists_closed_status(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Ended Campaign',
            description='Campaign that has ended',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            end_date=date.today() - timedelta(days=1),
            status='active',
        )

        updated = campaign.update_status_if_ended()
        campaign.refresh_from_db()

        self.assertTrue(updated)
        self.assertEqual(campaign.status, 'closed')

    def test_update_status_if_ended_keeps_closed_campaign_closed_until_owner_extends_or_settles_budget(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Extendable Campaign',
            description='Campaign with remaining budget',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            paid_out=Decimal('200.00'),
            end_date=date.today() - timedelta(days=1),
            status='closed',
            closure_reason='deadline',
        )

        campaign.end_date = date.today() + timedelta(days=10)
        campaign.update_status_if_ended()
        campaign.refresh_from_db()

        self.assertEqual(campaign.status, 'closed')
        self.assertEqual(campaign.closure_reason, 'deadline')
        self.assertFalse(campaign.remaining_funds_settled)

    def test_update_status_if_ended_keeps_campaign_closed_when_budget_is_exhausted(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Exhausted Budget Campaign',
            description='Campaign whose budget is fully used',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            paid_out=Decimal('1000.00'),
            end_date=date.today() + timedelta(days=20),
            status='closed',
        )

        campaign.update_status_if_ended()
        campaign.refresh_from_db()

        self.assertEqual(campaign.status, 'closed')

    def test_paused_creator_gig_auto_closes_when_budget_is_exhausted(self):
        creator = User.objects.create_user(
            email='creator-paused-gig@test.com',
            password='testpass123',
            type='creator'
        )
        gig = Campaign.objects.create(
            creator=creator,
            name='Paused Creator Gig',
            description='Paused gig should still auto-close when exhausted',
            category='technology',
            budget=Decimal('1500.00'),
            reward_per_1k=Decimal('25.00'),
            max_earnings=Decimal('1500.00'),
            paid_out=Decimal('1500.00'),
            end_date=date.today() + timedelta(days=30),
            status='paused',
            type='gig',
        )

        self.assertTrue(gig.refresh_status_from_state())
        gig.refresh_from_db()

        self.assertEqual(gig.status, 'closed')
        self.assertEqual(gig.closure_reason, 'budget')

    def test_campaign_update_recalculates_status_after_editing_end_date(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Reopened Campaign',
            description='Extend end date to reopen',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            paid_out=Decimal('100.00'),
            end_date=date.today() - timedelta(days=2),
            status='closed',
        )

        serializer = CampaignSerializer()
        updated = serializer.update(campaign, {'end_date': date.today() + timedelta(days=7)})

        self.assertEqual(updated.status, 'active')

    def test_closed_campaign_with_remaining_budget_does_not_auto_reopen_on_future_end_date_update(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Settlement Required Campaign',
            description='Closed campaign with unspent budget',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            paid_out=Decimal('200.00'),
            end_date=date.today() - timedelta(days=2),
            status='closed',
            closure_reason='deadline',
            remaining_funds_settled=False,
        )

        serializer = CampaignSerializer()
        updated = serializer.update(campaign, {'end_date': date.today() + timedelta(days=7)})

        self.assertEqual(updated.status, 'closed')
        self.assertEqual(updated.closure_reason, 'deadline')
        self.assertFalse(updated.remaining_funds_settled)

    def test_manual_close_keeps_event_closed_until_remaining_budget_is_settled(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Manual Close Campaign',
            description='Owner closed early with remaining budget',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
            paid_out=Decimal('250.00'),
            end_date=date.today() + timedelta(days=10),
            status='active',
            remaining_funds_settled=False,
        )

        campaign.status = 'closed'
        campaign.closure_reason = 'manual'
        campaign.save(update_fields=['status', 'closure_reason', 'updated_at'])

        self.assertEqual(campaign.status, 'closed')
        self.assertEqual(campaign.closure_reason, 'manual')
        self.assertFalse(campaign.remaining_funds_settled)
        self.assertGreater(Decimal(str(campaign.budget)) - Decimal(str(campaign.paid_out)), Decimal('0'))

    def test_campaign_metrics_update_from_submissions(self):
        """Campaign aggregate counters should reflect submission metrics."""
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Metrics Campaign',
            description='A metrics test campaign',
            category='gaming',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('100.00'),
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.creator)

        approved_submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='approved',
            content_url='https://instagram.com/p/approved',
            views=2000,
            status='approved',
        )
        pending_submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='pending',
            content_url='https://instagram.com/p/pending',
            views=1000,
            status='pending',
        )

        campaign.refresh_from_db()
        self.assertEqual(campaign.views, 3000)
        self.assertEqual(campaign.submissions, 2)
        self.assertEqual(campaign.paid_out, Decimal('20.00'))

        approved_submission.views = 4000
        approved_submission.save()
        campaign.refresh_from_db()
        self.assertEqual(campaign.views, 5000)
        self.assertEqual(campaign.submissions, 2)
        self.assertEqual(campaign.paid_out, Decimal('40.00'))

        pending_submission.delete()
        campaign.refresh_from_db()
        self.assertEqual(campaign.views, 4000)
        self.assertEqual(campaign.submissions, 1)
        self.assertEqual(campaign.paid_out, Decimal('40.00'))

    def test_submission_blocked_when_budget_exhausted(self):
        """Test that submissions are blocked when campaign budget is exhausted"""
        brand = User.objects.create_user(
            email='brand@test.com',
            password='testpass123',
            type='brand'
        )
        clipper = User.objects.create_user(
            email='clipper@test.com',
            password='testpass123',
            type='clipper'
        )
        
        campaign = Campaign.objects.create(
            creator=brand,
            name='Test Campaign',
            type='campaign',
            status='active',
            budget=Decimal('100.00'),
            paid_out=Decimal('100.00'),  # Budget exhausted
            platforms=['instagram']
        )
        
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=clipper)
        
        # Try to refresh status - should auto-close campaign
        campaign.refresh_status_from_state()
        campaign.refresh_from_db()
        
        # Campaign should be closed
        self.assertEqual(campaign.status, 'closed')
        self.assertEqual(campaign.closure_reason, 'budget')

    def test_submission_blocked_when_deadline_passed(self):
        """Test that submissions are blocked when campaign deadline has passed"""
        brand = User.objects.create_user(
            email='brand@test.com',
            password='testpass123',
            type='brand'
        )
        clipper = User.objects.create_user(
            email='clipper@test.com',
            password='testpass123',
            type='clipper'
        )
        
        campaign = Campaign.objects.create(
            creator=brand,
            name='Test Campaign',
            type='campaign',
            status='active',
            budget=Decimal('1000.00'),
            paid_out=Decimal('0.00'),
            end_date=date.today() - timedelta(days=1),  # Past deadline
            platforms=['instagram']
        )
        
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=clipper)
        
        # Try to refresh status - should auto-close campaign
        campaign.refresh_status_from_state()
        campaign.refresh_from_db()
        
        # Campaign should be closed
        self.assertEqual(campaign.status, 'closed')
        self.assertEqual(campaign.closure_reason, 'deadline')


class ContentViewSetTest(TestCase):
    """Test ContentViewSet API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email='creator@test.com',
            password='testpass123',
            type='creator'
        )
        self.clipper = User.objects.create_user(
            email='clipper@test.com',
            password='testpass123',
            type='clipper'
        )
        self.content = Content.objects.create(
            creator=self.creator,
            title='Test Project',
            description='Test description',
            category='gaming',
            budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=False,
            status='available'
        )

    def test_list_content_requires_authentication(self):
        """Test that listing content requires authentication"""
        response = self.client.get('/api/content/marketplace/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_content_authenticated(self):
        """Test listing content when authenticated"""
        self.client.force_authenticate(user=self.clipper)
        response = self.client.get('/api/content/marketplace/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_list_content_filters_by_category(self):
        """Test filtering content by category"""
        Content.objects.create(
            creator=self.creator,
            title='Another Project',
            description='Test',
            category='sports',
            budget=Decimal('2000.00'),
            raw_video_url='https://example.com/video2.mp4',
            status='available'
        )
        self.client.force_authenticate(user=self.clipper)
        response = self.client.get('/api/content/marketplace/?category=gaming')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # FIX: was response.data[0] — must use response.data['results']
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['category'], 'gaming')

    def test_list_content_only_shows_available(self):
        """Test that only available content is shown"""
        Content.objects.create(
            creator=self.creator,
            title='Claimed Project',
            description='Test',
            category='gaming',
            budget=Decimal('1500.00'),
            raw_video_url='https://example.com/video3.mp4',
            status='claimed',
            assigned_clipper=self.clipper
        )
        self.client.force_authenticate(user=self.clipper)
        response = self.client.get('/api/content/marketplace/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        # FIX: was response.data[0] which raised KeyError: 0
        self.assertEqual(response.data['results'][0]['status'], 'available')

    def test_create_content(self):
        """Test creating new content"""
        self.client.force_authenticate(user=self.creator)
        data = {
            'title': 'New Project',
            'description': 'New description',
            'category': 'technology',
            'budget': '2000.00',
            'raw_video_url': 'https://example.com/new-video.mp4',
            'isBiddable': False
        }
        response = self.client.post('/api/content/marketplace/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Content.objects.count(), 2)
        self.assertEqual(Content.objects.get(id=response.data['id']).creator, self.creator)

    def test_claim_content_success(self):
        """Test successfully claiming a non-biddable content"""
        self.client.force_authenticate(user=self.clipper)
        response = self.client.post(f'/api/content/marketplace/{self.content.id}/claim/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.content.refresh_from_db()
        self.assertEqual(self.content.status, 'claimed')
        self.assertEqual(self.content.assigned_clipper, self.clipper)

    def test_claim_content_creator_cannot_claim_own(self):
        """Test that creator cannot claim their own content"""
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/marketplace/{self.content.id}/claim/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot claim your own', response.data['error'].lower())

    def test_claim_content_already_claimed(self):
        """Test claiming already claimed content"""
        self.content.status = 'claimed'
        self.content.assigned_clipper = self.clipper
        self.content.save()
        another_clipper = User.objects.create_user(
            email='clipper2@test.com',
            password='testpass123',
            type='clipper'
        )
        self.client.force_authenticate(user=another_clipper)
        response = self.client.post(f'/api/content/marketplace/{self.content.id}/claim/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no longer available', response.data['error'].lower())

    def test_claim_content_requires_bid(self):
        """Test that biddable content cannot be claimed directly"""
        self.content.is_biddable = True
        self.content.save()
        self.client.force_authenticate(user=self.clipper)
        response = self.client.post(f'/api/content/marketplace/{self.content.id}/claim/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('requires a bid', response.data['error'].lower())

    def test_submit_review_success(self):
        """Test successfully submitting a review"""
        self.content.status = 'claimed'
        self.content.assigned_clipper = self.clipper
        self.content.save()
        self.client.force_authenticate(user=self.clipper)
        data = {'review_url': 'https://instagram.com/p/abc123', 'platform': 'instagram'}
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/submit-review/', data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.content.refresh_from_db()
        self.assertEqual(self.content.status, 'review')
        self.assertTrue(ClipSubmission.objects.filter(project=self.content).exists())

    def test_submit_review_unauthorized_user(self):
        """Test that only assigned clipper can submit review"""
        self.content.status = 'claimed'
        self.content.assigned_clipper = self.clipper
        self.content.save()
        another_clipper = User.objects.create_user(
            email='clipper2@test.com',
            password='testpass123',
            type='clipper'
        )
        self.client.force_authenticate(user=another_clipper)
        data = {'review_url': 'https://instagram.com/p/abc123', 'platform': 'instagram'}
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/submit-review/', data
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_submit_review_invalid_url(self):
        """Test submitting review with invalid URL"""
        self.content.status = 'claimed'
        self.content.assigned_clipper = self.clipper
        self.content.save()
        self.client.force_authenticate(user=self.clipper)
        data = {'review_url': 'not-a-valid-url', 'platform': 'instagram'}
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/submit-review/', data
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid URL', response.data['error'])

    def test_submit_review_invalid_platform(self):
        """Test submitting review with invalid platform"""
        self.content.status = 'claimed'
        self.content.assigned_clipper = self.clipper
        self.content.save()
        self.client.force_authenticate(user=self.clipper)
        data = {
            'review_url': 'https://instagram.com/p/abc123',
            'platform': 'invalid_platform'
        }
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/submit-review/', data
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid platform', response.data['error'])

    def test_submit_review_duplicate_url(self):
        """Test preventing duplicate URL submissions"""
        self.content.status = 'claimed'
        self.content.assigned_clipper = self.clipper
        self.content.save()

        # FIX: mock the signal to prevent notify_content_clipped() crash
        from unittest.mock import patch
        with patch('content.models.notify_content_clipped'):
            ClipSubmission.objects.create(
                project=self.content,
                clipper=self.clipper,
                post_url='https://instagram.com/p/abc123',
                platform='instagram'
            )

        self.client.force_authenticate(user=self.clipper)
        data = {'review_url': 'https://instagram.com/p/abc123', 'platform': 'instagram'}
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/submit-review/', data
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already submitted', response.data['error'].lower())

    def test_marketplace_query_efficiency(self):
        """Performance test: ensure marketplace doesn't suffer from N+1 queries"""
        for i in range(10):
            Content.objects.create(
                creator=self.creator,
                title=f'Project {i}',
                description='Test',
                category='gaming',
                budget=Decimal('100.00'),
                raw_video_url='https://example.com/v.mp4',
                status='available'
            )
        self.client.force_authenticate(user=self.clipper)
        with self.assertNumQueries(3):
            response = self.client.get('/api/content/marketplace/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)


class ClipperSubmissionsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email='creator-submissions@test.com',
            password='testpass123',
            type='creator'
        )
        self.clipper = User.objects.create_user(
            email='clipper-submissions@test.com',
            password='testpass123',
            type='clipper'
        )

    def test_list_clipper_submissions_returns_current_users_campaign_submissions(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Submission Campaign',
            category='gaming',
            description='Test clipper submissions',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=self.clipper, status='submitted')
        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@clipper',
            content_url='https://instagram.com/p/test-submission',
            views=1200,
            earning=Decimal('30.00'),
            pending_earning=Decimal('10.00'),
            status='approved',
        )

        self.client.force_authenticate(user=self.clipper)
        response = self.client.get('/api/content/clipper-submissions/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['campaign'], 'Submission Campaign')
        self.assertEqual(response.data[0]['status'], 'Approved')
        self.assertEqual(response.data[0]['platform'], 'Instagram')


class BidViewSetTest(TestCase):
    """Test BidViewSet API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email='creator@test.com',
            password='testpass123',
            type='creator'
        )
        self.clipper = User.objects.create_user(
            email='clipper@test.com',
            password='testpass123',
            type='clipper'
        )
        self.content = Content.objects.create(
            creator=self.creator,
            title='Biddable Project',
            description='Test description',
            category='gaming',
            budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=True,
            status='available'
        )

    def test_create_bid_success(self):
        self.client.force_authenticate(user=self.clipper)
        data = {
            'content': self.content.id,
            'pitch': 'I can do this project well',
            'bidAmount': '800.00'
        }
        response = self.client.post('/api/content/bids/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bid.objects.count(), 1)
        self.assertEqual(Bid.objects.first().status, 'pending')

    def test_create_bid_creator_cannot_bid(self):
        self.client.force_authenticate(user=self.creator)
        data = {'content': self.content.id, 'pitch': 'I want to bid', 'bidAmount': '900.00'}
        response = self.client.post('/api/content/bids/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot bid on your own', str(response.data).lower())

    def test_create_bid_duplicate_pending(self):
        Bid.objects.create(
            content=self.content, clipper=self.clipper,
            pitch='First bid', bid_amount=Decimal('800.00'), status='pending'
        )
        self.client.force_authenticate(user=self.clipper)
        data = {'content': self.content.id, 'pitch': 'Second bid', 'bidAmount': '850.00'}
        response = self.client.post('/api/content/bids/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already have a pending bid', str(response.data).lower())

    def test_create_bid_negative_amount(self):
        self.client.force_authenticate(user=self.clipper)
        data = {'content': self.content.id, 'pitch': 'Test bid', 'bidAmount': '-100.00'}
        response = self.client.post('/api/content/bids/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accept_bid_success(self):
        bid = Bid.objects.create(
            content=self.content, clipper=self.clipper,
            pitch='Test pitch', bid_amount=Decimal('800.00'), status='pending'
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/bids/{bid.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bid.refresh_from_db()
        self.content.refresh_from_db()
        self.assertEqual(bid.status, 'accepted')
        self.assertEqual(self.content.status, 'claimed')
        self.assertEqual(self.content.assigned_clipper, self.clipper)
        self.assertTrue(Transaction.objects.filter(
            content=self.content, user=self.clipper, status='pending'
        ).exists())

    def test_accept_bid_only_creator_can_accept(self):
        bid = Bid.objects.create(
            content=self.content, clipper=self.clipper,
            pitch='Test pitch', bid_amount=Decimal('800.00'), status='pending'
        )
        self.client.force_authenticate(user=self.clipper)
        response = self.client.post(f'/api/content/bids/{bid.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accept_bid_already_accepted(self):
        bid = Bid.objects.create(
            content=self.content, clipper=self.clipper,
            pitch='Test pitch', bid_amount=Decimal('800.00'), status='accepted'
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/bids/{bid.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # FIX: view says "this bid is already accepted." not "no longer available"
        self.assertIn('already accepted', response.data['error'].lower())


class ApproveSubmissionTest(TestCase):
    """Test approve_submission endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email='creator@test.com', password='testpass123', type='creator'
        )
        self.clipper = User.objects.create_user(
            email='clipper@test.com', password='testpass123', type='clipper'
        )
        self.content = Content.objects.create(
            creator=self.creator,
            title='Test Project',
            description='Test',
            category='gaming',
            budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            status='review',
            assigned_clipper=self.clipper
        )
        self.transaction = Transaction.objects.create(
            user=self.clipper, content=self.content,
            amount=Decimal('1000.00'), transaction_type='earning', status='pending'
        )

    def test_approve_submission_success(self):
        initial_earnings = self.clipper.profile.total_earnings
        initial_clips = self.clipper.profile.clips_completed
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/approve-submission/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.content.refresh_from_db()
        self.transaction.refresh_from_db()
        self.clipper.profile.refresh_from_db()
        self.assertEqual(self.content.status, 'completed')
        self.assertEqual(self.transaction.status, 'completed')
        self.assertEqual(
            self.clipper.profile.total_earnings,
            initial_earnings + Decimal('1000.00')
        )
        self.assertEqual(self.clipper.profile.clips_completed, initial_clips + 1)

    def test_approve_submission_only_creator_can_approve(self):
        self.client.force_authenticate(user=self.clipper)
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/approve-submission/'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approve_submission_missing_transaction(self):
        self.transaction.delete()
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(
            f'/api/content/marketplace/{self.content.id}/approve-submission/'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Pending transaction not found', response.data['error'])


class EdgeCasesTest(TestCase):
    """Test edge cases and race conditions"""

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email='creator@test.com', password='testpass123', type='creator'
        )
        self.clipper = User.objects.create_user(
            email='clipper@test.com', password='testpass123', type='clipper'
        )

    def test_multiple_pending_transactions(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            status='review', assigned_clipper=self.clipper
        )
        for _ in range(2):
            Transaction.objects.create(
                user=self.clipper, content=content,
                amount=Decimal('1000.00'), transaction_type='earning', status='pending'
            )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(
            f'/api/content/marketplace/{content.id}/approve-submission/'
        )
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_bid_amount_exceeds_budget_warning(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=True, status='available'
        )
        self.client.force_authenticate(user=self.clipper)
        data = {'content': content.id, 'pitch': 'Test', 'bidAmount': '2500.00'}
        response = self.client.post('/api/content/bids/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_claim_content_race_condition(self):
        content = Content.objects.create(
            creator=self.creator, title='Race Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=False, status='available'
        )
        clipper2 = User.objects.create_user(
            email='clipper2@test.com', password='testpass123', type='clipper'
        )
        self.client.force_authenticate(user=self.clipper)
        r1 = self.client.post(f'/api/content/marketplace/{content.id}/claim/')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=clipper2)
        r2 = self.client.post(f'/api/content/marketplace/{content.id}/claim/')
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_review_wrong_status(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            status='available', assigned_clipper=self.clipper
        )
        self.client.force_authenticate(user=self.clipper)
        data = {'review_url': 'https://instagram.com/p/abc123', 'platform': 'instagram'}
        response = self.client.post(
            f'/api/content/marketplace/{content.id}/submit-review/', data
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('claimed', response.data['error'].lower())

    def test_approve_submission_wrong_status(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            status='claimed', assigned_clipper=self.clipper
        )
        Transaction.objects.create(
            user=self.clipper, content=content,
            amount=Decimal('1000.00'), transaction_type='earning', status='pending'
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(
            f'/api/content/marketplace/{content.id}/approve-submission/'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('review', response.data['error'].lower())

    def test_bid_on_non_biddable_content(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=False, status='available'
        )
        self.client.force_authenticate(user=self.clipper)
        data = {'content': content.id, 'pitch': 'Test', 'bidAmount': '800.00'}
        response = self.client.post('/api/content/bids/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('does not accept bids', str(response.data).lower())

    def test_bid_on_unavailable_content(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=True, status='claimed', assigned_clipper=self.clipper
        )
        self.client.force_authenticate(user=self.clipper)
        data = {'content': content.id, 'pitch': 'Test', 'bidAmount': '800.00'}
        response = self.client.post('/api/content/bids/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no longer available', str(response.data).lower())

    def test_accept_bid_content_already_claimed(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=True, status='claimed', assigned_clipper=self.clipper
        )
        bid = Bid.objects.create(
            content=content, clipper=self.clipper,
            pitch='Test', bid_amount=Decimal('800.00'), status='pending'
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/bids/{bid.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_review_empty_url(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            status='claimed', assigned_clipper=self.clipper
        )
        self.client.force_authenticate(user=self.clipper)
        response = self.client.post(
            f'/api/content/marketplace/{content.id}/submit-review/',
            {'platform': 'instagram'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_content_invalid_budget(self):
        self.client.force_authenticate(user=self.creator)
        data = {
            'title': 'Test', 'description': 'Test', 'category': 'gaming',
            'budget': '-100.00', 'raw_video_url': 'https://example.com/video.mp4',
            'isBiddable': False
        }
        response = self.client.post('/api/content/marketplace/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_content_missing_required_fields(self):
        self.client.force_authenticate(user=self.creator)
        response = self.client.post('/api/content/marketplace/', {'title': 'Test'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_submission_updates_profile_correctly(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1500.50'),
            raw_video_url='https://example.com/video.mp4',
            status='review', assigned_clipper=self.clipper
        )
        initial_earnings = self.clipper.profile.total_earnings
        initial_clips = self.clipper.profile.clips_completed
        Transaction.objects.create(
            user=self.clipper, content=content,
            amount=Decimal('1500.50'), transaction_type='earning', status='pending'
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(
            f'/api/content/marketplace/{content.id}/approve-submission/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.clipper.profile.refresh_from_db()
        self.assertEqual(
            self.clipper.profile.total_earnings,
            initial_earnings + Decimal('1500.50')
        )
        self.assertEqual(self.clipper.profile.clips_completed, initial_clips + 1)

    def test_accept_bid_creates_transaction(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=True, status='available'
        )
        bid = Bid.objects.create(
            content=content, clipper=self.clipper,
            pitch='Test', bid_amount=Decimal('750.00'), status='pending'
        )
        count_before = Transaction.objects.count()
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/bids/{bid.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Transaction.objects.count(), count_before + 1)
        txn = Transaction.objects.filter(
            content=content, user=self.clipper, status='pending'
        ).first()
        self.assertIsNotNone(txn)
        self.assertEqual(txn.amount, Decimal('750.00'))
        self.assertEqual(txn.transaction_type, 'earning')

    def test_accept_bid_rejects_other_bids(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            is_biddable=True, status='available'
        )
        clipper2 = User.objects.create_user(
            email='clipper2@test.com', password='testpass123', type='clipper'
        )
        bid1 = Bid.objects.create(
            content=content, clipper=self.clipper,
            pitch='Test 1', bid_amount=Decimal('800.00'), status='pending'
        )
        bid2 = Bid.objects.create(
            content=content, clipper=clipper2,
            pitch='Test 2', bid_amount=Decimal('900.00'), status='pending'
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/bids/{bid1.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bid1.refresh_from_db()
        bid2.refresh_from_db()
        self.assertEqual(bid1.status, 'accepted')
        self.assertEqual(bid2.status, 'rejected')

    def test_submit_review_all_platforms(self):
        content = Content.objects.create(
            creator=self.creator, title='Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            status='claimed', assigned_clipper=self.clipper
        )
        for platform in ['instagram', 'youtube', 'tiktok']:
            ClipSubmission.objects.filter(project=content).delete()
            content.status = 'claimed'
            content.save()
            self.client.force_authenticate(user=self.clipper)
            data = {
                'review_url': f'https://{platform}.com/p/test123',
                'platform': platform
            }
            response = self.client.post(
                f'/api/content/marketplace/{content.id}/submit-review/', data
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_submit_review_supports_facebook_and_twitter(self):
        content = Content.objects.create(
            creator=self.creator, title='Social Test', description='Test',
            category='gaming', budget=Decimal('1000.00'),
            raw_video_url='https://example.com/video.mp4',
            status='claimed', assigned_clipper=self.clipper
        )
        for platform in ['facebook', 'twitter', 'x']:
            ClipSubmission.objects.filter(project=content).delete()
            content.status = 'claimed'
            content.save()
            self.client.force_authenticate(user=self.clipper)
            response = self.client.post(
                f'/api/content/marketplace/{content.id}/submit-review/',
                {
                    'review_url': f'https://{platform}.com/post/test123',
                    'platform': platform,
                },
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(ClipSubmission.objects.get(project=content).platform, 'twitter' if platform == 'x' else platform)

    def test_list_content_pagination(self):
        for i in range(5):
            Content.objects.create(
                creator=self.creator, title=f'Project {i}', description='Test',
                category='gaming', budget=Decimal('1000.00'),
                raw_video_url=f'https://example.com/video{i}.mp4', status='available'
            )
        self.client.force_authenticate(user=self.clipper)
        response = self.client.get('/api/content/marketplace/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)


class CampaignViewSetTest(TestCase):
    """Test CampaignViewSet API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email='creator@test.com',
            password='testpass123',
            type='creator'
        )
        self.other_creator = User.objects.create_user(
            email='creator2@test.com',
            password='testpass123',
            type='creator'
        )
        self.campaign = Campaign.objects.create(
            creator=self.creator,
            name='Test Campaign',
            description='A test campaign',
            category='gaming',
            budget=Decimal('5000.00'),
            reward_per_1k=Decimal('25.00'),
            max_earnings=Decimal('2500.00'),
            platforms=['YouTube', 'Instagram']
        )

    def test_list_campaigns_returns_creator_campaigns(self):
        Campaign.objects.create(
            creator=self.creator,
            name='Another Campaign',
            category='lifestyle',
            budget=Decimal('2000.00'),
            reward_per_1k=Decimal('20.00'),
            max_earnings=Decimal('1000.00'),
            platforms=['X']
        )
        Campaign.objects.create(
            creator=self.other_creator,
            name='Other Creator Campaign',
            category='education',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('15.00'),
            max_earnings=Decimal('600.00'),
            platforms=['Facebook']
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.get('/api/content/campaigns/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            results = data.get('results', [])
        else:
            results = data
        self.assertEqual(len(results), 2)
        self.assertEqual({item['name'] for item in results}, {'Test Campaign', 'Another Campaign'})

    def test_joined_campaign_accepts_facebook_and_twitter_submissions(self):
        clipper = User.objects.create_user(
            email='social-clipper@test.com', password='testpass123', type='clipper'
        )
        self.campaign.platforms = ['Facebook', 'Twitter']
        self.campaign.save(update_fields=['platforms'])
        admin = User.objects.create_superuser(email='submission-admin@test.com', password='testpass123')
        self.client.force_authenticate(user=clipper)

        for index, platform in enumerate(['facebook', 'x']):
            current_clipper = clipper if index == 0 else User.objects.create_user(
                email='social-clipper-x@test.com', password='testpass123', type='clipper'
            )
            CampaignParticipant.objects.create(campaign=self.campaign, clipper=current_clipper, status='submitted')
            self.client.force_authenticate(user=current_clipper)
            response = self.client.post(
                f'/api/content/campaigns/{self.campaign.id}/submit-clip/',
                {
                    'platform': platform,
                    'username': '@socialclipper',
                    'url': f'https://{platform}.com/post/{platform}-123',
                },
                format='json',
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
            submission = CampaignSubmission.objects.get(id=response.data['submission']['id'])
            self.assertEqual(submission.platform, 'twitter' if platform == 'x' else platform)
            self.assertTrue(UserNotification.objects.filter(
                user=admin,
                event__event_type='content.submission_pending_review',
            ).exists())

    def test_pending_payout_queue_and_settlement_update_database(self):
        clipper = User.objects.create_user(email='payout-clipper@test.com', password='testpass123', type='clipper')
        participant = CampaignParticipant.objects.create(campaign=self.campaign, clipper=clipper, status='submitted')
        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@payoutclipper',
            content_url='https://instagram.com/p/payout-1',
            views=1000,
            status='approved',
        )
        admin = User.objects.create_superuser(email='payout-admin@test.com', password='testpass123')
        self.client.force_authenticate(user=admin)

        queue = self.client.get('/api/content/campaign-submissions/?queue=payouts')
        self.assertEqual(queue.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == submission.id for item in queue.data))

        response = self.client.post(
            f'/api/content/campaign-submissions/{submission.id}/settle-pending/',
            {'notes': 'Views verified'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        submission.refresh_from_db()
        clipper.profile.refresh_from_db()
        self.assertEqual(submission.pending_earning, Decimal('0.00'))
        self.assertEqual(submission.earning, Decimal('25.00'))
        self.assertEqual(submission.payout_review_status, 'approved')
        self.assertEqual(clipper.profile.total_earnings, Decimal('25.00'))

        refreshed_queue = self.client.get('/api/content/campaign-submissions/?queue=payouts')
        queued_submission = next(item for item in refreshed_queue.data if item['id'] == submission.id)
        self.assertEqual(queued_submission['payoutReviewStatus'], 'approved')

    def test_admin_can_approve_and_reject_campaign_submissions(self):
        clipper = User.objects.create_user(email='queue-clipper@test.com', password='testpass123', type='clipper')
        participant = CampaignParticipant.objects.create(campaign=self.campaign, clipper=clipper, status='submitted')
        first = CampaignSubmission.objects.create(
            participant=participant, platform='instagram', platform_username='@queueclipper',
            content_url='https://instagram.com/p/queue-1',
        )
        second = CampaignSubmission.objects.create(
            participant=participant, platform='youtube', platform_username='@queueclipper',
            content_url='https://youtube.com/watch?v=queue-2',
        )
        admin = User.objects.create_superuser(email='queue-admin@test.com', password='testpass123')
        self.client.force_authenticate(user=admin)

        queue = self.client.get('/api/content/campaign-submissions/')
        self.assertEqual(queue.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == first.id for item in queue.data))

        approved = self.client.post(
            f'/api/content/campaign-submissions/{first.id}/approve/',
            {'checks': {'contentRequirements': True}, 'notes': 'Verified'},
            format='json',
        )
        rejected = self.client.post(
            f'/api/content/campaign-submissions/{second.id}/reject/',
            {'reason': 'The submitted account does not match the campaign requirements.'},
            format='json',
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assertEqual(rejected.status_code, status.HTTP_200_OK)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, 'approved')
        self.assertEqual(first.review_notes, 'Verified')
        self.assertEqual(second.status, 'rejected')
        self.assertTrue(second.rejection_reason)

    def test_retrieve_campaign(self):
        self.client.force_authenticate(user=self.creator)
        response = self.client.get(f'/api/content/campaigns/{self.campaign.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Campaign')
        self.assertEqual(response.data['category'], 'gaming')

    def test_campaign_uses_brand_profile_name_instead_of_generic_brand_label(self):
        self.creator.profile.company_name = 'Acme Studios'
        self.creator.profile.save(update_fields=['company_name'])
        self.client.force_authenticate(user=self.other_creator)
        response = self.client.get('/api/content/campaigns/?scope=marketplace')
        campaigns = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        campaign = next(item for item in campaigns if item['id'] == self.campaign.id)
        self.assertEqual(campaign['brandName'], 'Acme Studios')

    def test_creator_can_retrieve_by_access_key_but_other_user_cannot(self):
        self.client.force_authenticate(user=self.creator)
        response = self.client.get(f'/api/content/campaigns/{self.campaign.public_access_key}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['accessKey'], str(self.campaign.public_access_key))

        self.client.force_authenticate(user=self.other_creator)
        response = self.client.get(f'/api/content/campaigns/{self.campaign.public_access_key}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_joined_participant_can_retrieve_by_access_key(self):
        clipper = User.objects.create_user(
            email='participant-access-key@test.com', password='testpass123', type='clipper'
        )
        CampaignParticipant.objects.create(campaign=self.campaign, clipper=clipper)

        self.client.force_authenticate(user=clipper)
        response = self.client.get(f'/api/content/campaigns/{self.campaign.public_access_key}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['accessKey'], str(self.campaign.public_access_key))

    def test_joined_gig_access_key_requires_membership(self):
        clipper = User.objects.create_user(
            email='joined-key-clipper@test.com', password='testpass123', type='clipper'
        )
        other_clipper = User.objects.create_user(
            email='other-key-clipper@test.com', password='testpass123', type='clipper'
        )
        CampaignParticipant.objects.create(campaign=self.campaign, clipper=clipper)

        self.client.force_authenticate(user=clipper)
        response = self.client.get(
            f'/api/content/campaigns/{self.campaign.public_access_key}/joined-gig/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['accessKey'], str(self.campaign.public_access_key))

        self.client.force_authenticate(user=other_clipper)
        response = self.client.get(
            f'/api/content/campaigns/{self.campaign.public_access_key}/joined-gig/'
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_brand_dashboard_uses_active_and_soft_deleted_submission_data(self):
        """Dashboard totals should include both active and soft-deleted approved submissions."""
        clipper = User.objects.create_user(
            email='clipper-dashboard@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@active-views',
            content_url='https://example.com/active',
            views=2500,
            earning=Decimal('120.00'),
            pending_earning=Decimal('0'),
            status='approved',
            is_deleted=False,
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@deleted-views',
            content_url='https://example.com/deleted',
            views=1800,
            earning=Decimal('80.00'),
            pending_earning=Decimal('0'),
            status='approved',
            is_deleted=True,
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get('/api/content/campaigns/dashboard/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_campaigns'], 1)
        self.assertEqual(response.data['views_generated'], 4300)

    def test_brand_analytics_uses_active_and_soft_deleted_submission_data(self):
        """Brand analytics should aggregate active and soft-deleted approved submissions."""
        clipper = User.objects.create_user(
            email='clipper-brand-analytics@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@brand-views-active',
            content_url='https://example.com/brand-active',
            views=3000,
            earning=Decimal('250.00'),
            pending_earning=Decimal('20.00'),
            status='approved',
            is_deleted=False,
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@brand-views-deleted',
            content_url='https://example.com/brand-deleted',
            views=1700,
            earning=Decimal('120.00'),
            pending_earning=Decimal('10.00'),
            status='approved',
            is_deleted=True,
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get('/api/content/campaigns/analytics/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_views'], 4700)
        self.assertEqual(float(response.data['total_earnings']), 117.5)
        self.assertEqual(len(response.data['top_campaigns']), 1)
        self.assertEqual(response.data['top_campaigns'][0]['name'], 'Test Campaign')
        self.assertGreater(len(response.data['views_by_period']['7D']), 0)
        self.assertGreater(len(response.data['payout_by_period']['7D']), 0)

    def test_brand_budget_uses_active_and_soft_deleted_submission_data(self):
        """Brand budget should aggregate active and soft-deleted approved submissions for payout calculations."""
        self.campaign.budget = Decimal('5000.00')
        self.campaign.save()

        clipper = User.objects.create_user(
            email='clipper-budget@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@budget-active',
            content_url='https://example.com/budget-active',
            views=3000,
            earning=Decimal('75.00'),
            pending_earning=Decimal('25.00'),
            status='approved',
            is_deleted=False,
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@budget-deleted',
            content_url='https://example.com/budget-deleted',
            views=2000,
            earning=Decimal('50.00'),
            pending_earning=Decimal('0.00'),
            status='approved',
            is_deleted=True,
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get('/api/content/campaigns/budget/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(response.data['total_spent']), 125.0)
        self.assertEqual(float(response.data['total_budget']), 5000.0)
        self.assertEqual(float(response.data['active_budget']), 5000.0)
        self.assertEqual(len(response.data['campaign_budgets']), 1)
        self.assertEqual(response.data['campaign_budgets'][0]['name'], 'Test Campaign')
        self.assertEqual(float(response.data['campaign_budgets'][0]['spent']), 125.0)
        self.assertGreater(len(response.data['payout_by_period']['7D']), 0)

    def test_campaign_participants_endpoint(self):
        clipper = User.objects.create_user(
            email='clipper1@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )
        CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@clipper1',
            content_url='https://example.com/video',
            earning=Decimal('1200.00'),
            pending_earning=Decimal('0'),
            likes=100,
            views=3000,
            status='approved'
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get(f'/api/content/campaigns/{self.campaign.id}/participants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['username'], '@clipper1')
        self.assertEqual(response.data[0]['platform'], 'YouTube')
        self.assertEqual(response.data[0]['views'], 3000)
        self.assertEqual(response.data[0]['status'], 'Submitted')
        self.assertEqual(response.data[0]['campaignStatus'], 'active')
        self.assertEqual(response.data[0]['earned'], '₹1200.00')

    def test_campaign_participants_endpoint_includes_paused_campaign_status(self):
        clipper = User.objects.create_user(
            email='clipper3@test.com',
            password='testpass123',
            type='clipper'
        )
        paused_campaign = Campaign.objects.create(
            creator=self.creator,
            name='Paused Campaign',
            category='entertainment',
            status='paused',
        )
        CampaignParticipant.objects.create(
            campaign=paused_campaign,
            clipper=clipper,
            status='submitted'
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get(f'/api/content/campaigns/{paused_campaign.id}/participants/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['campaignStatus'], 'paused')

    def test_campaign_clipper_submissions_endpoint(self):
        clipper = User.objects.create_user(
            email='clipper2@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )
        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@clipper2',
            content_url='https://example.com/video2',
            earning=Decimal('800.00'),
            pending_earning=Decimal('0'),
            likes=50,
            views=2000,
            status='approved'
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get(
            f'/api/content/campaigns/{self.campaign.id}/clippers/{clipper.id}/submissions/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['participant']['clipperId'], clipper.id)
        self.assertEqual(response.data['participant']['username'], '@clipper2')
        self.assertEqual(response.data['participant']['campaign'], 'Test Campaign')
        self.assertEqual(len(response.data['submissions']), 1)
        self.assertEqual(response.data['submissions'][0]['platform'], 'YouTube')
        self.assertEqual(response.data['submissions'][0]['earning'], '800.00')

    def test_campaign_clipper_submissions_endpoint_uses_profile_username(self):
        clipper = User.objects.create_user(
            email='clipper4@test.com',
            password='testpass123',
            type='clipper'
        )
        Profile.objects.create(user=clipper, username='xifona4538')

        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )
        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@clipper4',
            content_url='https://example.com/video4',
            earning=Decimal('500.00'),
            pending_earning=Decimal('0'),
            likes=25,
            views=1500,
            status='approved'
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get(
            f'/api/content/campaigns/{self.campaign.id}/clippers/{clipper.id}/submissions/'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['participant']['username'], '@xifona4538')

    def test_campaign_performance_uses_active_and_soft_deleted_submission_data(self):
        """Campaign performance metrics must include soft-deleted approved submissions."""
        self.campaign.reward_per_1k = Decimal('100.00')
        self.campaign.max_earnings = Decimal('1000.00')
        self.campaign.save()

        clipper = User.objects.create_user(
            email='clipper-performance@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )

        soft_deleted = CampaignSubmission(
            participant=participant,
            platform='youtube',
            platform_username='@clipper-softdelete',
            content_url='https://youtube.com/watch?v=deleted',
            likes=100,
            views=2000,
            earning=Decimal('150.00'),
            pending_earning=Decimal('0'),
            status='approved',
            is_deleted=True,
        )
        soft_deleted.save(skip_earning_update=True)

        active = CampaignSubmission(
            participant=participant,
            platform='instagram',
            platform_username='@clipper-active',
            content_url='https://instagram.com/p/active',
            likes=50,
            views=1500,
            earning=Decimal('200.00'),
            pending_earning=Decimal('50.00'),
            status='approved',
            is_deleted=False,
        )
        active.save(skip_earning_update=True)

        self.client.force_authenticate(user=self.creator)
        response = self.client.get(f'/api/content/campaigns/{self.campaign.id}/performance/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_views'], 3500)
        self.assertEqual(float(response.data['total_payout']), 400.0)
        self.assertEqual(response.data['clippers_paid'], 1)
        self.assertGreater(len(response.data['views_by_period']['7D']), 0)
        self.assertGreater(len(response.data['payout_by_period']['7D']), 0)

    def test_campaign_clipper_submissions_includes_soft_deleted_in_totals(self):
        """Soft-deleted approved submissions should still be counted in totals."""
        self.campaign.reward_per_1k = Decimal('100.00')
        self.campaign.max_earnings = Decimal('1000.00')
        self.campaign.save()

        clipper = User.objects.create_user(
            email='clipper-softdelete@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@clipper-softdelete',
            content_url='https://youtube.com/watch?v=deleted',
            likes=100,
            views=2000,
            status='approved',
            is_deleted=True,
        )

        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@clipper-softdelete-ig',
            content_url='https://instagram.com/p/active',
            likes=50,
            views=1500,
            status='approved',
            is_deleted=False,
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.get(
            f'/api/content/campaigns/{self.campaign.id}/clippers/{clipper.id}/submissions/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['participant']['totalViews'], 3500)
        self.assertEqual(response.data['participant']['totalEarnings'], 350.0)
        self.assertEqual(response.data['participant']['totalSubmissions'], 2)
        self.assertEqual(response.data['participant']['approvedSubmissions'], 2)
        self.assertEqual(response.data['participant']['campaign'], 'Test Campaign')
        self.assertEqual(len(response.data['submissions']), 1)
        self.assertEqual(response.data['submissions'][0]['platform'], 'Instagram')
        self.assertEqual(response.data['submissions'][0]['earning'], 0.0)
        self.assertEqual(response.data['submissions'][0]['pendingEarning'], 150.0)
        self.assertEqual(response.data['participant']['bestPlatform'], 'YouTube')

    def test_campaign_clipper_gigs_endpoint_recalculates_submission_earnings(self):
        clipper = User.objects.create_user(
            email='clipper3@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )
        # Create a stale approved submission whose stored pending_earning is out of sync.
        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@clipper3',
            content_url='https://example.com/video3',
            earning=Decimal('0.00'),
            pending_earning=Decimal('0.00'),
            likes=10,
            views=1200,
            status='approved'
        )

        self.client.force_authenticate(user=clipper)
        response = self.client.get('/api/content/campaigns/clipper-gigs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        matching = [gig for gig in response.data if gig['id'] == self.campaign.id]
        self.assertEqual(len(matching), 1)
        self.assertEqual(matching[0]['pendingPayout'], 30.0)
        self.assertEqual(matching[0]['myEarnings'], 0.0)

    def test_clipper_joined_gig_detail_endpoint_returns_campaign_for_participant(self):
        clipper = User.objects.create_user(
            email='clipper5@test.com',
            password='testpass123',
            type='clipper'
        )
        CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )
        CampaignResource.objects.create(
            campaign=self.campaign,
            name='Source Video',
            url='https://example.com/source-video.mp4',
            order=1,
        )

        self.client.force_authenticate(user=clipper)
        response = self.client.get(f'/api/content/campaigns/{self.campaign.id}/joined-gig/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.campaign.id)
        self.assertEqual(response.data['name'], 'Test Campaign')
        self.assertEqual(response.data['brandName'], 'Brand')
        self.assertEqual(response.data['status'], 'Active')
        self.assertIn('platforms', response.data)
        self.assertEqual(response.data['resources'][0]['name'], 'Source Video')
        self.assertEqual(response.data['resources'][0]['url'], 'https://example.com/source-video.mp4')

    def test_submit_clip_rejects_disallowed_platform(self):
        clipper = User.objects.create_user(
            email='clipper6@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )

        self.client.force_authenticate(user=clipper)
        response = self.client.post(
            f'/api/content/campaigns/{self.campaign.id}/submit-clip/',
            {
                'platform': 'tiktok',
                'username': '@clipper6',
                'url': 'https://tiktok.com/@clipper6/video/12345',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], "Platform 'tiktok' is not allowed for this campaign.")
        self.assertEqual(response.data['allowed_platforms'], ['youtube', 'instagram'])

    def test_submit_clip_enforces_48_hour_cooldown_after_approved_submission(self):
        clipper = User.objects.create_user(
            email='clipper7@test.com',
            password='testpass123',
            type='clipper'
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign,
            clipper=clipper,
            status='submitted'
        )
        approved_submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            platform_username='@clipper7',
            content_url='https://instagram.com/p/approved7',
            views=1000,
            status='approved'
        )
        approved_submission.updated_at = timezone.now() - timedelta(hours=1)
        approved_submission.save(update_fields=['updated_at'])

        self.client.force_authenticate(user=clipper)
        response = self.client.post(
            f'/api/content/campaigns/{self.campaign.id}/submit-clip/',
            {
                'platform': 'instagram',
                'username': '@clipper7',
                'url': 'https://instagram.com/p/new7',
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cooldown_ends_at', response.data)
        self.assertEqual(
            response.data['error'],
            'You cannot submit a new clip until the 48-hour cooling period after your last approved submission has passed.'
        )

    def test_list_campaigns_for_clipper_returns_public_active_campaigns(self):
        brand_campaign = Campaign.objects.create(
            creator=self.other_creator,
            name='Public Campaign',
            category='fashion',
            budget=Decimal('4000.00'),
            reward_per_1k=Decimal('20.00'),
            max_earnings=Decimal('1800.00'),
            platforms=['Instagram'],
            status='active',
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.get('/api/content/campaigns/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {item['name'] for item in response.data.get('results', response.data)}
        self.assertIn(brand_campaign.name, names)

    def test_join_campaign_creates_participant_for_clipper(self):
        campaign = Campaign.objects.create(
            creator=self.other_creator,
            name='Joinable Campaign',
            category='sports',
            budget=Decimal('3500.00'),
            reward_per_1k=Decimal('18.00'),
            max_earnings=Decimal('1500.00'),
            platforms=['YouTube'],
            status='active',
        )
        clipper = User.objects.create_user(
            email='clipper-join@test.com',
            password='testpass123',
            type='clipper'
        )
        self.client.force_authenticate(user=clipper)
        response = self.client.post(f'/api/content/campaigns/{campaign.id}/join/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CampaignParticipant.objects.filter(campaign=campaign, clipper=clipper).exists())

    def test_brand_cannot_join_campaign(self):
        campaign = Campaign.objects.create(
            creator=self.other_creator,
            name='Brand View Only Campaign',
            category='tech',
            budget=Decimal('2000.00'),
            reward_per_1k=Decimal('15.00'),
            max_earnings=Decimal('1200.00'),
            platforms=['Instagram'],
            status='active',
        )
        brand = User.objects.create_user(
            email='brand-join@test.com',
            password='testpass123',
            type='brand'
        )
        self.client.force_authenticate(user=brand)
        response = self.client.post(f'/api/content/campaigns/{campaign.id}/join/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creator_can_join_other_active_campaign(self):
        campaign = Campaign.objects.create(
            creator=self.other_creator,
            name='Creator Joinable Campaign',
            category='finance',
            budget=Decimal('2600.00'),
            reward_per_1k=Decimal('18.00'),
            max_earnings=Decimal('1300.00'),
            platforms=['YouTube'],
            status='active',
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/campaigns/{campaign.id}/join/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CampaignParticipant.objects.filter(campaign=campaign, clipper=self.creator).exists())

    def test_creator_cannot_join_own_campaign(self):
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Own Campaign',
            category='lifestyle',
            budget=Decimal('2500.00'),
            reward_per_1k=Decimal('20.00'),
            max_earnings=Decimal('1100.00'),
            platforms=['Instagram'],
            status='active',
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.post(f'/api/content/campaigns/{campaign.id}/join/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_clipper_cannot_join_same_campaign_twice(self):
        campaign = Campaign.objects.create(
            creator=self.other_creator,
            name='Single Join Campaign',
            category='gaming',
            budget=Decimal('3200.00'),
            reward_per_1k=Decimal('20.00'),
            max_earnings=Decimal('1600.00'),
            platforms=['Twitch'],
            status='active',
        )
        clipper = User.objects.create_user(
            email='clipper-repeat@test.com',
            password='testpass123',
            type='clipper'
        )
        self.client.force_authenticate(user=clipper)
        first = self.client.post(f'/api/content/campaigns/{campaign.id}/join/')
        second = self.client.post(f'/api/content/campaigns/{campaign.id}/join/')
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(CampaignParticipant.objects.filter(campaign=campaign, clipper=clipper).count(), 1)

    def test_create_campaign(self):
        self.client.force_authenticate(user=self.creator)
        payload = {
            'name': 'New Campaign',
            'description': 'A new test campaign',
            'category': 'technology',
            'budget': '3000.00',
            'rewardPer1k': '30.00',
            'maxEarnings': '1500.00',
            'platforms': ['YouTube'],
            'resources': [
                {'name': 'Brief', 'url': 'https://example.com/brief'}
            ]
        }
        response = self.client.post('/api/content/campaigns/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Campaign.objects.filter(creator=self.creator).count(), 2)
        self.assertEqual(response.data['name'], 'New Campaign')
        self.assertEqual(response.data['resources'][0]['name'], 'Brief')

    def test_brand_campaign_create_requires_wallet_balance(self):
        brand = User.objects.create_user(
            email='brand-wallet@test.com',
            password='testpass123',
            type='brand'
        )
        Profile.objects.filter(user=brand).update(wallet_balance=Decimal('500.00'))

        self.client.force_authenticate(user=brand)
        payload = {
            'name': 'Wallet Guard Campaign',
            'description': 'Budget should be blocked when wallet cannot fund it',
            'category': 'technology',
            'budget': '1500.00',
            'rewardPer1k': '30.00',
            'maxEarnings': '1500.00',
            'platforms': ['YouTube'],
            'resources': [{'name': 'Brief', 'url': 'https://example.com/brief'}],
        }

        response = self.client.post('/api/content/campaigns/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Campaign.objects.filter(creator=brand, name='Wallet Guard Campaign').exists())

    def test_creator_gig_create_requires_wallet_balance(self):
        creator = User.objects.create_user(
            email='creator-wallet@test.com',
            password='testpass123',
            type='creator'
        )
        Profile.objects.filter(user=creator).update(wallet_balance=Decimal('400.00'))

        self.client.force_authenticate(user=creator)
        payload = {
            'name': 'Wallet Guard Gig',
            'description': 'Gig budget should also be blocked when wallet cannot fund it',
            'category': 'technology',
            'budget': '800.00',
            'rewardPer1k': '20.00',
            'maxEarnings': '1500.00',
            'platforms': ['YouTube'],
            'resources': [{'name': 'Brief', 'url': 'https://example.com/brief'}],
        }

        response = self.client.post('/api/content/campaigns/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Campaign.objects.filter(creator=creator, name='Wallet Guard Gig').exists())

    def test_settled_campaign_cannot_be_reopened(self):
        brand = User.objects.create_user(
            email='brand-settled@test.com',
            password='testpass123',
            type='brand'
        )
        Profile.objects.filter(user=brand).update(wallet_balance=Decimal('5000.00'))

        campaign = Campaign.objects.create(
            creator=brand,
            name='Settled Campaign',
            category='technology',
            budget=Decimal('3000.00'),
            reward_per_1k=Decimal('25.00'),
            max_earnings=Decimal('2000.00'),
            platforms=['YouTube'],
            status='closed',
            closure_reason='deadline',
            remaining_funds_settled=True,
            remaining_funds_settled_amount=Decimal('500.00'),
        )

        self.client.force_authenticate(user=brand)
        response = self.client.patch(
            f'/api/content/campaigns/{campaign.id}/',
            {'status': 'active'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        campaign.refresh_from_db()
        self.assertEqual(campaign.status, 'closed')

    def test_settlement_releases_locked_budget_back_into_wallet(self):
        brand = User.objects.create_user(
            email='brand-release@test.com',
            password='testpass123',
            type='brand'
        )
        profile = Profile.objects.get(user=brand)
        profile.wallet_balance = Decimal('10000.00')
        profile.save(update_fields=['wallet_balance'])

        campaign = Campaign.objects.create(
            creator=brand,
            name='Release Budget Campaign',
            category='technology',
            budget=Decimal('3000.00'),
            reward_per_1k=Decimal('20.00'),
            max_earnings=Decimal('2000.00'),
            platforms=['YouTube'],
            status='closed',
            closure_reason='deadline',
            paid_out=Decimal('2000.00'),
            remaining_funds_settled=False,
        )

        self.client.force_authenticate(user=brand)
        response = self.client.post(f'/api/content/campaigns/{campaign.id}/transfer-remaining-funds/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(profile.wallet_balance, Decimal('11000.00'))
        campaign.refresh_from_db()
        self.assertTrue(campaign.remaining_funds_settled)
        self.assertEqual(campaign.remaining_funds_settled_amount, Decimal('1000.00'))

    def test_creator_gig_deadline_settlement_rejects_past_date(self):
        gig = Campaign.objects.create(
            creator=self.creator,
            name='Past Deadline Gig',
            category='technology',
            budget=Decimal('3000.00'),
            reward_per_1k=Decimal('20.00'),
            max_earnings=Decimal('2000.00'),
            platforms=['YouTube'],
            type='gig',
            status='closed',
            closure_reason='manual',
            paid_out=Decimal('1000.00'),
            remaining_funds_settled=False,
        )

        self.client.force_authenticate(user=self.creator)
        response = self.client.post(
            f'/api/content/campaigns/{gig.id}/extend-deadline/',
            {'endDate': (date.today() - timedelta(days=1)).isoformat()},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        gig.refresh_from_db()
        self.assertEqual(gig.status, 'closed')
        self.assertEqual(gig.closure_reason, 'manual')

    def test_creator_gig_deadline_settlement_reactivates_for_future_date(self):
        gig = Campaign.objects.create(
            creator=self.creator,
            name='Future Deadline Gig',
            category='technology',
            budget=Decimal('3000.00'),
            reward_per_1k=Decimal('20.00'),
            max_earnings=Decimal('2000.00'),
            platforms=['YouTube'],
            type='gig',
            status='closed',
            closure_reason='manual',
            paid_out=Decimal('1000.00'),
            remaining_funds_settled=False,
        )
        new_deadline = date.today() + timedelta(days=14)

        self.client.force_authenticate(user=self.creator)
        response = self.client.post(
            f'/api/content/campaigns/{gig.id}/extend-deadline/',
            {'endDate': new_deadline.isoformat()},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        gig.refresh_from_db()
        self.assertEqual(gig.status, 'active')
        self.assertEqual(gig.end_date, new_deadline)
        self.assertEqual(gig.closure_reason, '')

    def test_update_campaign(self):
        self.client.force_authenticate(user=self.creator)
        response = self.client.patch(
            f'/api/content/campaigns/{self.campaign.id}/',
            {'description': 'Updated description', 'status': 'paused'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.description, 'Updated description')
        self.assertEqual(self.campaign.status, 'paused')

    def test_delete_campaign(self):
        self.client.force_authenticate(user=self.creator)
        response = self.client.delete(f'/api/content/campaigns/{self.campaign.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Campaign.objects.filter(id=self.campaign.id).exists())

    def test_creator_cannot_see_other_creator_campaigns(self):
        Campaign.objects.create(
            creator=self.other_creator,
            name='Hidden Campaign',
            category='finance',
            budget=Decimal('1000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('500.00'),
            platforms=['Instagram']
        )
        self.client.force_authenticate(user=self.creator)
        response = self.client.get('/api/content/campaigns/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        if isinstance(data, dict):
            results = data.get('results', [])
        else:
            results = data
        self.assertNotIn('Hidden Campaign', [item['name'] for item in results])

    def test_create_campaign_validates_category(self):
        self.client.force_authenticate(user=self.creator)
        response = self.client.post('/api/content/campaigns/', {'name': 'Bad', 'category': 'invalid', 'budget': '1000.00', 'rewardPer1k': '10.00', 'maxEarnings': '500.00'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AdminCampaignSubmissionDataTests(TestCase):
    """Regression coverage for the real-data admin drill-down pages."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email='admin-submission-data@test.com', password='testpass123'
        )
        owner = User.objects.create_user(
            email='campaign-owner@test.com', password='testpass123', type='brand'
        )
        self.clipper = User.objects.create_user(
            email='real-clipper@test.com', password='testpass123', type='clipper'
        )
        self.clipper.profile.first_name = 'Real'
        self.clipper.profile.last_name = 'Clipper'
        self.clipper.profile.username = 'realclipper'
        self.clipper.profile.save(update_fields=['first_name', 'last_name', 'username'])
        self.campaign = Campaign.objects.create(
            creator=owner,
            name='Real Data Campaign',
            category='technology',
            budget=Decimal('12500.00'),
            reward_per_1k=Decimal('40.00'),
            max_earnings=Decimal('5000.00'),
        )
        participant = CampaignParticipant.objects.create(
            campaign=self.campaign, clipper=self.clipper
        )
        self.submission = CampaignSubmission.objects.create(
            participant=participant,
            platform='youtube',
            platform_username='@realclipper',
            content_url='https://youtube.com/watch?v=real-data',
            views=2400,
        )

    def test_admin_submission_filters_include_campaign_and_clipper_data(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            f'/api/content/campaign-submissions/?campaign_id={self.campaign.id}&clipper=realclipper'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        item = response.data[0]
        self.assertEqual(item['id'], self.submission.id)
        self.assertEqual(item['campaignTitle'], 'Real Data Campaign')
        self.assertEqual(item['campaignCategory'], 'technology')
        self.assertEqual(item['campaignBudget'], '12500.00')
        self.assertEqual(item['campaignRewardPer1k'], '40.00')
        self.assertEqual(item['clipperName'], 'Real Clipper')
        self.assertEqual(item['clipperUsername'], 'realclipper')


class AdminScraperTests(TestCase):
    def test_admin_scraper_processes_eligible_submissions_in_chunks(self):
        admin = User.objects.create_superuser(
            email='scraper-admin@test.com',
            password='testpass123',
        )
        creator = User.objects.create_user(
            email='scraper-creator@test.com',
            password='testpass123',
            type='brand',
        )
        clipper = User.objects.create_user(
            email='scraper-clipper@test.com',
            password='testpass123',
            type='clipper',
        )
        campaign = Campaign.objects.create(
            creator=creator,
            name='Scraper Campaign',
            category='technology',
            budget=Decimal('5000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('5000.00'),
            status='active',
        )
        participant = CampaignParticipant.objects.create(campaign=campaign, clipper=clipper)
        eligible = [
            CampaignSubmission.objects.create(
                participant=participant,
                platform='instagram',
                content_url=f'https://www.instagram.com/p/scraper-{index}/',
                status='pending' if index % 2 else 'approved',
            )
            for index in range(21)
        ]
        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            content_url='https://www.instagram.com/p/rejected/',
            status='rejected',
        )
        CampaignSubmission.objects.create(
            participant=participant,
            platform='instagram',
            content_url='https://www.instagram.com/p/deleted/',
            status='pending',
            is_deleted=True,
        )

        class FakeEngine:
            def __init__(self):
                self.calls = []

            def get_metrics_report(self, urls):
                self.calls.append(urls)
                return [
                    {'url': url, 'views': 100 + index, 'likes': 10 + index}
                    for index, url in enumerate(urls)
                ]

        fake_engine = FakeEngine()
        self.client = APIClient()
        self.client.force_authenticate(user=admin)
        with patch('content.scraper_service._load_engine', return_value=fake_engine):
            response = self.client.post('/api/content/campaigns/admin-scrape-insights/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['eligible'], 21)
        self.assertEqual(response.data['processed'], 21)
        self.assertEqual(response.data['updated'], 21)
        self.assertEqual(len(fake_engine.calls), 2)
        self.assertEqual([len(call) for call in fake_engine.calls], [20, 1])
        eligible[0].refresh_from_db()
        self.assertEqual(eligible[0].views, 100)
        self.assertEqual(eligible[0].likes, 10)

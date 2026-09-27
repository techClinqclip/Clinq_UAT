from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile
from content.models import Campaign, CampaignParticipant, CampaignSubmission
from earnings.models import Transaction
from settings.models import PlatformPayoutSettings


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
        self.assertIn('earnings_by_period', response.data)
        self.assertIn('spend_by_period', response.data)
        for key in ('7D', '30D', '3M', '6M', 'ALL'):
            self.assertIn(key, response.data['earnings_by_period'])
            self.assertIn(key, response.data['spend_by_period'])
            self.assertTrue(len(response.data['earnings_by_period'][key]) > 0)
            self.assertTrue(len(response.data['spend_by_period'][key]) > 0)
        self.assertTrue(len(response.data['earnings_monthly']) > 0)
        self.assertTrue(len(response.data['spend_monthly']) > 0)


class WalletTopUpTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.brand = get_user_model().objects.create_user(
            email='brand-topup@example.com',
            password='testpass123',
            type='brand',
        )
        Profile.objects.get_or_create(user=self.brand)
        self.client.force_authenticate(self.brand)

    def test_create_topup_requires_razorpay_config(self):
        with self.settings(RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET=''):
            response = self.client.post('/api/earnings/wallet/create-topup/', {'amount': '1000.00'}, format='json')

        self.assertEqual(response.status_code, 503)
        self.assertIn('Razorpay', response.data['error'])

    def test_create_topup_rejects_amount_below_minimum(self):
        with self.settings(RAZORPAY_KEY_ID='rzp_test_real', RAZORPAY_KEY_SECRET='secret_real'):
            response = self.client.post('/api/earnings/wallet/create-topup/', {'amount': '100.00'}, format='json')

        self.assertEqual(response.status_code, 400)

    @patch('earnings.payments.get_razorpay_client')
    def test_create_and_confirm_topup_credits_wallet(self, mock_get_client):
        from unittest.mock import MagicMock

        fake_client = MagicMock()
        fake_client.order.create.return_value = {
            'id': 'order_test_123',
            'amount': 100000,
            'currency': 'INR',
        }
        fake_client.utility.verify_payment_signature.return_value = True
        mock_get_client.return_value = (fake_client, 'rzp_test_real')

        with self.settings(RAZORPAY_KEY_ID='rzp_test_real', RAZORPAY_KEY_SECRET='secret_real'):
            create_response = self.client.post(
                '/api/earnings/wallet/create-topup/',
                {'amount': '1000.00'},
                format='json',
            )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data['orderId'], 'order_test_123')
        self.assertEqual(create_response.data['amount'], 1000.0)

        from earnings.models import Transaction
        deposit = Transaction.objects.get(id=create_response.data['transactionId'])
        self.assertEqual(deposit.status, 'pending')
        self.assertEqual(deposit.transaction_type, 'deposit')

        with self.settings(RAZORPAY_KEY_ID='rzp_test_real', RAZORPAY_KEY_SECRET='secret_real'):
            confirm_response = self.client.post(
                '/api/earnings/wallet/confirm-topup/',
                {
                    'razorpayOrderId': 'order_test_123',
                    'razorpayPaymentId': 'pay_test_123',
                    'razorpaySignature': 'sig_test_123',
                },
                format='json',
            )

        self.assertEqual(confirm_response.status_code, 200)
        self.assertEqual(confirm_response.data['walletBalance'], 1000.0)
        self.assertEqual(confirm_response.data['totalDeposited'], 1000.0)

        deposit.refresh_from_db()
        self.assertEqual(deposit.status, 'completed')
        profile = Profile.objects.get(user=self.brand)
        self.assertEqual(profile.wallet_balance, Decimal('1000.00'))
        self.assertEqual(profile.total_deposited, Decimal('1000.00'))

        # Idempotent confirm should not double-credit
        with self.settings(RAZORPAY_KEY_ID='rzp_test_real', RAZORPAY_KEY_SECRET='secret_real'):
            again = self.client.post(
                '/api/earnings/wallet/confirm-topup/',
                {
                    'razorpayOrderId': 'order_test_123',
                    'razorpayPaymentId': 'pay_test_123',
                    'razorpaySignature': 'sig_test_123',
                },
                format='json',
            )
        self.assertEqual(again.status_code, 200)
        profile.refresh_from_db()
        self.assertEqual(profile.wallet_balance, Decimal('1000.00'))

    @patch('earnings.payments.get_razorpay_client')
    def test_sync_topups_credits_paid_pending_deposit(self, mock_get_client):
        from unittest.mock import MagicMock
        from earnings.models import Transaction

        deposit = Transaction.objects.create(
            user=self.brand,
            amount=Decimal('1500.00'),
            transaction_type='deposit',
            status='pending',
            payment_method='razorpay',
            payment_details='Money added to wallet',
            external_ref='order_pending_456',
        )

        fake_client = MagicMock()
        fake_client.order.fetch.return_value = {'id': 'order_pending_456', 'status': 'paid'}
        fake_client.order.payments.return_value = {
            'items': [{'id': 'pay_pending_456', 'status': 'captured'}],
        }
        mock_get_client.return_value = (fake_client, 'rzp_test_real')

        with self.settings(RAZORPAY_KEY_ID='rzp_test_real', RAZORPAY_KEY_SECRET='secret_real'):
            response = self.client.post('/api/earnings/wallet/sync-topups/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['creditedCount'], 1)
        self.assertEqual(response.data['walletBalance'], 1500.0)

        deposit.refresh_from_db()
        self.assertEqual(deposit.status, 'completed')
        profile = Profile.objects.get(user=self.brand)
        self.assertEqual(profile.wallet_balance, Decimal('1500.00'))


class WithdrawalRequestTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email='withdraw@example.com',
            password='testpass123',
            type='clipper',
        )
        self.profile, _ = Profile.objects.get_or_create(user=self.user)
        self.profile.payment_method = 'upi'
        self.profile.upi_id = 'clipper@upi'
        self.profile.total_earnings = Decimal('5000.00')
        self.profile.save()

        self.creator = get_user_model().objects.create_user(
            email='withdraw-creator@example.com',
            password='testpass123',
            type='creator',
        )
        campaign = Campaign.objects.create(
            creator=self.creator,
            name='Payout Campaign',
            brand_name='Test Brand',
            category='technology',
            budget=Decimal('10000.00'),
            reward_per_1k=Decimal('10.00'),
            max_earnings=Decimal('10000.00'),
            status='active',
        )
        participant = CampaignParticipant.objects.create(
            campaign=campaign,
            clipper=self.user,
            status='submitted',
        )
        submission = CampaignSubmission(
            participant=participant,
            platform='instagram',
            platform_username='clipper',
            content_url='https://example.com/post-withdraw',
            earning=Decimal('5000.00'),
            pending_earning=Decimal('0.00'),
            views=50000,
            status='approved',
        )
        submission.save(skip_earning_update=True)
        self.client.force_authenticate(self.user)

    @patch('notifications.helpers.notify_user_event')
    def test_request_payout_creates_pending_withdrawal(self, _notify):
        response = self.client.post(
            '/api/earnings/payout/request-payout/',
            {
                'amount': '2500.00',
                'payoutMethod': 'upi',
                'upiId': 'clipper@upi',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['amount'], 2500.0)
        self.assertEqual(response.data['remaining_balance'], 2500.0)

        overview = self.client.get('/api/earnings/overview/')
        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.data['available_balance'], 2500.0)
        self.assertEqual(overview.data['total_withdrawals'], 2500.0)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.total_withdrawn, Decimal('2500.00'))

    @patch('notifications.helpers.notify_user_event')
    def test_request_payout_accepts_bank_alias(self, _notify):
        self.profile.payment_method = 'bank'
        self.profile.bank_account_holder = 'Clipper User'
        self.profile.bank_account_number = '1234567890'
        self.profile.bank_ifsc = 'SBIN0001234'
        self.profile.bank_name = 'SBI'
        self.profile.save()

        response = self.client.post(
            '/api/earnings/payout/request-payout/',
            {
                'amount': '2500.00',
                'payoutMethod': 'bank',
                'bankAccountHolder': 'Clipper User',
                'bankAccountNumber': '1234567890',
                'bankIfsc': 'SBIN0001234',
                'bankName': 'SBI',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['remaining_balance'], 2500.0)

    @patch('notifications.helpers.notify_user_event')
    def test_request_payout_rejects_over_available(self, _notify):
        response = self.client.post(
            '/api/earnings/payout/request-payout/',
            {
                'amount': '6000.00',
                'payoutMethod': 'upi',
                'upiId': 'clipper@upi',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('Insufficient', response.data['error'])

    @patch('earnings.views.create_razorpay_withdrawal_payout')
    @patch('notifications.helpers.notify_user_event')
    def test_request_payout_autopays_when_razorpay_full_auto(self, _notify, mock_payout):
        PlatformPayoutSettings.objects.update_or_create(
            pk=1,
            defaults={'manual_pay': False, 'require_payout_approval': False},
        )
        mock_payout.return_value = {
            'transactionId': 1,
            'amount': 2500.0,
            'status': 'pending',
            'payoutId': 'pout_test',
            'razorpayStatus': 'processing',
        }

        response = self.client.post(
            '/api/earnings/payout/request-payout/',
            {
                'amount': '2500.00',
                'payoutMethod': 'upi',
                'upiId': 'clipper@upi',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['mode'], 'razorpay_autopay')
        self.assertFalse(response.data['requiresApproval'])
        self.assertTrue(response.data['autopayTriggered'])
        mock_payout.assert_called_once()

    @patch('earnings.views.create_razorpay_withdrawal_payout')
    @patch('notifications.helpers.notify_user_event')
    def test_request_payout_waits_for_admin_when_razorpay_with_approval(self, _notify, mock_payout):
        PlatformPayoutSettings.objects.update_or_create(
            pk=1,
            defaults={'manual_pay': False, 'require_payout_approval': True},
        )

        response = self.client.post(
            '/api/earnings/payout/request-payout/',
            {
                'amount': '2500.00',
                'payoutMethod': 'upi',
                'upiId': 'clipper@upi',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['mode'], 'razorpay_with_approval')
        self.assertTrue(response.data['requiresApproval'])
        self.assertFalse(response.data['autopayTriggered'])
        self.assertEqual(response.data['transactionStatus'], 'pending')
        mock_payout.assert_not_called()

    @patch('earnings.views.create_razorpay_withdrawal_payout')
    @patch('notifications.helpers.notify_user_event')
    def test_request_payout_stays_manual_when_manual_pay_enabled(self, _notify, mock_payout):
        PlatformPayoutSettings.objects.update_or_create(
            pk=1,
            defaults={'manual_pay': True, 'require_payout_approval': False},
        )

        response = self.client.post(
            '/api/earnings/payout/request-payout/',
            {
                'amount': '2500.00',
                'payoutMethod': 'upi',
                'upiId': 'clipper@upi',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['mode'], 'manual')
        self.assertTrue(response.data['manualPay'])
        self.assertFalse(response.data['autopayTriggered'])
        mock_payout.assert_not_called()


class AdminPayoutApprovalTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = get_user_model().objects.create_superuser(
            email='payout-admin@example.com',
            password='testpass123',
        )
        self.clipper = get_user_model().objects.create_user(
            email='payout-user@example.com',
            password='testpass123',
            type='clipper',
        )
        Profile.objects.get_or_create(user=self.clipper)
        self.txn = Transaction.objects.create(
            user=self.clipper,
            amount=Decimal('2500.00'),
            transaction_type='withdrawal',
            payment_method='upi',
            payment_details='user@upi',
            status='pending',
            external_ref='user@upi',
            bot_notes='{"destination":{"payout_method":"upi","upi_id":"user@upi"}}',
        )
        self.client.force_authenticate(self.admin)

    def test_admin_can_toggle_manual_and_approval_settings(self):
        response = self.client.patch(
            '/api/settings/payout-approval/',
            {'manualPay': False, 'requirePayoutApproval': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['manualPay'])
        self.assertTrue(response.data['requirePayoutApproval'])
        self.assertEqual(response.data['mode'], 'razorpay_with_approval')

        config = PlatformPayoutSettings.get_solo()
        self.assertFalse(config.manual_pay)
        self.assertTrue(config.require_payout_approval)

    @patch('earnings.views.create_razorpay_withdrawal_payout')
    @patch('notifications.helpers.notify_user_event')
    def test_admin_approve_triggers_razorpay_when_not_manual(self, _notify, mock_payout):
        PlatformPayoutSettings.objects.update_or_create(
            pk=1,
            defaults={'manual_pay': False, 'require_payout_approval': True},
        )
        mock_payout.return_value = {
            'transactionId': self.txn.id,
            'amount': 2500.0,
            'status': 'pending',
            'payoutId': 'pout_123',
            'razorpayStatus': 'processing',
        }
        response = self.client.post(
            '/api/earnings/payout/admin-approve/',
            {'transactionId': self.txn.id},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        mock_payout.assert_called_once()

    @patch('earnings.views.create_razorpay_withdrawal_payout')
    @patch('notifications.helpers.notify_user_event')
    def test_admin_mark_paid_manually_when_manual_mode(self, _notify, mock_payout):
        PlatformPayoutSettings.objects.update_or_create(
            pk=1,
            defaults={'manual_pay': True},
        )
        response = self.client.post(
            '/api/earnings/payout/admin-approve/',
            {
                'transactionId': self.txn.id,
                'paymentReference': 'UTR123456',
                'notes': 'Paid via bank',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['mode'], 'manual')
        mock_payout.assert_not_called()
        self.txn.refresh_from_db()
        self.assertEqual(self.txn.status, 'completed')
        self.assertEqual(self.txn.external_ref, 'UTR123456')
        self.assertIn('UTR123456', self.txn.payment_details)

    @patch('notifications.helpers.notify_user_event')
    def test_admin_manual_pay_requires_payment_reference(self, _notify):
        PlatformPayoutSettings.objects.update_or_create(
            pk=1,
            defaults={'manual_pay': True},
        )
        response = self.client.post(
            '/api/earnings/payout/admin-approve/',
            {'transactionId': self.txn.id, 'notes': 'Missing UTR'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('reference', response.data['error'].lower())

    @patch('notifications.helpers.notify_user_event')
    def test_admin_reject_restores_balance(self, _notify):
        profile = Profile.objects.get(user=self.clipper)
        profile.total_earnings = Decimal('0.00')
        profile.total_withdrawn = Decimal('2500.00')
        profile.save(update_fields=['total_earnings', 'total_withdrawn'])

        response = self.client.post(
            '/api/earnings/payout/admin-reject/',
            {'transactionId': self.txn.id, 'reason': 'Invalid UPI'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.txn.refresh_from_db()
        profile.refresh_from_db()
        self.assertEqual(self.txn.status, 'rejected')
        self.assertEqual(profile.total_earnings, Decimal('2500.00'))
        self.assertEqual(profile.total_withdrawn, Decimal('0.00'))

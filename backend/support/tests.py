from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from notifications.models import UserNotification

User = get_user_model()


class SupportTicketAPITest(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			email='creator@example.com',
			password='StrongPass123!',
			type='creator',
		)
		self.admin = User.objects.create_user(
			email='admin@example.com',
			password='StrongPass123!',
			type='brand',
			is_staff=True,
			is_superuser=True,
		)

	def test_user_can_create_and_list_own_tickets(self):
		client = APIClient()
		client.force_authenticate(self.user)

		payload = {
			'subject': 'Payout issue',
			'description': 'My payout has not arrived',
			'category': 'billing',
			'priority': 'high',
		}

		create_response = client.post('/api/support/tickets/', payload, format='json')
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(create_response.data['user_email'], self.user.email)
		self.assertTrue(UserNotification.objects.filter(
			user=self.admin,
			event__event_type='support.ticket_created',
		).exists())

		list_response = client.get('/api/support/tickets/')
		self.assertEqual(list_response.status_code, status.HTTP_200_OK)
		self.assertEqual(list_response.data['count'], 1)
		self.assertEqual(list_response.data['results'][0]['subject'], 'Payout issue')

	def test_admin_can_list_all_tickets(self):
		client = APIClient()
		client.force_authenticate(self.user)
		client.post(
			'/api/support/tickets/',
			{
				'subject': 'Payout issue',
				'description': 'My payout has not arrived',
				'category': 'billing',
				'priority': 'high',
			},
			format='json',
		)

		client.force_authenticate(self.admin)
		response = client.get('/api/support/tickets/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertGreaterEqual(response.data['count'], 1)
		self.assertTrue(any(ticket['user_email'] == self.user.email for ticket in response.data['results']))

	def test_user_cannot_change_admin_ticket_fields(self):
		client = APIClient()
		client.force_authenticate(self.user)
		ticket = client.post(
			'/api/support/tickets/',
			{
				'subject': 'Payout issue',
				'description': 'My payout has not arrived',
				'category': 'billing',
				'priority': 'high',
			},
			format='json',
		).data

		response = client.patch(
			f"/api/support/tickets/{ticket['id']}/",
			{'status': 'resolved', 'admin_response': 'Approved'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

	def test_admin_reply_and_status_are_visible_to_ticket_owner(self):
		client = APIClient()
		client.force_authenticate(self.user)
		created = client.post(
			'/api/support/tickets/',
			{
				'subject': 'Account question',
				'description': 'Please help with my account',
				'category': 'account',
				'priority': 'medium',
			},
			format='json',
		).data

		client.force_authenticate(self.admin)
		updated = client.patch(
			f"/api/support/tickets/{created['id']}/",
			{'status': 'resolved', 'admin_response': 'Your account has been updated.'},
			format='json',
		)

		self.assertEqual(updated.status_code, status.HTTP_200_OK)
		self.assertEqual(updated.data['status'], 'resolved')
		self.assertEqual(updated.data['admin_response'], 'Your account has been updated.')
		self.assertEqual(updated.data['resolved_by_email'], self.admin.email)
		self.assertIsNotNone(updated.data['resolved_at'])

		client.force_authenticate(self.user)
		refreshed = client.get('/api/support/tickets/')
		ticket = next(item for item in refreshed.data['results'] if item['id'] == created['id'])
		self.assertEqual(ticket['status'], 'resolved')
		self.assertEqual(ticket['admin_response'], 'Your account has been updated.')

	def test_user_reply_is_visible_to_admin(self):
		client = APIClient()
		client.force_authenticate(self.user)
		created = client.post(
			'/api/support/tickets/',
			{
				'subject': 'Follow-up question',
				'description': 'I need support',
				'category': 'technical',
				'priority': 'low',
			},
			format='json',
		).data

		response = client.post(
			f"/api/support/tickets/{created['id']}/messages/",
			{'body': 'Here is more information about the issue.'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		client.force_authenticate(self.admin)
		admin_ticket = client.get(f"/api/support/tickets/{created['id']}/").data
		self.assertTrue(any(
			message['body'] == 'Here is more information about the issue.'
			for message in admin_ticket['messages']
		))

	def test_admin_reply_creates_user_notification(self):
		client = APIClient()
		client.force_authenticate(self.user)
		created = client.post(
			'/api/support/tickets/',
			{
				'subject': 'Notification question',
				'description': 'Please respond to this ticket',
				'category': 'other',
				'priority': 'low',
			},
			format='json',
		).data

		client.force_authenticate(self.admin)
		response = client.post(
			f"/api/support/tickets/{created['id']}/messages/",
			{'body': 'Support has responded.'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertTrue(UserNotification.objects.filter(
			user=self.user,
			event__event_type='support.ticket_response',
		).exists())

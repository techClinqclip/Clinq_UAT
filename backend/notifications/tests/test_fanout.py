from django.test import TestCase
from notifications.domain.events import NotificationEvent
from notifications.services.emitter import NotificationEmitter
from notifications.models.user_notification import UserNotification
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

class FanoutTest(TestCase):

    def test_empty_notification_inbox_returns_success(self):
        user = get_user_model().objects.create_user(
            email='empty-notifications@example.com',
            password='StrongPass123!',
            type='creator',
        )
        client = APIClient()
        client.force_authenticate(user)

        response = client.get('/api/notifications/notifications/?page_size=50')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['results'], [])

    def test_fanout_creates_per_user(self):
        event = NotificationEvent(
            event_type="system",
            actor_id=None,
            entity_type="system",
            entity_id=None,
            payload={},
            idempotency_key="fanout1",
        )

        NotificationEmitter.emit(event, ["1", "2", "3"])
        self.assertEqual(UserNotification.objects.count(), 3)

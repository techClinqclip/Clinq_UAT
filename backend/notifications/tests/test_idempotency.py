from django.test import TestCase
from notifications.domain.events import NotificationEvent
from notifications.services.emitter import NotificationEmitter

class IdempotencyTest(TestCase):

    def test_duplicate_event_creates_once(self):
        event = NotificationEvent(
            event_type="system",
            actor_id=None,
            entity_type="system",
            entity_id=None,
            payload={"msg": "hello"},
            idempotency_key="abc123",
        )

        NotificationEmitter.emit(event, ["1"])
        NotificationEmitter.emit(event, ["1"])

        from notifications.models import NotificationEvent as M
        self.assertEqual(M.objects.count(), 1)

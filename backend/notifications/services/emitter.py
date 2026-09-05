from django.db import transaction
from notifications.domain.events import NotificationEvent
from notifications.models import NotificationEvent as EventModel
from notifications.tasks.fanout import fanout_sync

class NotificationEmitter:

    @staticmethod
    def emit(event: NotificationEvent, recipients: list[str]):
        with transaction.atomic():
            obj, created = EventModel.objects.get_or_create(
                idempotency_key=event.idempotency_key,
                defaults={
                    "event_type": event.event_type,
                    "actor_id": event.actor_id,
                    "entity_type": event.entity_type,
                    "entity_id": event.entity_id,
                    "payload": event.payload,
                }
            )

        fanout_sync(obj.id, recipients)
        return obj

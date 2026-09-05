from dataclasses import dataclass
from typing import Optional
from uuid import UUID

@dataclass(frozen=True)
class NotificationEvent:
    event_type: str
    actor_id: Optional[UUID]
    entity_type: str
    entity_id: Optional[UUID]
    payload: dict
    idempotency_key: str

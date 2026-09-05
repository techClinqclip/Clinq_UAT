from django.test import TestCase
from django.utils.timezone import now
from datetime import timedelta
from notifications.models import UserNotification
from notifications.tasks.cleanup import archive_old_notifications

class RetentionTest(TestCase):

    def test_archive(self):
        n = UserNotification.objects.create(
            user_id="1",
            event_id=None,
            created_at=now() - timedelta(days=31),
        )
        archive_old_notifications()
        n.refresh_from_db()
        self.assertTrue(n.is_archived)

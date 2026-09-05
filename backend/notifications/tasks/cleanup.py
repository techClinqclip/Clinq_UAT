from datetime import timedelta
from django.utils.timezone import now
from notifications.constants import ARCHIVE_AFTER_DAYS, DELETE_AFTER_DAYS
from notifications.models import UserNotification

def archive_old_notifications():
    UserNotification.objects.filter(
        created_at__lt=now() - timedelta(days=ARCHIVE_AFTER_DAYS),
        is_archived=False,
    ).update(is_archived=True)

def delete_old_notifications():
    UserNotification.objects.filter(
        created_at__lt=now() - timedelta(days=DELETE_AFTER_DAYS),
        is_archived=True,
    ).delete()

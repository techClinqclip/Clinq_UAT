from notifications.models.user_notification import UserNotification

def fanout_sync(event_id, recipients):
    for user_id in recipients:
        UserNotification.objects.get_or_create(
            user_id=user_id,
            event_id=event_id,
        )

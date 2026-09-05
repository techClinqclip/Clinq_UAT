from enum import Enum

class NotificationEventType(str, Enum):
    SYSTEM = "system"
    CONTENT = "content"
    COURSE = "course"
    ADMIN = "admin"

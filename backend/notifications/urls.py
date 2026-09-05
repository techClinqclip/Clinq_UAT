"""
Notification URL Configuration.

Routes for notification API endpoints:
- /notifications/ - User notification inbox
- /preferences/ - User notification preferences
- /broadcasts/ - Admin broadcast management

Design:
- Uses DRF Router for automatic URL generation
- Separate routes for each ViewSet
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    NotificationViewSet,
    NotificationPreferenceViewSet,
    BroadcastNotificationViewSet,
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'preferences', NotificationPreferenceViewSet, basename='preference')
router.register(r'broadcasts', BroadcastNotificationViewSet, basename='broadcast')

urlpatterns = [
    path('', include(router.urls)),
]


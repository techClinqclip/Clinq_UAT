from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'discussions', views.DiscussionViewSet, basename='discussion')
router.register(r'replies', views.DiscussionReplyViewSet, basename='reply')
router.register(r'events', views.CommunityEventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CreatorDashboardViewSet, CreatorGigViewSet, CreatorSubmissionViewSet, CreatorAnalyticsViewSet

router = DefaultRouter()
router.register(r'gigs', CreatorGigViewSet, basename='creator-gigs')
router.register(r'submissions', CreatorSubmissionViewSet, basename='creator-submissions')
router.register(r'analytics', CreatorAnalyticsViewSet, basename='creator-analytics')

urlpatterns = [
    path('dashboard/', CreatorDashboardViewSet.as_view({'get': 'dashboard'}), name='creator-dashboard'),
    path('', include(router.urls)),
]

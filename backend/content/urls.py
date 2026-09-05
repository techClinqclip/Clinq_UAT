from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router =  DefaultRouter()
router.register(r'marketplace', views.ContentViewSet, basename='content')
router.register(r'campaigns', views.CampaignViewSet, basename='campaign')
router.register(r'bids', views.BidViewSet, basename='bid')
router.register(r'submissions', views.SubmissionViewSet, basename='submission')
router.register(r'clipper-submissions', views.ClipperSubmissionsViewSet, basename='clipper-submissions')
router.register(r'campaign-submissions', views.CampaignSubmissionViewSet, basename='campaign-submission')

urlpatterns = [
    path('', include(router.urls))
]
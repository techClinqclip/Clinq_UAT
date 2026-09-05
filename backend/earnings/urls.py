from django.urls import path, include
from . import views
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'payout', views.PayoutViewSet, basename='payout')
router.register(r'', views.EarningsViewSet, basename='earnings')

urlpatterns = [
    path('', include(router.urls)),
]
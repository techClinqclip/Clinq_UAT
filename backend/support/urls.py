from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tickets', views.SupportTicketViewSet, basename='ticket')
router.register(r'faqs', views.FAQViewSet, basename='faq')

urlpatterns = [
    path('', include(router.urls)),
]

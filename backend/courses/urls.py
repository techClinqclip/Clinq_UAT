from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, LearningPathViewSet

router = DefaultRouter()
router.register(r'list',CourseViewSet, basename='course')
router.register(r'paths', LearningPathViewSet, basename='learning-path')

urlpatterns = [
    path('', include(router.urls)),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.SettingsViewSet, basename='settings')

urlpatterns = [
    path('resource-template/download/', views.ResourceSampleTemplateDownloadView.as_view(), name='resource-sample-template-download'),
    path('resource-template/', views.ResourceSampleTemplateView.as_view(), name='resource-sample-template'),
    path(
        'legal-documents/<str:document_key>/download/',
        views.LegalDocumentDownloadView.as_view(),
        name='legal-document-download',
    ),
    path(
        'legal-documents/<str:document_key>/',
        views.LegalDocumentView.as_view(),
        name='legal-document',
    ),
    path('', include(router.urls)),
]

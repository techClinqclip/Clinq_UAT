from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
# for automated API docs
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


urlpatterns = [
    path('admin/', admin.site.urls),
    # path("api/", include('api.urls')), # General Purpose APIs
    path("api/auth/", include('accounts.urls')), # Authentication APIs

    # SimpleJWT url routes
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"), 
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # including various application urls. 
    path('api/courses/', include('courses.urls')), # DONE

    path('api/community/', include('community.urls')),

    path('api/content/', include('content.urls')),

    path('api/earnings/', include('earnings.urls')),

    path('api/leaderboard/', include('leaderboard.urls')),

    path('api/notifications/', include('notifications.urls')),

    path('api/referral/', include('referral.urls')),

    path('api/settings/', include('settings.urls')),
    
    path('api/support/', include('support.urls')),
    path('api/creator/', include('creator.urls')),

    # for Automated API docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/',SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui')
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__', include(debug_toolbar.urls))
    ] + urlpatterns
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
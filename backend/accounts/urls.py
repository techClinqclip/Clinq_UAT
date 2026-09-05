from django.urls import path, include

from rest_framework.routers import DefaultRouter
from . import views
router = DefaultRouter()
router.register(r'profile', views.ProfileViewSet, basename='profile')
urlpatterns = [
    path('', include(router.urls)),
    path('register/', views.RegisterView.as_view(), name="signup"),
    path('login/', views.LoginView.as_view(), name='login'),
    path('status/', views.AuthStatusView.as_view(), name='auth-status'),
    path('google/', views.SocialLoginView.as_view(), name='google-auth'),
    path('public-config/', views.PublicFrontendConfigView.as_view(), name='public-config'),
    path('otp/send/', __import__('accounts.otp_views', fromlist=['SendOTPView']).SendOTPView.as_view(), name='otp-send'),
    path('otp/verify/', __import__('accounts.otp_views', fromlist=['VerifyOTPView']).VerifyOTPView.as_view(), name='otp-verify'),
    path('check-username/', views.CheckUsernameView.as_view(), name='check-username'),
    path('password/forgot/', views.ForgotPasswordView.as_view(), name='password-forgot'),
    path('password/reset/', views.ResetPasswordView.as_view(), name='password-reset'),
]


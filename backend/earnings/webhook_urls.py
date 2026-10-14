from django.urls import path

from .webhooks import razorpay_webhook

urlpatterns = [
    path('', razorpay_webhook, name='razorpay-webhook'),
]

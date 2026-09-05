import json
import hmac
import hashlib
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Content

@csrf_exempt
def razorpay_webhook(request):
    # Verify the signature from Razorpay
    webhook_secret = "your_webhook_secret_here" # Get this from Razorpay Dashboard
    payload = request.body
    received_sig = request.headers.get('X-Razorpay-Signature')

    expected_sig = hmac.new(
        webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if expected_sig != received_sig:
        return HttpResponse(status=400)

    data = json.loads(payload)
    
    # If payment is successful, unlock the content
    if data['event'] == 'payment.captured':
        order_id = data['payload']['payment']['entity']['order_id']
        content = Content.objects.filter(razorpay_order_id=order_id).first()
        if content:
            content.status = 'available'
            content.save()

    return HttpResponse(status=200)
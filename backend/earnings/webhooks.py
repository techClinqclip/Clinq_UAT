"""Razorpay webhook for wallet top-ups (and future payment events)."""

from __future__ import annotations

import json
import logging

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .payments import credit_wallet_from_razorpay_order, verify_webhook_signature

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def razorpay_webhook(request):
    signature = request.headers.get('X-Razorpay-Signature', '')
    body = request.body or b''

    if not verify_webhook_signature(body=body, signature=signature):
        return HttpResponse(status=400)

    try:
        payload = json.loads(body.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return HttpResponse(status=400)

    event = payload.get('event')
    if event not in {'payment.captured', 'order.paid'}:
        return HttpResponse(status=200)

    entity = (
        payload.get('payload', {}).get('payment', {}).get('entity')
        or payload.get('payload', {}).get('order', {}).get('entity')
        or {}
    )
    order_id = entity.get('order_id') or entity.get('id')
    payment_id = entity.get('id') if event == 'payment.captured' else ''

    try:
        credit_wallet_from_razorpay_order(order_id=order_id, payment_id=payment_id or '')
    except Exception:
        logger.exception('Failed to credit wallet from Razorpay webhook for order %s', order_id)
        return HttpResponse(status=500)

    return HttpResponse(status=200)

"""Razorpay webhook for wallet top-ups and RazorpayX payouts."""

from __future__ import annotations

import json
import logging

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .payments import (
    apply_razorpay_payout_webhook,
    credit_wallet_from_razorpay_order,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)

TOPUP_EVENTS = {'payment.captured', 'order.paid'}
PAYOUT_EVENTS = {
    'payout.processed',
    'payout.updated',
    'payout.rejected',
    'payout.failed',
    'payout.reversed',
}


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
    if event in TOPUP_EVENTS:
        return _handle_topup_event(event, payload)
    if event in PAYOUT_EVENTS:
        return _handle_payout_event(event, payload)

    return HttpResponse(status=200)


def _handle_topup_event(event, payload):
    payment_entity = payload.get('payload', {}).get('payment', {}).get('entity') or {}
    order_entity = payload.get('payload', {}).get('order', {}).get('entity') or {}

    if event == 'payment.captured':
        order_id = payment_entity.get('order_id') or ''
        payment_id = payment_entity.get('id') or ''
    else:
        order_id = order_entity.get('id') or payment_entity.get('order_id') or ''
        payment_id = payment_entity.get('id') or ''

    if not order_id:
        logger.warning('Razorpay webhook %s missing order id', event)
        return HttpResponse(status=200)

    try:
        result = credit_wallet_from_razorpay_order(order_id=order_id, payment_id=payment_id or '')
        if result:
            logger.info('Webhook credited order=%s payment=%s', order_id, payment_id)
        else:
            logger.info('Webhook ignored order=%s (no matching pending deposit)', order_id)
    except Exception:
        logger.exception('Failed to credit wallet from Razorpay webhook for order %s', order_id)
        return HttpResponse(status=500)

    return HttpResponse(status=200)


def _handle_payout_event(event, payload):
    payout_entity = payload.get('payload', {}).get('payout', {}).get('entity') or {}
    payout_id = payout_entity.get('id') or ''
    payout_status = payout_entity.get('status') or event.split('.')[-1]
    failure_reason = (
        payout_entity.get('failure_reason')
        or payout_entity.get('status_details', {}).get('description')
        or ''
    )
    try:
        txn = apply_razorpay_payout_webhook(
            payout_id=payout_id,
            payout_status=payout_status,
            failure_reason=failure_reason,
        )
        if txn:
            logger.info(
                'Webhook payout=%s status=%s txn=%s',
                payout_id,
                payout_status,
                txn.id,
            )
        else:
            logger.info('Webhook ignored payout=%s (no matching withdrawal)', payout_id)
    except Exception:
        logger.exception('Failed to apply Razorpay payout webhook for %s', payout_id)
        return HttpResponse(status=500)
    return HttpResponse(status=200)

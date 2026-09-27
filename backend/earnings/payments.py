"""Reusable wallet top-up helpers (Razorpay).

Used by Brand and Creator campaign wallets. Keep gateway-specific details here
so views stay thin and other dashboards can call the same functions later.
"""

from __future__ import annotations

import logging
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction as db_transaction
from django.db.models import F

from accounts.models import Profile
from .models import Transaction

logger = logging.getLogger(__name__)

MIN_TOPUP_AMOUNT = Decimal('500.00')
MAX_TOPUP_AMOUNT = Decimal('500000.00')
WALLET_TOPUP_ROLES = {'brand', 'creator'}


class PaymentConfigError(Exception):
    """Raised when Razorpay credentials are missing or invalid."""


class PaymentValidationError(Exception):
    """Raised when the requested top-up amount/role is invalid."""


class PaymentGatewayError(Exception):
    """Raised when the payment provider rejects or fails a request."""


def get_razorpay_credentials():
    key_id = (getattr(settings, 'RAZORPAY_KEY_ID', None) or '').strip()
    key_secret = (getattr(settings, 'RAZORPAY_KEY_SECRET', None) or '').strip()
    if not key_id or not key_secret:
        raise PaymentConfigError(
            'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
        )
    if 'xxxxxxxxx' in key_id.lower() or key_secret.upper() == 'XXXXXXXXXXXXX':
        raise PaymentConfigError(
            'Replace placeholder Razorpay keys with real test/live credentials.'
        )
    return key_id, key_secret


def get_razorpay_client():
    try:
        import razorpay
    except ImportError as exc:
        raise PaymentConfigError(
            'Razorpay SDK is not installed. Add `razorpay` to requirements.'
        ) from exc

    key_id, key_secret = get_razorpay_credentials()
    return razorpay.Client(auth=(key_id, key_secret)), key_id


def parse_topup_amount(raw_amount) -> Decimal:
    try:
        amount = Decimal(str(raw_amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    except Exception as exc:
        raise PaymentValidationError('Enter a valid amount.') from exc

    if amount < MIN_TOPUP_AMOUNT:
        raise PaymentValidationError(f'Minimum top-up is ₹{MIN_TOPUP_AMOUNT}.')
    if amount > MAX_TOPUP_AMOUNT:
        raise PaymentValidationError(f'Maximum top-up is ₹{MAX_TOPUP_AMOUNT}.')
    return amount


def assert_wallet_topup_allowed(user) -> None:
    user_type = getattr(user, 'type', None)
    if user_type not in WALLET_TOPUP_ROLES:
        raise PaymentValidationError('Only brand and creator wallets can add funds.')


def amount_to_paise(amount: Decimal) -> int:
    return int((amount * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def create_wallet_topup_order(*, user, amount: Decimal) -> dict:
    """Create a pending deposit transaction + Razorpay order."""
    assert_wallet_topup_allowed(user)
    amount = parse_topup_amount(amount)
    client, key_id = get_razorpay_client()

    with db_transaction.atomic():
        Profile.objects.select_for_update().get_or_create(user=user)
        deposit = Transaction.objects.create(
            user=user,
            amount=amount,
            transaction_type='deposit',
            status='pending',
            payment_method='razorpay',
            payment_details='Wallet top-up via Razorpay',
            external_ref='',
        )

        receipt = f'wlt_{deposit.id}'
        try:
            order = client.order.create(
                {
                    'amount': amount_to_paise(amount),
                    'currency': 'INR',
                    'receipt': receipt,
                    'payment_capture': 1,
                    'notes': {
                        'transaction_id': str(deposit.id),
                        'user_id': str(user.id),
                        'purpose': 'wallet_topup',
                    },
                }
            )
        except Exception as exc:
            deposit.status = 'failed'
            deposit.bot_notes = f'Razorpay order create failed: {exc}'
            deposit.save(update_fields=['status', 'bot_notes', 'updated_at'])
            logger.exception('Failed to create Razorpay order for deposit %s', deposit.id)
            raise PaymentGatewayError('Unable to start payment. Please try again.') from exc

        order_id = order.get('id') or ''
        if not order_id:
            deposit.status = 'failed'
            deposit.bot_notes = 'Razorpay order response missing id'
            deposit.save(update_fields=['status', 'bot_notes', 'updated_at'])
            raise PaymentGatewayError('Payment provider returned an invalid order.')

        deposit.external_ref = order_id
        deposit.save(update_fields=['external_ref', 'updated_at'])

    return {
        'transactionId': deposit.id,
        'orderId': order_id,
        'amount': float(amount),
        'amountPaise': amount_to_paise(amount),
        'currency': 'INR',
        'keyId': key_id,
        'status': deposit.status,
    }


def _credit_wallet_for_deposit(deposit: Transaction, *, payment_id: str = '') -> Transaction:
    """Idempotently credit wallet for a completed deposit."""
    if deposit.status == 'completed':
        return deposit

    if deposit.transaction_type != 'deposit':
        raise PaymentValidationError('Transaction is not a wallet deposit.')

    profile, _ = Profile.objects.select_for_update().get_or_create(user=deposit.user)
    Profile.objects.filter(pk=profile.pk).update(
        wallet_balance=F('wallet_balance') + deposit.amount,
        total_deposited=F('total_deposited') + deposit.amount,
    )

    notes = (deposit.bot_notes or '').strip()
    payment_note = f'payment_id={payment_id}' if payment_id else ''
    deposit.status = 'completed'
    deposit.payment_details = 'Wallet top-up via Razorpay'
    if payment_note:
        deposit.bot_notes = f'{notes}\n{payment_note}'.strip() if notes else payment_note
    deposit.save(update_fields=['status', 'payment_details', 'bot_notes', 'updated_at'])
    return deposit


def confirm_wallet_topup(
    *,
    user,
    order_id: str,
    payment_id: str,
    signature: str,
) -> dict:
    """Verify Razorpay checkout signature and credit the wallet."""
    assert_wallet_topup_allowed(user)
    order_id = (order_id or '').strip()
    payment_id = (payment_id or '').strip()
    signature = (signature or '').strip()

    if not order_id or not payment_id or not signature:
        raise PaymentValidationError('Missing payment confirmation details.')

    client, _key_id = get_razorpay_client()
    try:
        client.utility.verify_payment_signature(
            {
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature,
            }
        )
    except Exception as exc:
        raise PaymentValidationError('Payment signature verification failed.') from exc

    with db_transaction.atomic():
        deposit = (
            Transaction.objects.select_for_update()
            .filter(
                user=user,
                transaction_type='deposit',
                external_ref=order_id,
            )
            .first()
        )
        if not deposit:
            raise PaymentValidationError('Deposit order not found.')

        if deposit.status == 'completed':
            profile = Profile.objects.filter(user=user).first()
            return _topup_result(deposit, profile)

        if deposit.status == 'failed':
            raise PaymentValidationError('This deposit was already marked failed.')

        deposit = _credit_wallet_for_deposit(deposit, payment_id=payment_id)
        profile = Profile.objects.filter(user=user).first()
        return _topup_result(deposit, profile)


def credit_wallet_from_razorpay_order(*, order_id: str, payment_id: str = '') -> dict | None:
    """Webhook/safety path: credit by order id without browser signature."""
    order_id = (order_id or '').strip()
    if not order_id:
        return None

    with db_transaction.atomic():
        deposit = (
            Transaction.objects.select_for_update()
            .filter(transaction_type='deposit', external_ref=order_id)
            .first()
        )
        if not deposit:
            return None
        if deposit.status == 'completed':
            profile = Profile.objects.filter(user=deposit.user).first()
            return _topup_result(deposit, profile)

        deposit = _credit_wallet_for_deposit(deposit, payment_id=payment_id)
        profile = Profile.objects.filter(user=deposit.user).first()
        return _topup_result(deposit, profile)


def verify_webhook_signature(*, body: bytes, signature: str) -> bool:
    webhook_secret = (getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', None) or '').strip()
    if not webhook_secret:
        logger.warning('RAZORPAY_WEBHOOK_SECRET is not configured; rejecting webhook.')
        return False

    client, _key_id = get_razorpay_client()
    try:
        client.utility.verify_webhook_signature(body.decode('utf-8'), signature, webhook_secret)
        return True
    except Exception:
        logger.exception('Invalid Razorpay webhook signature')
        return False


def _topup_result(deposit: Transaction, profile: Profile | None) -> dict:
    return {
        'transactionId': deposit.id,
        'orderId': deposit.external_ref,
        'amount': float(deposit.amount),
        'status': deposit.status,
        'walletBalance': float(profile.wallet_balance) if profile else 0.0,
        'totalDeposited': float(profile.total_deposited) if profile else 0.0,
    }

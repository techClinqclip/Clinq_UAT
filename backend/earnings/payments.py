"""Reusable wallet top-up helpers (Razorpay).

Used by Brand and Creator campaign wallets. Keep gateway-specific details here
so views stay thin and other dashboards can call the same functions later.
"""

from __future__ import annotations

import json
import logging
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction as db_transaction
from django.db.models import F
from django.utils import timezone

from accounts.models import Profile
from .models import Transaction

logger = logging.getLogger(__name__)

MIN_TOPUP_AMOUNT = Decimal('500.00')
MAX_TOPUP_AMOUNT = Decimal('500000.00')
WALLET_TOPUP_ROLES = {'brand', 'creator'}
# Pending Razorpay deposits older than this with no captured payment → failed
PENDING_TOPUP_FAIL_AFTER = timedelta(minutes=15)


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
            payment_details='Money added to wallet',
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
    deposit.payment_details = 'Money added to wallet'
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
            logger.warning('No pending deposit found for Razorpay order %s', order_id)
            return None
        if deposit.status == 'completed':
            profile = Profile.objects.filter(user=deposit.user).first()
            return _topup_result(deposit, profile)
        if deposit.status == 'failed':
            logger.warning('Ignoring webhook for failed deposit order %s', order_id)
            return None

        deposit = _credit_wallet_for_deposit(deposit, payment_id=payment_id)
        profile = Profile.objects.filter(user=deposit.user).first()
        logger.info(
            'Credited wallet via Razorpay recovery for user=%s order=%s amount=%s',
            deposit.user_id,
            order_id,
            deposit.amount,
        )
        return _topup_result(deposit, profile)


def _extract_captured_payment_id(client, order_id: str) -> str | None:
    """Return a captured/authorized payment id for an order, if Razorpay has one."""
    try:
        order = client.order.fetch(order_id)
    except Exception:
        logger.exception('Failed to fetch Razorpay order %s', order_id)
        return None

    if (order or {}).get('status') == 'paid':
        # Prefer an explicit payment id from the payments listing.
        pass
    elif (order or {}).get('status') not in {'paid', 'attempted'}:
        return None

    try:
        payments = client.order.payments(order_id)
    except Exception:
        logger.exception('Failed to list Razorpay payments for order %s', order_id)
        return None

    items = (payments or {}).get('items') or []
    for payment in items:
        status = (payment or {}).get('status')
        if status in {'captured', 'authorized'}:
            payment_id = (payment or {}).get('id') or ''
            if payment_id:
                return payment_id

    # Some accounts mark the order paid even if listing is delayed.
    if (order or {}).get('status') == 'paid':
        return 'order_paid'
    return None


def _mark_deposit_failed(deposit: Transaction, *, reason: str) -> Transaction:
    if deposit.status == 'completed':
        return deposit
    notes = (deposit.bot_notes or '').strip()
    deposit.status = 'failed'
    deposit.bot_notes = f'{notes}\n{reason}'.strip() if notes else reason
    deposit.save(update_fields=['status', 'bot_notes', 'updated_at'])
    return deposit


def mark_wallet_topup_failed(*, user, order_id: str, reason: str = 'Payment cancelled or failed.') -> dict:
    """Mark a pending deposit as failed (checkout dismissed / payment failed)."""
    assert_wallet_topup_allowed(user)
    order_id = (order_id or '').strip()
    if not order_id:
        raise PaymentValidationError('orderId is required.')

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

        deposit = _mark_deposit_failed(deposit, reason=reason)
        profile = Profile.objects.filter(user=user).first()
        return _topup_result(deposit, profile)


def _should_fail_unpaid_deposit(client, deposit: Transaction) -> tuple[bool, str]:
    """Decide if an unpaid pending deposit should be marked failed."""
    try:
        order = client.order.fetch(deposit.external_ref)
    except Exception:
        # If we cannot reach Razorpay, only age-out very old pending rows.
        if deposit.created_at and timezone.now() - deposit.created_at >= PENDING_TOPUP_FAIL_AFTER:
            return True, 'Marked failed: unpaid deposit timed out.'
        return False, ''

    status = (order or {}).get('status') or ''
    if status == 'paid':
        return False, ''

    try:
        payments = client.order.payments(deposit.external_ref)
    except Exception:
        payments = {'items': []}

    items = (payments or {}).get('items') or []
    if items and all((payment or {}).get('status') in {'failed', 'refunded'} for payment in items):
        return True, 'Marked failed: Razorpay payment failed.'

    if deposit.created_at and timezone.now() - deposit.created_at >= PENDING_TOPUP_FAIL_AFTER:
        return True, 'Marked failed: checkout abandoned / unpaid.'

    return False, ''


def reconcile_pending_wallet_topups(*, user, limit: int = 20) -> dict:
    """Credit paid deposits; mark abandoned/failed Razorpay top-ups as failed.

    Covers: browser closed / offline after money was debited, but before
    confirm-topup reached our API. Safe to call repeatedly (idempotent).
    """
    assert_wallet_topup_allowed(user)
    client, _key_id = get_razorpay_client()

    pending = list(
        Transaction.objects.filter(
            user=user,
            transaction_type='deposit',
            status='pending',
        )
        .exclude(external_ref='')
        .order_by('-created_at')[:limit]
    )

    credited = []
    failed = []
    still_pending = 0
    for deposit in pending:
        payment_id = _extract_captured_payment_id(client, deposit.external_ref)
        if payment_id:
            result = credit_wallet_from_razorpay_order(
                order_id=deposit.external_ref,
                payment_id='' if payment_id == 'order_paid' else payment_id,
            )
            if result and result.get('status') == 'completed':
                credited.append(result)
            else:
                still_pending += 1
            continue

        should_fail, reason = _should_fail_unpaid_deposit(client, deposit)
        if should_fail:
            with db_transaction.atomic():
                locked = (
                    Transaction.objects.select_for_update()
                    .filter(pk=deposit.pk, status='pending')
                    .first()
                )
                if locked:
                    locked = _mark_deposit_failed(locked, reason=reason)
                    failed.append(_topup_result(locked, Profile.objects.filter(user=user).first()))
            continue

        still_pending += 1

    profile = Profile.objects.filter(user=user).first()
    return {
        'checked': len(pending),
        'creditedCount': len(credited),
        'failedCount': len(failed),
        'stillPending': still_pending,
        'credited': credited,
        'failed': failed,
        'walletBalance': float(profile.wallet_balance) if profile else 0.0,
        'totalDeposited': float(profile.total_deposited) if profile else 0.0,
    }

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


# -------------------- RazorpayX withdrawal payouts --------------------


def get_razorpayx_account_number() -> str:
    account_number = (getattr(settings, 'RAZORPAYX_ACCOUNT_NUMBER', None) or '').strip()
    if not account_number:
        raise PaymentConfigError(
            'RazorpayX is not configured. Set RAZORPAYX_ACCOUNT_NUMBER for withdrawal autopay.'
        )
    return account_number


def _parse_withdrawal_destination(txn: Transaction) -> dict:
    notes = {}
    raw = (txn.bot_notes or '').strip()
    if raw.startswith('{'):
        try:
            notes = json.loads(raw)
        except json.JSONDecodeError:
            notes = {}
    destination = notes.get('destination') if isinstance(notes, dict) else None
    if isinstance(destination, dict) and destination:
        return destination

    method = (txn.payment_method or '').strip()
    details = (txn.payment_details or '').strip()
    if method == 'upi':
        return {'payout_method': 'upi', 'upi_id': details or txn.external_ref}
    if method == 'bank_transfer':
        parts = [part.strip() for part in details.split('|')]
        return {
            'payout_method': 'bank_transfer',
            'bank_account_holder': parts[0] if len(parts) > 0 else '',
            'bank_name': parts[1] if len(parts) > 1 else '',
            'bank_account_number': parts[2] if len(parts) > 2 else (txn.external_ref or ''),
            'bank_ifsc': notes.get('bank_ifsc', '') if isinstance(notes, dict) else '',
        }
    return {'payout_method': method}


def merge_withdrawal_notes(txn: Transaction, patch: dict) -> str:
    notes = {}
    raw = (txn.bot_notes or '').strip()
    if raw.startswith('{'):
        try:
            notes = json.loads(raw)
        except json.JSONDecodeError:
            notes = {'legacyNotes': raw}
    elif raw:
        notes = {'legacyNotes': raw}
    notes.update(patch)
    return json.dumps(notes)


def store_withdrawal_destination(txn: Transaction, *, destination: dict) -> Transaction:
    txn.bot_notes = merge_withdrawal_notes(txn, {'destination': destination})
    txn.save(update_fields=['bot_notes', 'updated_at'])
    return txn


def restore_withdrawal_balance(txn: Transaction) -> None:
    """Return reserved withdrawal amount to the user's available earnings."""
    from django.db.models import Value
    from django.db.models.functions import Greatest

    Profile.objects.filter(user_id=txn.user_id).update(
        total_earnings=F('total_earnings') + txn.amount,
        total_withdrawn=Greatest(F('total_withdrawn') - txn.amount, Value(Decimal('0.00'))),
    )


def _finalize_withdrawal_as(
    txn: Transaction,
    *,
    status_value: str,
    notes: dict,
) -> Transaction:
    with db_transaction.atomic():
        locked = (
            Transaction.objects.select_for_update()
            .filter(pk=txn.pk, transaction_type='withdrawal', status='pending')
            .first()
        )
        if not locked:
            return txn
        locked.status = status_value
        locked.bot_notes = merge_withdrawal_notes(locked, notes)
        locked.save(update_fields=['status', 'bot_notes', 'updated_at'])
        restore_withdrawal_balance(locked)
        return locked


def mark_withdrawal_failed(txn: Transaction, *, reason: str = '') -> Transaction:
    return _finalize_withdrawal_as(
        txn,
        status_value='failed',
        notes={'razorpayError': reason or 'Payout failed', 'razorpayStatus': 'failed'},
    )


def mark_withdrawal_rejected(
    txn: Transaction,
    *,
    reason: str = '',
    rejected_by_admin: bool = False,
    razorpay_status: str = 'rejected',
) -> Transaction:
    notes = {
        'rejectReason': reason or 'Payout rejected',
        'razorpayStatus': razorpay_status,
    }
    if rejected_by_admin:
        notes['rejectedByAdmin'] = True
    else:
        notes['razorpayError'] = reason or 'Payout rejected'
    return _finalize_withdrawal_as(txn, status_value='rejected', notes=notes)


def mark_withdrawal_completed(txn: Transaction, *, payout_id: str = '', razorpay_status: str = 'processed') -> Transaction:
    with db_transaction.atomic():
        locked = (
            Transaction.objects.select_for_update()
            .filter(pk=txn.pk, transaction_type='withdrawal', status__in=['pending', 'completed'])
            .first()
        )
        if not locked:
            return txn
        locked.status = 'completed'
        if payout_id:
            locked.external_ref = payout_id
        locked.bot_notes = merge_withdrawal_notes(
            locked,
            {
                'razorpay': {
                    'payout_id': payout_id or locked.external_ref,
                    'status': razorpay_status,
                }
            },
        )
        locked.save(update_fields=['status', 'external_ref', 'bot_notes', 'updated_at'])
        return locked


def build_withdrawal_destination_display(txn: Transaction) -> dict:
    """Normalized destination fields for admin payout UI."""
    destination = _parse_withdrawal_destination(txn)
    method = (destination.get('payout_method') or txn.payment_method or '').strip().lower()
    if method == 'bank':
        method = 'bank_transfer'

    upi_id = (destination.get('upi_id') or '').strip()
    holder = (destination.get('bank_account_holder') or '').strip()
    bank_name = (destination.get('bank_name') or '').strip()
    account_number = (destination.get('bank_account_number') or '').strip()
    ifsc = (destination.get('bank_ifsc') or '').strip()

    if method == 'upi' or (upi_id and '@' in upi_id):
        label = upi_id or (txn.payment_details or '').strip() or (txn.external_ref or '').strip()
        return {
            'paymentMethod': 'upi',
            'upiId': label,
            'destinationLabel': label or 'UPI ID unavailable',
            'destinationHint': 'Transfer via UPI to this VPA',
        }

    masked = f"•••• {account_number[-4:]}" if len(account_number) >= 4 else account_number
    label_parts = [part for part in (holder, bank_name, masked) if part]
    hint_parts = [part for part in (ifsc and f'IFSC {ifsc}', account_number and f'A/C {account_number}') if part]
    return {
        'paymentMethod': 'bank_transfer',
        'bankAccountHolder': holder,
        'bankName': bank_name,
        'bankAccountNumber': account_number,
        'bankIfsc': ifsc,
        'destinationLabel': ' · '.join(label_parts) if label_parts else ((txn.payment_details or '').strip() or 'Bank details unavailable'),
        'destinationHint': ' · '.join(hint_parts) if hint_parts else 'Transfer via NEFT/IMPS/RTGS',
    }


def mark_withdrawal_paid_manually(
    txn: Transaction,
    *,
    payment_reference: str = '',
    notes: str = '',
    admin_email: str = '',
) -> dict:
    """Mark a pending withdrawal completed after offline/manual payment."""
    if txn.transaction_type != 'withdrawal':
        raise PaymentValidationError('Only withdrawal transactions can be marked paid.')
    if txn.status != 'pending':
        raise PaymentValidationError('Only pending withdrawals can be marked paid.')

    reference = (payment_reference or '').strip()
    if not reference:
        raise PaymentValidationError('UTR / payment reference is required for manual payout.')

    display = build_withdrawal_destination_display(txn)
    method_label = 'UPI' if display.get('paymentMethod') == 'upi' else 'Bank Transfer'
    destination_label = display.get('destinationLabel') or 'destination'

    with db_transaction.atomic():
        locked = (
            Transaction.objects.select_for_update()
            .filter(pk=txn.pk, transaction_type='withdrawal', status='pending')
            .first()
        )
        if not locked:
            raise PaymentValidationError('Withdrawal is no longer pending.')

        locked.status = 'completed'
        locked.external_ref = reference
        # Keep destination readable in history while recording the UTR.
        locked.payment_details = f'{destination_label} · UTR {reference}'
        locked.bot_notes = merge_withdrawal_notes(
            locked,
            {
                'manualPay': {
                    'paid': True,
                    'paymentReference': reference,
                    'notes': (notes or '').strip(),
                    'paidBy': admin_email or '',
                    'method': method_label,
                    'destination': destination_label,
                }
            },
        )
        locked.save(update_fields=['status', 'external_ref', 'payment_details', 'bot_notes', 'updated_at'])

    return {
        'transactionId': locked.id,
        'amount': float(locked.amount),
        'status': locked.status,
        'paymentReference': locked.external_ref,
        'mode': 'manual',
        'destinationLabel': destination_label,
        'method': method_label,
    }


def create_razorpay_withdrawal_payout(txn: Transaction) -> dict:
    """Create a RazorpayX payout for a pending withdrawal transaction."""
    if txn.transaction_type != 'withdrawal':
        raise PaymentValidationError('Only withdrawal transactions can be paid out.')
    if txn.status != 'pending':
        raise PaymentValidationError('Only pending withdrawals can be paid out.')

    destination = _parse_withdrawal_destination(txn)
    method = destination.get('payout_method') or txn.payment_method
    if method not in {'upi', 'bank_transfer'}:
        raise PaymentValidationError('Razorpay autopay supports UPI or bank transfer only.')

    client, _key_id = get_razorpay_client()
    account_number = get_razorpayx_account_number()
    user = txn.user
    contact_name = (
        destination.get('bank_account_holder')
        or getattr(user, 'first_name', None)
        or (user.email.split('@')[0] if user.email else 'Clinq User')
    )

    try:
        contact = client.contact.create(
            {
                'name': str(contact_name)[:50],
                'email': user.email or None,
                'type': 'customer',
                'reference_id': f'clinq-user-{user.id}',
            }
        )
        contact_id = contact.get('id')
        if method == 'upi':
            upi_id = (destination.get('upi_id') or '').strip()
            if not upi_id:
                raise PaymentValidationError('UPI ID is required for Razorpay UPI payout.')
            fund_account = client.fund_account.create(
                {
                    'contact_id': contact_id,
                    'account_type': 'vpa',
                    'vpa': {'address': upi_id},
                }
            )
            mode = 'UPI'
        else:
            holder = (destination.get('bank_account_holder') or '').strip()
            bank_account_number = (destination.get('bank_account_number') or '').strip()
            ifsc = (destination.get('bank_ifsc') or '').strip()
            if not holder or not bank_account_number or not ifsc:
                raise PaymentValidationError(
                    'Bank holder, account number, and IFSC are required for Razorpay bank payout.'
                )
            fund_account = client.fund_account.create(
                {
                    'contact_id': contact_id,
                    'account_type': 'bank_account',
                    'bank_account': {
                        'name': holder,
                        'ifsc': ifsc,
                        'account_number': bank_account_number,
                    },
                }
            )
            mode = 'NEFT'

        fund_account_id = fund_account.get('id')
        payout = client.payout.create(
            {
                'account_number': account_number,
                'fund_account_id': fund_account_id,
                'amount': amount_to_paise(Decimal(str(txn.amount))),
                'currency': 'INR',
                'mode': mode,
                'purpose': 'payout',
                'queue_if_low_balance': True,
                'reference_id': f'clinq-wd-{txn.id}',
                'narration': 'Clinq earnings withdrawal',
            }
        )
    except PaymentValidationError:
        raise
    except PaymentConfigError:
        raise
    except Exception as exc:
        logger.exception('Razorpay payout failed for withdrawal %s', txn.id)
        message = getattr(exc, 'error', None)
        if isinstance(message, dict):
            detail = message.get('description') or message.get('code') or str(exc)
        else:
            detail = str(exc)
        raise PaymentGatewayError(detail or 'Razorpay payout failed.') from exc

    payout_id = payout.get('id') or ''
    payout_status = (payout.get('status') or 'processing').lower()
    txn.bot_notes = merge_withdrawal_notes(
        txn,
        {
            'destination': destination,
            'razorpay': {
                'contact_id': contact_id,
                'fund_account_id': fund_account_id,
                'payout_id': payout_id,
                'status': payout_status,
            },
        },
    )
    txn.external_ref = payout_id or txn.external_ref
    # Keep pending until webhook confirms processed; immediate terminal states finalize now.
    if payout_status in {'processed', 'completed'}:
        txn.status = 'completed'
        txn.save(update_fields=['status', 'external_ref', 'bot_notes', 'updated_at'])
    elif payout_status in {'rejected', 'cancelled'}:
        txn.save(update_fields=['external_ref', 'bot_notes', 'updated_at'])
        txn = mark_withdrawal_rejected(
            txn,
            reason=payout.get('failure_reason') or payout_status,
            razorpay_status=payout_status,
        )
    elif payout_status in {'failed', 'reversed'}:
        txn.save(update_fields=['external_ref', 'bot_notes', 'updated_at'])
        txn = mark_withdrawal_failed(
            txn,
            reason=payout.get('failure_reason') or payout_status,
        )
    else:
        txn.save(update_fields=['external_ref', 'bot_notes', 'updated_at'])

    return {
        'transactionId': txn.id,
        'amount': float(txn.amount),
        'status': txn.status,
        'payoutId': payout_id,
        'razorpayStatus': payout_status,
    }


def apply_razorpay_payout_webhook(*, payout_id: str, payout_status: str, failure_reason: str = '') -> Transaction | None:
    if not payout_id:
        return None
    txn = Transaction.objects.filter(
        transaction_type='withdrawal',
        external_ref=payout_id,
    ).first()
    if not txn:
        txn = Transaction.objects.filter(
            transaction_type='withdrawal',
            bot_notes__icontains=payout_id,
            status='pending',
        ).first()
    if not txn:
        return None

    status_norm = (payout_status or '').lower()
    if status_norm in {'processed', 'completed'}:
        return mark_withdrawal_completed(txn, payout_id=payout_id, razorpay_status=status_norm)
    if status_norm in {'rejected', 'cancelled'}:
        if txn.status == 'pending':
            return mark_withdrawal_rejected(
                txn,
                reason=failure_reason or status_norm,
                razorpay_status=status_norm,
            )
        txn.bot_notes = merge_withdrawal_notes(
            txn,
            {'razorpayStatus': status_norm, 'razorpayError': failure_reason or status_norm},
        )
        txn.save(update_fields=['bot_notes', 'updated_at'])
        return txn
    if status_norm in {'failed', 'reversed'}:
        if txn.status == 'pending':
            return mark_withdrawal_failed(txn, reason=failure_reason or status_norm)
        txn.bot_notes = merge_withdrawal_notes(
            txn,
            {'razorpayStatus': status_norm, 'razorpayError': failure_reason or status_norm},
        )
        txn.save(update_fields=['bot_notes', 'updated_at'])
    return txn

from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Q, F, Count
from django.db.models.functions import Greatest, TruncMonth
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction as db_transaction
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .serializers import (
    EarningsTransferSerializer,
    PayoutSerializer,
    TransactionSerializer,
    WalletTopUpConfirmSerializer,
    WalletTopUpCreateSerializer,
    WalletTopUpFailSerializer,
)
from .models import Transaction
from .payments import (
    PaymentConfigError,
    PaymentGatewayError,
    PaymentValidationError,
    confirm_wallet_topup,
    create_razorpay_withdrawal_payout,
    create_wallet_topup_order,
    mark_wallet_topup_failed,
    mark_withdrawal_paid_manually,
    reconcile_pending_wallet_topups,
    restore_withdrawal_balance,
    merge_withdrawal_notes,
    store_withdrawal_destination,
)
from accounts.models import Profile
from content.models import CampaignSubmission
from .utils import get_available_withdrawable_earnings, get_total_withdrawn
from settings.models import PlatformPayoutSettings

class PayoutViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = PayoutSerializer

    @extend_schema(
        summary='Request payout',
        description='Request a payout/withdrawal. Minimum amount is ₹2500.',
        request=PayoutSerializer,
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='request-payout')
    def request_payout(self, request):
        """
        Request a payout/withdrawal
        Requires minimum amount of ₹2500
        """
        serializer = PayoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        amount = validated_data['amount']
        payout_method = validated_data['payout_method']
        upi_id = validated_data.get('upi_id')
        bank_account_holder = validated_data.get('bank_account_holder')
        bank_account_number = validated_data.get('bank_account_number')
        bank_ifsc = validated_data.get('bank_ifsc')
        bank_name = validated_data.get('bank_name')

        if amount < Decimal('2500.00'):
            return Response(
                {"error": "Minimum withdrawal amount is ₹2500"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with db_transaction.atomic():
                profile = Profile.objects.select_for_update().get(user=request.user)
                available = get_available_withdrawable_earnings(request.user)

                if amount > available:
                    return Response(
                        {"error": f"Insufficient balance. Available: ₹{available}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                payment_details = ''
                external_ref = ''
                if payout_method == 'upi':
                    payment_details = upi_id
                    external_ref = upi_id
                elif payout_method == 'bank_transfer':
                    payment_details = f"{bank_account_holder} | {bank_name} | {bank_account_number}"
                    external_ref = bank_account_number or 'Bank Transfer'
                else:
                    payment_details = 'PayPal'
                    external_ref = 'PayPal'

                destination = {
                    'payout_method': payout_method,
                    'upi_id': upi_id or '',
                    'bank_account_holder': bank_account_holder or '',
                    'bank_account_number': bank_account_number or '',
                    'bank_ifsc': bank_ifsc or '',
                    'bank_name': bank_name or '',
                }
                txn = Transaction.objects.create(
                    user=request.user,
                    amount=amount,
                    transaction_type='withdrawal',
                    payment_method=payout_method,
                    payment_details=payment_details,
                    status='pending',
                    external_ref=external_ref,
                )
                store_withdrawal_destination(txn, destination=destination)

                from django.db.models import Value
                Profile.objects.filter(user=request.user).update(
                    total_earnings=Greatest(F('total_earnings') - amount, Value(Decimal('0.00'))),
                    total_withdrawn=F('total_withdrawn') + amount,
                )
                profile.refresh_from_db()
                remaining = get_available_withdrawable_earnings(request.user)
                from notifications.helpers import notify_user_event
                notify_user_event(
                    user_id=request.user.id,
                    event_type='earnings.withdrawal_requested',
                    title='Withdrawal requested',
                    message=f'Your withdrawal request for ₹{amount} is pending review.',
                    category='earnings',
                    entity_type='transaction',
                    entity_id=txn.id,
                    payload={'amount': str(amount), 'payment_method': payout_method},
                    email=True,
                    idempotency_key=f'earnings.withdrawal_requested:{request.user.id}:{txn.id}:{amount}',
                )
        except Profile.DoesNotExist:
            return Response(
                {"error": "User profile not found. Please contact support."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error processing payout request: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to process payout request. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        payout_settings = PlatformPayoutSettings.get_solo()
        autopay_triggered = False
        autopay_error = None
        payout_result = None

        if payout_settings.manual_pay:
            message = (
                "Withdrawal requested. Admin will pay manually and mark this request approved."
            )
        elif payout_settings.require_payout_approval:
            message = (
                "Withdrawal requested. Waiting for admin approval before RazorpayX payout."
            )
        else:
            message = "Withdrawal requested. RazorpayX autopay will start now."

        if payout_settings.should_trigger_razorpay_on_request():
            try:
                payout_result = create_razorpay_withdrawal_payout(txn)
                autopay_triggered = True
                message = (
                    "Withdrawal requested. RazorpayX autopay has been triggered."
                    if payout_result.get('status') == 'pending'
                    else "Withdrawal paid via RazorpayX."
                )
                txn.refresh_from_db()
            except (PaymentConfigError, PaymentValidationError, PaymentGatewayError) as error:
                autopay_error = str(error)
                message = (
                    "Withdrawal requested, but RazorpayX autopay could not start. "
                    "It remains pending for admin retry."
                )

        return Response({
            "status": "Success",
            "message": message,
            "amount": float(amount),
            "remaining_balance": float(remaining),
            "total_withdrawn": float(get_total_withdrawn(request.user)),
            "transactionId": txn.id,
            "manualPay": bool(payout_settings.manual_pay),
            "requiresApproval": bool(
                payout_settings.manual_pay or payout_settings.require_payout_approval
            ),
            "mode": payout_settings.mode,
            "autopayTriggered": autopay_triggered,
            "autopayError": autopay_error,
            "payout": payout_result,
            "transactionStatus": txn.status,
        }, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Get payout history',
        description='Get payout history. Supports ?status=pending|completed|failed|rejected filter',
        tags=['Earnings'],
        parameters=[
            OpenApiParameter(
                name='status',
                type=str,
                location=OpenApiParameter.QUERY,
                description='Filter by transaction status',
                enum=['pending', 'completed', 'failed', 'rejected'],
            ),
        ],
    )
    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """
        Returns the list of past withdrawal requests
        Supports ?status=pending|completed|failed|rejected filter
        """
        withdrawals = Transaction.objects.filter(
            user=request.user, 
            transaction_type='withdrawal'
        ).order_by('-created_at')
        
        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            withdrawals = withdrawals.filter(status=status_filter)
        
        serializer = TransactionSerializer(withdrawals, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Admin withdrawal queue',
        description='List withdrawal requests for payout approval / Razorpay autopay.',
        tags=['Earnings'],
    )
    @action(detail=False, methods=['get'], url_path='admin-queue', permission_classes=[IsAdminUser])
    def admin_queue(self, request):
        status_filter = (request.query_params.get('status') or 'pending').strip().lower()
        withdrawals = Transaction.objects.filter(transaction_type='withdrawal').select_related('user')
        if status_filter != 'all':
            withdrawals = withdrawals.filter(status=status_filter)
        withdrawals = withdrawals.order_by('-created_at')[:200]

        results = []
        for txn in withdrawals:
            results.append({
                'id': txn.id,
                'amount': float(txn.amount),
                'status': txn.status,
                'paymentMethod': txn.payment_method,
                'paymentDetails': txn.payment_details,
                'externalRef': txn.external_ref,
                'createdAt': txn.created_at,
                'updatedAt': txn.updated_at,
                'userEmail': getattr(txn.user, 'email', ''),
                'userId': txn.user_id,
                'userType': getattr(txn.user, 'type', ''),
            })
        settings_row = PlatformPayoutSettings.get_solo()
        return Response({
            'manualPay': bool(settings_row.manual_pay),
            'requirePayoutApproval': bool(settings_row.require_payout_approval),
            'mode': settings_row.mode,
            'results': results,
            'pendingCount': Transaction.objects.filter(
                transaction_type='withdrawal',
                status='pending',
            ).count(),
        })

    @extend_schema(
        summary='Admin approve withdrawal payout',
        description=(
            'Approve a pending withdrawal. In manual mode, mark paid with optional reference. '
            'In RazorpayX mode, trigger autopay.'
        ),
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='admin-approve', permission_classes=[IsAdminUser])
    def admin_approve(self, request):
        txn_id = request.data.get('transactionId') or request.data.get('transaction_id')
        payment_reference = str(
            request.data.get('paymentReference') or request.data.get('payment_reference') or ''
        ).strip()
        notes = str(request.data.get('notes') or '').strip()
        if not txn_id:
            return Response({'error': 'transactionId is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            txn = Transaction.objects.select_related('user').get(
                pk=txn_id,
                transaction_type='withdrawal',
            )
        except Transaction.DoesNotExist:
            return Response({'error': 'Withdrawal not found.'}, status=status.HTTP_404_NOT_FOUND)

        if txn.status != 'pending':
            return Response(
                {'error': f'Only pending withdrawals can be approved (current: {txn.status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payout_settings = PlatformPayoutSettings.get_solo()
        from notifications.helpers import notify_user_event

        if payout_settings.manual_pay:
            try:
                payout_result = mark_withdrawal_paid_manually(
                    txn,
                    payment_reference=payment_reference,
                    notes=notes,
                    admin_email=getattr(request.user, 'email', '') or '',
                )
            except PaymentValidationError as error:
                return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)

            txn.refresh_from_db()
            notify_user_event(
                user_id=txn.user_id,
                event_type='earnings.withdrawal_status',
                title='Withdrawal paid',
                message=f'Your withdrawal of ₹{txn.amount} was paid manually and marked completed.',
                category='earnings',
                entity_type='transaction',
                entity_id=txn.id,
                payload={'amount': str(txn.amount), 'status': txn.status, 'mode': 'manual'},
                email=True,
                idempotency_key=f'earnings.withdrawal_manual_paid:{txn.id}:{txn.external_ref}',
            )
            return Response({
                'status': 'Success',
                'message': 'Withdrawal marked paid manually and saved in database.',
                'mode': 'manual',
                'transactionId': txn.id,
                'transactionStatus': txn.status,
                'payout': payout_result,
            })

        try:
            payout_result = create_razorpay_withdrawal_payout(txn)
        except PaymentConfigError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (PaymentValidationError, PaymentGatewayError) as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)

        txn.refresh_from_db()
        notify_user_event(
            user_id=txn.user_id,
            event_type='earnings.withdrawal_status',
            title='Withdrawal approved',
            message=f'Your withdrawal of ₹{txn.amount} was approved and sent via RazorpayX.',
            category='earnings',
            entity_type='transaction',
            entity_id=txn.id,
            payload={'amount': str(txn.amount), 'status': txn.status, 'payout': payout_result},
            email=True,
            idempotency_key=f'earnings.withdrawal_approved:{txn.id}:{payout_result.get("payoutId")}',
        )
        return Response({
            'status': 'Success',
            'message': 'Withdrawal approved and RazorpayX payout triggered.',
            'mode': payout_settings.mode,
            'transactionId': txn.id,
            'transactionStatus': txn.status,
            'payout': payout_result,
        })

    @extend_schema(
        summary='Admin reject withdrawal payout',
        description='Reject a pending withdrawal and restore available earnings.',
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='admin-reject', permission_classes=[IsAdminUser])
    def admin_reject(self, request):
        txn_id = request.data.get('transactionId') or request.data.get('transaction_id')
        reason = str(request.data.get('reason') or '').strip()
        if not txn_id:
            return Response({'error': 'transactionId is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            txn = Transaction.objects.select_related('user').get(
                pk=txn_id,
                transaction_type='withdrawal',
            )
        except Transaction.DoesNotExist:
            return Response({'error': 'Withdrawal not found.'}, status=status.HTTP_404_NOT_FOUND)

        if txn.status != 'pending':
            return Response(
                {'error': f'Only pending withdrawals can be rejected (current: {txn.status}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            locked = (
                Transaction.objects.select_for_update()
                .filter(pk=txn.pk, status='pending', transaction_type='withdrawal')
                .first()
            )
            if not locked:
                return Response({'error': 'Withdrawal is no longer pending.'}, status=status.HTTP_400_BAD_REQUEST)
            locked.status = 'rejected'
            locked.bot_notes = merge_withdrawal_notes(
                locked,
                {'rejectedByAdmin': True, 'rejectReason': reason},
            )
            locked.save(update_fields=['status', 'bot_notes', 'updated_at'])
            restore_withdrawal_balance(locked)
            txn = locked

        from notifications.helpers import notify_user_event
        notify_user_event(
            user_id=txn.user_id,
            event_type='earnings.withdrawal_status',
            title='Withdrawal rejected',
            message=f'Your withdrawal of ₹{txn.amount} was rejected.{(" " + reason) if reason else ""}',
            category='earnings',
            entity_type='transaction',
            entity_id=txn.id,
            payload={'amount': str(txn.amount), 'status': 'rejected', 'reason': reason},
            email=True,
            idempotency_key=f'earnings.withdrawal_rejected:{txn.id}',
        )
        return Response({
            'status': 'Success',
            'message': 'Withdrawal rejected and balance restored.',
            'transactionId': txn.id,
            'transactionStatus': txn.status,
        })


class EarningsViewSet(viewsets.ViewSet):
    """
    ViewSet for earnings overview and management
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer

    @extend_schema(
        summary='Get earnings overview',
        description='Get earnings overview with period filtering. Supports ?period=today|week|month|year|all',
        tags=['Earnings'],
        parameters=[
            OpenApiParameter(
                name='period',
                type=str,
                location=OpenApiParameter.QUERY,
                description='Time period filter',
                enum=['today', 'week', 'month', 'year', 'all'],
                default='all'
            ),
        ],
    )
    @action(detail=False, methods=['get'], url_path='overview')
    def overview(self, request):
        """
        Get earnings overview for the authenticated user
        Supports ?period=today|week|month|year|all
        """
        user = request.user
        profile = user.profile
        
        # Get period from query params (default: all)
        period = request.query_params.get('period', 'all')
        
        # Calculate date range based on period
        now = timezone.now()
        if period == 'today':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == 'week':
            start_date = now - timedelta(days=7)
        elif period == 'month':
            start_date = now - timedelta(days=30)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:
            start_date = None

        # Filter transactions
        transactions_query = Transaction.objects.filter(user=user)
        if start_date:
            transactions_query = transactions_query.filter(created_at__gte=start_date)

        # Calculate earnings from approved campaign submissions first, then fall back to transaction history.
        # Soft-deleted submissions still count in the earned history/audit trail so the user sees
        # the real campaign payout even after deletion.
        campaign_submission_queryset = CampaignSubmission.objects.filter(participant__clipper=user, status='approved')
        if start_date:
            campaign_submission_queryset = campaign_submission_queryset.filter(created_at__gte=start_date)

        campaign_submission_totals = campaign_submission_queryset.aggregate(
            earnings=Sum('earning'),
            pending=Sum('pending_earning'),
        )
        campaign_submission_earnings = campaign_submission_totals['earnings'] or Decimal('0.00')
        campaign_submission_pending = campaign_submission_totals['pending'] or Decimal('0.00')

        transaction_totals = transactions_query.aggregate(
            total_earnings=Sum('amount', filter=Q(transaction_type='earning', status='completed')),
            pending_earnings=Sum('amount', filter=Q(transaction_type='earning', status='pending')),
            total_withdrawals=Sum('amount', filter=Q(transaction_type='withdrawal')),
            pending_withdrawals=Sum('amount', filter=Q(transaction_type='withdrawal', status='pending')),
        )
        total_earnings = transaction_totals['total_earnings'] or Decimal('0.00')
        settled_earnings = total_earnings
        campaign_total_earnings = campaign_submission_earnings + campaign_submission_pending
        if campaign_total_earnings > total_earnings:
            total_earnings = campaign_total_earnings

        # Calculate pending earnings separately from settled earnings.
        pending_earnings = transaction_totals['pending_earnings'] or Decimal('0.00')
        if float(pending_earnings) == 0 and float(campaign_submission_pending) > 0:
            pending_earnings = campaign_submission_pending

        # Withdrawable = approved clip earnings minus withdrawals/transfers.
        available_balance = get_available_withdrawable_earnings(user)

        # Calculate withdrawals
        total_withdrawals = get_total_withdrawn(user)
        pending_withdrawals = transaction_totals['pending_withdrawals'] or Decimal('0.00')

        # Recent transactions
        recent_transactions = transactions_query.order_by('-created_at')[:10]
        transactions_data = TransactionSerializer(recent_transactions, many=True).data

        # Build a list of recent earning-source entries from approved campaign submissions too,
        # including soft-deleted ones so the earnings audit remains complete even after a user removes a submission.
        submission_recent = (
            CampaignSubmission.objects.filter(participant__clipper=user, status='approved')
            .order_by('-created_at')[:50]
            .values('id', 'created_at', 'earning', 'pending_earning', 'participant__campaign__name')
        )

        submission_history = []
        for item in submission_recent:
            amount = Decimal(str(item.get('earning') or '0'))
            if float(amount) <= 0:
                continue
            submission_history.append({
                'id': item['id'],
                'amount': float(amount),
                'transactionType': 'Earning',
                'paymentMethod': 'Campaign Submission',
                'paymentDetails': item.get('participant__campaign__name') or 'Campaign earnings',
                'status': 'completed',
                'external_ref': '',
                'contentTitle': item.get('participant__campaign__name') or 'Campaign earnings',
                'submissionId': item['id'],
                'createdAt': item['created_at'].isoformat() if item.get('created_at') else None,
            })

        combined_recent_transactions = submission_history + [
            entry for entry in transactions_data if not any(
                str(entry.get('id')) == str(item['id']) for item in submission_history
            )
        ]

        def _history_sort_key(entry):
            value = entry.get('createdAt') or ''
            try:
                return datetime.fromisoformat(value.replace('Z', '+00:00'))
            except (TypeError, ValueError):
                return timezone.datetime.min.replace(tzinfo=timezone.utc)

        merged_recent_transactions = sorted(
            combined_recent_transactions,
            key=_history_sort_key,
            reverse=True,
        )

        # Monthly earnings for the last six months.
        # Soft-deleted approved submissions are still included so the audit stays accurate.
        monthly_earnings_query = Transaction.objects.filter(
            user=user,
            transaction_type='earning',
            status='completed',
            created_at__gte=timezone.now() - timedelta(days=180),
        ).annotate(month=TruncMonth('created_at')).values('month').annotate(amount=Sum('amount')).order_by('month')

        submission_monthly = (
            CampaignSubmission.objects.filter(participant__clipper=user, status='approved')
            .filter(created_at__gte=timezone.now() - timedelta(days=180))
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(amount=Sum('earning'))
            .order_by('month')
        )

        monthly_totals = {
            item['month'].strftime('%Y-%m'): float(item['amount'] or 0)
            for item in monthly_earnings_query
        }
        for item in submission_monthly:
            key = item['month'].strftime('%Y-%m')
            monthly_totals[key] = float(monthly_totals.get(key, 0.0)) + float(item['amount'] or 0)

        monthly_earnings = []
        current_month = timezone.now().date().replace(day=1)
        for offset in range(5, -1, -1):
            year = current_month.year
            month = current_month.month - offset
            while month <= 0:
                month += 12
                year -= 1
            month_label = datetime(year, month, 1).strftime('%b')
            month_key = f"{year}-{month:02d}"
            monthly_earnings.append({
                'month': month_label,
                'amount': monthly_totals.get(month_key, 0.0),
            })

        # Calculate available balance from the computed earnings values.
        available_balance_value = max(Decimal('0.00'), available_balance)
        can_request_payout = available_balance_value >= Decimal('2500.00')
        
        return Response({
            'total_earnings': float(total_earnings),
            'available_balance': float(available_balance_value),
            'period_earnings': float(total_earnings),
            'pending_earnings': float(pending_earnings),
            'total_withdrawals': float(total_withdrawals),
            'pending_withdrawals': float(pending_withdrawals),
            'monthly_earnings': monthly_earnings,
            'period': period,
            'recent_transactions': merged_recent_transactions,
            'minimum_payout': 2500.00,
            'can_request_payout': can_request_payout,
        })

    @extend_schema(
        summary='Create wallet top-up order',
        description='Create a Razorpay order to add funds to the brand/creator campaign wallet.',
        request=WalletTopUpCreateSerializer,
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='wallet/create-topup')
    def create_wallet_topup(self, request):
        serializer = WalletTopUpCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = create_wallet_topup_order(
                user=request.user,
                amount=serializer.validated_data['amount'],
            )
        except PaymentValidationError as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except PaymentConfigError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except PaymentGatewayError as error:
            return Response({'error': str(error)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(payload, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Confirm wallet top-up',
        description='Verify Razorpay payment signature and credit the campaign wallet.',
        request=WalletTopUpConfirmSerializer,
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='wallet/confirm-topup')
    def confirm_wallet_topup_payment(self, request):
        serializer = WalletTopUpConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = confirm_wallet_topup(
                user=request.user,
                order_id=serializer.validated_data['order_id'],
                payment_id=serializer.validated_data['payment_id'],
                signature=serializer.validated_data['signature'],
            )
        except PaymentValidationError as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except PaymentConfigError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Mark wallet top-up failed',
        description='Mark a pending Razorpay deposit as failed when checkout is cancelled or payment fails.',
        request=WalletTopUpFailSerializer,
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='wallet/fail-topup')
    def fail_wallet_topup(self, request):
        serializer = WalletTopUpFailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = mark_wallet_topup_failed(
                user=request.user,
                order_id=serializer.validated_data['order_id'],
                reason=serializer.validated_data.get('reason') or 'Payment cancelled or failed.',
            )
        except PaymentValidationError as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except PaymentConfigError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Transfer earnings to gig wallet',
        description='Move available earnings into the creator campaign/gig spend wallet.',
        request=EarningsTransferSerializer,
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='wallet/transfer-to-spend')
    def transfer_earnings_to_spend(self, request):
        if getattr(request.user, 'type', None) != 'creator':
            return Response(
                {'error': 'Only creators can transfer earnings to the gig wallet.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EarningsTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data['amount']

        try:
            with db_transaction.atomic():
                profile = Profile.objects.select_for_update().get(user=request.user)

                available = get_available_withdrawable_earnings(request.user)

                if amount > available:
                    return Response(
                        {'error': f'Insufficient earnings. Available: ₹{available}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                from django.db.models import Value
                Profile.objects.filter(pk=profile.pk).update(
                    total_earnings=Greatest(F('total_earnings') - amount, Value(Decimal('0.00'))),
                    wallet_balance=F('wallet_balance') + amount,
                )
                txn = Transaction.objects.create(
                    user=request.user,
                    amount=amount,
                    transaction_type='transfer',
                    status='completed',
                    payment_method='',
                    payment_details='Earned money transferred to gig wallet',
                    external_ref=f'earnings-transfer-{request.user.id}-{timezone.now().timestamp()}',
                )
                profile.refresh_from_db()
                remaining = get_available_withdrawable_earnings(request.user)
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                'transactionId': txn.id,
                'amount': float(amount),
                'status': 'completed',
                'walletBalance': float(profile.wallet_balance or 0),
                'availableEarnings': float(remaining),
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary='Sync pending wallet top-ups',
        description=(
            'Ask Razorpay whether any pending deposit orders were already paid. '
            'Credits the wallet when payment succeeded but the browser never confirmed. '
            'Also marks abandoned/failed Razorpay top-ups as failed.'
        ),
        tags=['Earnings'],
    )
    @action(detail=False, methods=['post'], url_path='wallet/sync-topups')
    def sync_wallet_topups(self, request):
        try:
            payload = reconcile_pending_wallet_topups(user=request.user)
        except PaymentValidationError as error:
            return Response({'error': str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except PaymentConfigError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as error:
            return Response(
                {'error': f'Unable to sync wallet top-ups: {error}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        summary='Get wallet overview',
        description='Get complete wallet data: earnings, campaign spending, and transactions. Includes active + soft-deleted submission data.',
        tags=['Earnings'],
    )
    @action(detail=False, methods=['get'], url_path='wallet')
    def wallet(self, request):
        """Get complete wallet overview including earnings and campaign spending"""
        user = request.user
        profile = user.profile if hasattr(user, 'profile') else None
        
        # Get earning side (from approved submissions, including soft-deleted)
        approved_submissions = CampaignSubmission.objects.filter(
            participant__clipper=user,
            status='approved',
        )

        earnings_totals = approved_submissions.aggregate(
            total_earnings=Sum('earning'),
            pending_earnings=Sum('pending_earning'),
        )
        total_earnings = float(earnings_totals['total_earnings'] or 0)
        
        # Breakdowns by campaign that the user has earned from
        campaign_rows = approved_submissions.values(
            'participant__campaign_id',
            'participant__campaign__name',
            'participant__campaign__creator__email',
        ).annotate(
            total_views=Sum('views'),
            clips=Count('id'),
            earned=Sum('earning'),
            pending_payout=Sum('pending_earning'),
        ).order_by('-earned', '-pending_payout')

        campaigns_clipping = [
            {
                'id': row['participant__campaign_id'],
                'title': row['participant__campaign__name'],
                'creator': row['participant__campaign__creator__email'],
                'views': int(row['total_views'] or 0),
                'clips': row['clips'] or 0,
                'earned': float(row['earned'] or 0),
                'pending_payout': float(row['pending_payout'] or 0),
            }
            for row in campaign_rows
        ]
        
        # Get spending side (creator brand campaigns or creator gigs)
        from content.models import Campaign
        user_type = getattr(user, 'type', None)
        user_campaigns = Campaign.objects.filter(
            creator=user,
            type='campaign' if user_type == 'brand' else 'gig',
        ).annotate(
            participant_count=Count('participants', distinct=True),
        ).values(
            'id', 'name', 'status', 'budget', 'paid_out', 'views',
            'remaining_funds_settled', 'participant_count',
        )

        campaigns_published = []
        total_spent = 0
        wallet_balance = float(profile.wallet_balance or 0) if profile else 0
        total_deposited = float(profile.total_deposited or 0) if profile else 0
        locked_in_campaigns = 0

        for campaign_entry in user_campaigns:
            spent = float(campaign_entry['paid_out'] or 0)
            total_spent += spent
            remaining = float(campaign_entry['budget'] or 0) - spent
            locked = max(0, remaining) if not campaign_entry.get('remaining_funds_settled', False) else 0
            locked_in_campaigns += locked

            campaigns_published.append({
                'id': campaign_entry['id'],
                'title': campaign_entry['name'],
                'status': campaign_entry['status'].title() if campaign_entry['status'] else 'Active',
                'budget': float(campaign_entry['budget'] or 0),
                'spent': spent,
                'views': int(campaign_entry['views'] or 0),
                'clippers': campaign_entry['participant_count'],
            })
        
        # Recent activity combines payment transactions with the two creator
        # activity sources that do not have a Transaction row: approved clip
        # earnings and budgets locked when the creator published a gig.
        recent_txns = Transaction.objects.filter(user=user).order_by('-created_at')[:50]
        transactions_data = list(TransactionSerializer(recent_txns, many=True).data)

        submission_activity = []
        recent_submissions = (
            approved_submissions
            .order_by('-created_at')[:50]
            .values('id', 'created_at', 'earning', 'participant__campaign__name')
        )
        for submission in recent_submissions:
            amount = Decimal(str(submission.get('earning') or '0'))
            if amount <= 0:
                continue
            campaign_name = submission.get('participant__campaign__name') or 'Gig payout'
            submission_activity.append({
                'id': f"submission-{submission['id']}",
                'amount': float(amount),
                'transactionType': 'Earning',
                'paymentMethod': 'Gig Payout',
                'paymentDetails': campaign_name,
                'status': 'completed',
                'external_ref': '',
                'contentTitle': campaign_name,
                'submissionId': submission['id'],
                'createdAt': submission['created_at'].isoformat() if submission.get('created_at') else None,
            })

        # Synthesize lock/settlement rows for campaigns created before
        # Transaction(lock/settlement) records existed.
        existing_refs = {
            (row.get('external_ref') or '')
            for row in transactions_data
            if row.get('external_ref')
        }
        campaign_activity = []
        owned_campaigns = Campaign.objects.filter(creator=user).values(
            'id',
            'name',
            'budget',
            'type',
            'created_at',
            'remaining_funds_settled',
            'remaining_funds_settled_amount',
            'remaining_funds_settled_at',
        )[:100]
        for campaign in owned_campaigns:
            lock_ref = f"campaign-lock-{campaign['id']}"
            if float(campaign['budget'] or 0) > 0 and lock_ref not in existing_refs:
                campaign_activity.append({
                    'id': f"campaign-lock-{campaign['id']}",
                    'amount': float(campaign['budget'] or 0),
                    'transactionType': 'Budget Lock',
                    'paymentMethod': 'Budget Lock',
                    'paymentDetails': f"Funds locked for {campaign['name']}",
                    'status': 'completed',
                    'external_ref': lock_ref,
                    'contentTitle': campaign['name'],
                    'submissionId': None,
                    'createdAt': campaign['created_at'].isoformat() if campaign.get('created_at') else None,
                })
            settle_ref = f"campaign-settle-{campaign['id']}"
            settled_amount = float(campaign.get('remaining_funds_settled_amount') or 0)
            if (
                campaign.get('remaining_funds_settled')
                and settled_amount > 0
                and settle_ref not in existing_refs
            ):
                settled_at = campaign.get('remaining_funds_settled_at') or campaign.get('created_at')
                campaign_activity.append({
                    'id': f"campaign-settle-{campaign['id']}",
                    'amount': settled_amount,
                    'transactionType': 'Campaign Settlement',
                    'paymentMethod': 'Wallet',
                    'paymentDetails': f"Remaining budget returned from {campaign['name']}",
                    'status': 'completed',
                    'external_ref': settle_ref,
                    'contentTitle': campaign['name'],
                    'submissionId': None,
                    'createdAt': settled_at.isoformat() if settled_at else None,
                })

        recent_activity = sorted(
            transactions_data + submission_activity + campaign_activity,
            key=lambda entry: entry.get('createdAt') or '',
            reverse=True,
        )[:50]
        
        available_earnings = float(get_available_withdrawable_earnings(user))
        pending_earnings = float(earnings_totals['pending_earnings'] or 0)
        total_withdrawn = float(get_total_withdrawn(user))

        # Chart source rows: earnings (as clipper) + spend (as campaign/gig owner).
        earning_events = list(
            approved_submissions
            .exclude(earning__isnull=True)
            .exclude(earning=0)
            .values('created_at', 'earning')[:2000]
        )
        spend_events = list(
            CampaignSubmission.objects.filter(
                participant__campaign__creator=user,
                status='approved',
            )
            .exclude(earning__isnull=True)
            .exclude(earning=0)
            .values('created_at', 'earning')[:2000]
        )

        def _month_labels(count, with_year=False):
            today = timezone.now().date()
            labels = []
            for i in range(count - 1, -1, -1):
                year = today.year
                month = today.month - i
                while month <= 0:
                    month += 12
                    year -= 1
                month_date = datetime(year, month, 1).date()
                labels.append({
                    'key': month_date.strftime('%Y-%m'),
                    'label': month_date.strftime('%b %y' if with_year else '%b'),
                })
            return labels

        def build_amount_period_series(events, filter_key):
            today = timezone.now().date()
            if filter_key == '7D':
                labels = [
                    {
                        'key': (today - timedelta(days=i)).isoformat(),
                        'label': (today - timedelta(days=i)).strftime('%d %b'),
                    }
                    for i in range(6, -1, -1)
                ]
                daily = True
            elif filter_key == '30D':
                labels = [
                    {
                        'key': (today - timedelta(days=i)).isoformat(),
                        'label': (today - timedelta(days=i)).strftime('%d %b'),
                    }
                    for i in range(29, -1, -1)
                ]
                daily = True
            elif filter_key == '3M':
                labels = _month_labels(3)
                daily = False
            elif filter_key == '6M':
                labels = _month_labels(6)
                daily = False
            else:
                labels = _month_labels(12, with_year=True)
                daily = False

            series = []
            for label in labels:
                bucket_amount = 0.0
                for row in events:
                    created_at = row.get('created_at')
                    if not created_at:
                        continue
                    created_date = created_at.date() if hasattr(created_at, 'date') else created_at
                    if daily:
                        bucket_match = created_date.isoformat() == label['key']
                    else:
                        bucket_match = created_date.strftime('%Y-%m') == label['key']
                    if bucket_match:
                        bucket_amount += float(row.get('earning') or 0)
                # month key kept for EarningsAreaChart; period for Brand spend chart.
                series.append({
                    'month': label['label'],
                    'period': label['label'],
                    'amount': round(bucket_amount, 2),
                })
            return series

        period_keys = ('7D', '30D', '3M', '6M', 'ALL')
        earnings_by_period = {
            key: build_amount_period_series(earning_events, key)
            for key in period_keys
        }
        spend_by_period = {
            key: build_amount_period_series(spend_events, key)
            for key in period_keys
        }

        # Convenience monthly series (last 12 months) for simple chart consumers.
        earnings_monthly = build_amount_period_series(earning_events, 'ALL')
        spend_monthly = build_amount_period_series(spend_events, 'ALL')

        return Response({
            # Earnings side
            'total_earnings': total_earnings,
            'available_earnings': available_earnings,
            'pending_rewards': pending_earnings,
            'total_withdrawn': total_withdrawn,
            'campaigns_clipping': campaigns_clipping,
            # Campaign wallet side
            'wallet_balance': wallet_balance,
            'locked_in_campaigns': locked_in_campaigns,
            'total_spent': total_spent,
            'total_deposited': total_deposited,
            'campaigns_published': campaigns_published,
            'earnings_by_period': earnings_by_period,
            'spend_by_period': spend_by_period,
            # Monthly series
            'earnings_monthly': earnings_monthly,
            'spend_monthly': spend_monthly,
            # Recent transactions
            'recent_transactions': recent_activity,
        })

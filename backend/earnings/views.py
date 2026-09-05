from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Q, F, Count
from django.db.models.functions import TruncMonth
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction as db_transaction
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .serializers import PayoutSerializer, TransactionSerializer
from .models import Transaction
from accounts.models import Profile
from content.models import CampaignSubmission

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

                if profile.total_earnings < amount:
                    return Response(
                        {"error": f"Insufficient balance. Your earnings: ₹{profile.total_earnings}"},
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

                Transaction.objects.create(
                    user=request.user,
                    amount=amount,
                    transaction_type='withdrawal',
                    payment_method=payout_method,
                    payment_details=payment_details,
                    status='pending',
                    external_ref=external_ref,
                )

                Profile.objects.filter(user=request.user).update(
                    total_earnings=F('total_earnings') - amount
                )
                profile.refresh_from_db()
                from notifications.helpers import notify_user_event
                notify_user_event(
                    user_id=request.user.id,
                    event_type='earnings.withdrawal_requested',
                    title='Withdrawal requested',
                    message=f'Your withdrawal request for ₹{amount} is pending review.',
                    category='earnings',
                    entity_type='transaction',
                    entity_id=None,
                    payload={'amount': str(amount), 'payment_method': payout_method},
                    email=True,
                    idempotency_key=f'earnings.withdrawal_requested:{request.user.id}:{external_ref}:{amount}',
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

        return Response({
            "status": "Success",
            "message": "Withdrawal requested. Processing takes 3 business days.",
            "amount": float(amount),
            "remaining_balance": float(profile.total_earnings)
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

        available_balance = max(Decimal('0.00'), settled_earnings)
        if float(available_balance) == 0 and float(campaign_submission_earnings) > 0:
            available_balance = campaign_submission_earnings

        # Calculate withdrawals
        total_withdrawals = transaction_totals['total_withdrawals'] or Decimal('0.00')
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

        gig_activity = []
        creator_gigs = Campaign.objects.filter(
            creator=user,
            type='gig',
            budget__gt=0,
        ).values('id', 'name', 'budget', 'created_at')[:50]
        for gig in creator_gigs:
            gig_activity.append({
                'id': f"gig-budget-{gig['id']}",
                'amount': float(gig['budget'] or 0),
                'transactionType': 'Locked',
                'paymentMethod': 'Budget Lock',
                'paymentDetails': f"Funds locked for {gig['name']}",
                'status': 'completed',
                'external_ref': '',
                'contentTitle': gig['name'],
                'submissionId': None,
                'createdAt': gig['created_at'].isoformat() if gig.get('created_at') else None,
            })

        recent_activity = sorted(
            transactions_data + submission_activity + gig_activity,
            key=lambda entry: entry.get('createdAt') or '',
            reverse=True,
        )[:50]
        
        # Monthly earnings breakdown (last 6 months, including soft-deleted)
        monthly_totals = {
            row['month'].strftime('%Y-%m'): float(row['amount'] or 0)
            for row in approved_submissions.annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(amount=Sum('earning'))
            if row['month']
        }
        
        monthly_earnings = []
        current_month = timezone.now().date().replace(day=1)
        for offset in range(5, -1, -1):
            year = current_month.year
            month = current_month.month - offset
            while month <= 0:
                month += 12
                year -= 1
            month_date = datetime(year, month, 1)
            month_label = month_date.strftime('%b')
            month_key = f"{year}-{month:02d}"
            monthly_earnings.append({
                'month': month_label,
                'amount': monthly_totals.get(month_key, 0.0),
            })
        
        # Get available balance for withdrawal
        available_earnings = total_earnings
        pending_earnings = float(earnings_totals['pending_earnings'] or 0)
        
        total_withdrawn = float(profile.total_withdrawn or 0) if profile else 0
        
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
            # Monthly earnings
            'earnings_monthly': monthly_earnings,
            # Recent transactions
            'recent_transactions': recent_activity,
        })
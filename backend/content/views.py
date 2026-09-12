# content/views.py
import json
import uuid

from dotenv import load_dotenv
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.exceptions import ValidationError, NotFound
from supabase import create_client
from decimal import Decimal

from .models import ClipSubmission, Content, Bid, Campaign, CampaignParticipant, CampaignSubmission
from .access_tokens import create_participant_access_token, resolve_participant_access_token

from .serializers import ContentSerializer, BidSerializer, ClipSubmissionSerializer
from .serializers import CampaignSerializer, CampaignSummarySerializer, CampaignParticipantSerializer, CampaignSubmissionSerializer

from earnings.models import Transaction
from .tasks import process_bot_metrics
from django.db import transaction as db_transaction
from django.db.models import F, Count, Exists, OuterRef, Value, BooleanField, Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta


import os
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

supabase = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)


class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Campaign.objects.select_related('creator', 'creator__profile')
        is_summary = self.action == 'list' and self.request.query_params.get('summary') == 'true'
        if not is_summary:
            queryset = queryset.prefetch_related('resources')
        
        if self.action == 'list':
            scope = self.request.query_params.get('scope', '')
            filter_type = self.request.query_params.get('type', '')  # Filter by 'campaign' or 'gig'
            
            if scope == 'marketplace':
                # Marketplace shows both active campaigns and gigs
                queryset = queryset.filter(status__in=['active', 'available']).order_by('-created_at')
                
                # Filter by type if specified
                if filter_type in ['campaign', 'gig']:
                    queryset = queryset.filter(type=filter_type)
                return queryset
            
            # For authenticated users viewing their own content
            if getattr(self.request.user, 'type', None) in {'brand', 'creator'}:
                return queryset.filter(creator=self.request.user).order_by('-created_at')
            
            # Default: show active campaigns and gigs
            return queryset.filter(status__in=['active', 'available']).order_by('-created_at')
        
        if self.action != 'list':
            queryset = queryset.prefetch_related('participants')
        return queryset

    def get_serializer_class(self):
        if self.request.query_params.get('summary') == 'true' and self.action in {'list', 'my_gigs'}:
            return CampaignSummarySerializer
        return CampaignSerializer

    def perform_create(self, serializer):
        user_type = getattr(self.request.user, 'type', 'creator')
        from accounts.models import Profile

        with db_transaction.atomic():
            locked_profile = Profile.objects.select_for_update().get(user_id=self.request.user.id)
            budget = Decimal(str(serializer.validated_data.get('budget') or 0))
            if user_type in {'brand', 'creator'} and budget > locked_profile.wallet_balance:
                raise ValidationError({'budget': 'Insufficient wallet balance. Add funds or lower the campaign budget.'})

            # Brands create campaigns, creators create gigs.
            campaign = serializer.save(
                creator=self.request.user,
                type='campaign' if user_type in {'brand', 'creator'} and user_type == 'brand' else 'gig' if user_type == 'creator' else 'campaign',
            )
            if budget > 0 and user_type in {'brand', 'creator'}:
                Profile.objects.filter(pk=locked_profile.pk).update(
                    wallet_balance=F('wallet_balance') - budget
                )

        if campaign.status in ('active', 'available'):
            from notifications.helpers import notify_users_event
            recipient_ids = list(
                self.request.user.__class__.objects.filter(type__in=('creator', 'clipper'))
                .exclude(pk=self.request.user.pk)
                .values_list('id', flat=True)
            )
            notify_users_event(
                user_ids=recipient_ids,
                event_type='content.campaign_published',
                title=f'New {campaign.type} published',
                message=f'{campaign.name} is now available to join.',
                category='content',
                entity_type='campaign',
                entity_id=None,
                payload={'campaign_id': campaign.id, 'campaign_type': campaign.type},
                idempotency_key=f'content.campaign_published:{campaign.id}',
            )

    def perform_update(self, serializer):
        previous = self.get_object()
        previous_status = previous.status
        campaign = serializer.save()
        changed_fields = set(serializer.validated_data)
        if not changed_fields and previous_status == campaign.status:
            return

        from notifications.helpers import notify_user_event, notify_users_event
        if previous_status != campaign.status and campaign.status == 'closed':
            if campaign.creator.type == 'brand':
                notify_user_event(
                    user_id=campaign.creator_id,
                    event_type='content.campaign_completed',
                    title='Campaign completed',
                    message=f'{campaign.name} has completed.',
                    category='content',
                    entity_type='campaign',
                    payload={'campaign_id': campaign.id, 'reason': 'closed'},
                    idempotency_key=f'content.campaign_completed:{campaign.id}',
                )
            participant_ids = campaign.participants.values_list('clipper_id', flat=True)
            notify_users_event(
                user_ids=list(participant_ids),
                event_type='content.joined_campaign_closed',
                title=f'{campaign.type.title()} closed',
                message=f'{campaign.name} is now closed.',
                category='content',
                entity_type='campaign',
                entity_id=None,
                payload={'campaign_id': campaign.id},
                idempotency_key=f'content.joined_campaign_closed:{campaign.id}',
            )
        elif previous_status in ('active', 'available') and campaign.status in ('active', 'available') and changed_fields:
            participant_ids = campaign.participants.values_list('clipper_id', flat=True)
            notify_users_event(
                user_ids=list(participant_ids),
                event_type='content.joined_campaign_changed',
                title=f'{campaign.type.title()} updated',
                message=f'{campaign.name} has new changes.',
                category='content',
                entity_type='campaign',
                entity_id=None,
                payload={'campaign_id': campaign.id, 'changed_fields': sorted(changed_fields)},
                idempotency_key=f'content.joined_campaign_changed:{campaign.id}:{campaign.updated_at.isoformat()}',
            )

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        queryset = Campaign.objects.select_related('creator', 'creator__profile').prefetch_related('resources', 'participants')
        if str(lookup).isdigit():
            obj = get_object_or_404(queryset, pk=lookup)
        else:
            try:
                access_key = uuid.UUID(str(lookup))
            except (ValueError, TypeError, AttributeError):
                raise NotFound()
            obj = get_object_or_404(queryset, public_access_key=access_key)

        # Access-key URLs are used by both event owners and joined
        # participants. Authorization below restricts every other user.
        if obj.creator == self.request.user or CampaignParticipant.objects.filter(campaign=obj, clipper=self.request.user).exists():
            self.check_object_permissions(self.request, obj)
            return obj
        if obj.status in ['active', 'available']:
            self.check_object_permissions(self.request, obj)
            return obj
        raise NotFound()

    def _require_owner(self, campaign):
        if campaign.creator_id != self.request.user.id:
            return Response({'error': 'Only the event owner can manage this campaign or gig.'}, status=status.HTTP_403_FORBIDDEN)
        return None

    @staticmethod
    def _get_participant(campaign, participant_key):
        # Retain numeric support for existing API consumers, but new UI URLs
        # always use the encrypted, campaign-scoped participant token.
        if str(participant_key).isdigit():
            clipper_id = int(participant_key)
        else:
            clipper_id = resolve_participant_access_token(campaign, participant_key)

        if not clipper_id:
            raise NotFound('Participant not found.')

        return get_object_or_404(
            CampaignParticipant.objects.select_related('clipper__profile'),
            campaign=campaign,
            clipper_id=clipper_id,
        )

    @action(detail=True, methods=['post'], url_path='close')
    def close(self, request, pk=None):
        campaign = self.get_object()
        denied = self._require_owner(campaign)
        if denied:
            return denied
        if campaign.status == 'closed':
            return Response(self.get_serializer(campaign).data)
        campaign.status = 'closed'
        campaign.closure_reason = 'manual'
        campaign.remaining_funds_settled = False
        campaign.remaining_funds_settled_amount = Decimal('0')
        campaign.remaining_funds_settled_at = None
        campaign.save(update_fields=['status', 'closure_reason', 'remaining_funds_settled', 'remaining_funds_settled_amount', 'remaining_funds_settled_at', 'updated_at'])
        return Response(self.get_serializer(campaign).data)

    @action(detail=True, methods=['post'], url_path='extend-deadline')
    def extend_deadline(self, request, pk=None):
        campaign = self.get_object()
        denied = self._require_owner(campaign)
        if denied:
            return denied
        
        # Validate settlement conditions
        if campaign.status != 'closed':
            return Response({'error': 'Only closed campaigns/gigs can have their deadline extended.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if campaign.closure_reason == 'budget':
            return Response({'error': 'This campaign was closed due to budget exhaustion and cannot be extended. Create a new campaign instead.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if campaign.remaining_funds_settled:
            return Response({'error': 'This campaign has already been settled and cannot be reopened.'}, status=status.HTTP_400_BAD_REQUEST)
        
        remaining = max(Decimal(campaign.budget or 0) - Decimal(campaign.paid_out or 0), Decimal('0'))
        if remaining <= 0:
            return Response({'error': 'No remaining budget to extend.'}, status=status.HTTP_400_BAD_REQUEST)
        
        end_date = request.data.get('endDate') or request.data.get('end_date')
        if not end_date:
            return Response({'error': 'A new deadline is required.'}, status=status.HTTP_400_BAD_REQUEST)
        from datetime import date
        try:
            parsed_date = date.fromisoformat(str(end_date))
        except ValueError:
            return Response({'error': 'Deadline must use YYYY-MM-DD format.'}, status=status.HTTP_400_BAD_REQUEST)
        if parsed_date <= date.today():
            return Response({'error': 'The new deadline must be in the future.'}, status=status.HTTP_400_BAD_REQUEST)
        campaign.end_date = parsed_date
        campaign.status = 'active'
        campaign.closure_reason = ''
        campaign.remaining_funds_settled = False
        campaign.save(update_fields=['end_date', 'status', 'closure_reason', 'remaining_funds_settled', 'updated_at'])
        return Response(self.get_serializer(campaign).data)

    @action(detail=True, methods=['post'], url_path='transfer-remaining-funds')
    def transfer_remaining_funds(self, request, pk=None):
        campaign = self.get_object()
        denied = self._require_owner(campaign)
        if denied:
            return denied
        
        # Validate settlement conditions
        if campaign.status != 'closed':
            return Response({'error': 'Only closed campaigns/gigs can have remaining funds transferred.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if campaign.closure_reason == 'budget':
            return Response({'error': 'This campaign was closed due to budget exhaustion and requires no settlement. Create a new campaign instead.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if campaign.remaining_funds_settled:
            return Response({'error': 'Remaining funds have already been settled.'}, status=status.HTTP_400_BAD_REQUEST)
        
        remaining = max(Decimal(campaign.budget or 0) - Decimal(campaign.paid_out or 0), Decimal('0'))
        if remaining <= 0:
            return Response({'error': 'No remaining budget to transfer.'}, status=status.HTTP_400_BAD_REQUEST)
        
        from accounts.models import Profile
        with db_transaction.atomic():
            Profile.objects.filter(user_id=campaign.creator_id).update(
                wallet_balance=F('wallet_balance') + remaining,
            )
            campaign.remaining_funds_settled = True
            campaign.remaining_funds_settled_amount = remaining
            campaign.remaining_funds_settled_at = timezone.now()
            campaign.save(update_fields=['remaining_funds_settled', 'remaining_funds_settled_amount', 'remaining_funds_settled_at', 'updated_at'])
        return Response({'status': 'success', 'amount': float(remaining), 'campaign': self.get_serializer(campaign).data})

    @action(detail=False, methods=['get'], url_path='marketplace')
    def marketplace(self, request):
        """List active campaigns and gigs in marketplace"""
        queryset = self.filter_queryset(self.get_queryset()).filter(status__in=['active', 'available'])
        filter_type = request.query_params.get('type', '')
        
        if filter_type in ['campaign', 'gig']:
            queryset = queryset.filter(type=filter_type)
        
        serializer = self.get_serializer(queryset.order_by('-created_at'), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-campaigns')
    def my_campaigns(self, request):
        """List campaigns created by the current brand user"""
        if getattr(request.user, 'type', None) != 'brand':
            return Response({'error': 'Only brands can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = Campaign.objects.filter(creator=request.user, type='campaign').order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='admin-dashboard', permission_classes=[IsAdminUser])
    def admin_dashboard(self, request):
        """Return database-backed summary metrics and recent admin activity."""
        from django.db.models import Q, Sum
        from django.utils import timezone
        from datetime import timedelta
        from support.models import SupportTicket
        from earnings.models import Transaction

        submissions = CampaignSubmission.objects.filter(is_deleted=False)
        pending_submissions = submissions.filter(status='pending').count()
        pending_payouts = submissions.filter(status='approved', pending_earning__gt=0)
        pending_payout_amount = pending_payouts.aggregate(total=Sum('pending_earning'))['total'] or Decimal('0')
        paid_out = submissions.filter(status='approved').aggregate(total=Sum('earning'))['total'] or Decimal('0')
        open_tickets = SupportTicket.objects.filter(status__in=['open', 'in_progress'])

        activity = []
        for submission in submissions.select_related('participant__campaign', 'participant__clipper').order_by('-updated_at')[:10]:
            action = 'Approved' if submission.status == 'approved' else 'Rejected' if submission.status == 'rejected' else 'New'
            activity.append({
                'text': f'{action} submission from {submission.participant.clipper.email} - {submission.participant.campaign.name}',
                'timestamp': submission.updated_at,
                'tone': 'emerald' if submission.status == 'approved' else 'rose' if submission.status == 'rejected' else 'amber',
            })
        for ticket in SupportTicket.objects.order_by('-created_at')[:5]:
            activity.append({
                'text': f'New support ticket: "{ticket.subject}"',
                'timestamp': ticket.created_at,
                'tone': 'amber',
            })
        for transaction in Transaction.objects.filter(transaction_type='withdrawal', status='completed').select_related('user').order_by('-updated_at')[:5]:
            activity.append({
                'text': f'Released ₹{transaction.amount} payout to {transaction.user.email}',
                'timestamp': transaction.updated_at,
                'tone': 'emerald',
            })
        activity.sort(key=lambda item: item['timestamp'], reverse=True)

        return Response({
            'pending_submissions': pending_submissions,
            'pending_payout_amount': float(pending_payout_amount),
            'pending_payout_clippers': pending_payouts.values('participant__clipper_id').distinct().count(),
            'paid_out': float(paid_out),
            'open_support_tickets': open_tickets.count(),
            'urgent_support_tickets': open_tickets.filter(priority='urgent').count(),
            'recent_activity': [
                {'text': item['text'], 'timestamp': item['timestamp'], 'tone': item['tone']}
                for item in activity[:8]
            ],
            'generated_at': timezone.now(),
        })

    @action(detail=False, methods=['post'], url_path='admin-scrape-insights', permission_classes=[IsAdminUser])
    def admin_scrape_insights(self, request):
        """Scrape and persist insights for active campaign submissions in batches of 20."""
        try:
            from .scraper_service import scrape_active_campaign_submissions
            result = scrape_active_campaign_submissions()
        except (ImportError, ModuleNotFoundError) as error:
            return Response(
                {'error': f'Scraper dependencies are not installed: {error}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ValueError as error:
            return Response({'error': str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as error:
            return Response(
                {'error': f'Insight extraction failed: {error}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='my-gigs')
    def my_gigs(self, request):
        """List gigs created by the current creator user"""
        if getattr(request.user, 'type', None) != 'creator':
            return Response({'error': 'Only creators can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = Campaign.objects.select_related(
            'creator', 'creator__profile'
        ).filter(creator=request.user, type='gig').order_by('-created_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        """Join a campaign or gig as a clipper"""
        campaign = self.get_object()
        user_type = getattr(request.user, 'type', '')

        with db_transaction.atomic():
            campaign = Campaign.objects.select_for_update().get(pk=campaign.pk)

            if user_type == 'brand':
                return Response({'error': 'Brand accounts cannot join campaigns or gigs.'}, status=status.HTTP_403_FORBIDDEN)

            if campaign.creator_id == request.user.id:
                return Response({'error': 'You cannot join your own campaign or gig.'}, status=status.HTTP_400_BAD_REQUEST)

            # Refresh campaign status while holding the campaign lock.
            campaign.refresh_status_from_state()

            allowed_statuses = ['active'] if campaign.type == 'campaign' else ['active', 'available']
            if campaign.status not in allowed_statuses:
                closure_reason = campaign.closure_reason or 'unknown'
                if closure_reason == 'budget':
                    error_msg = 'This campaign/gig has reached its budget limit and is no longer accepting participants.'
                elif closure_reason == 'deadline':
                    error_msg = 'This campaign/gig deadline has passed and is no longer accepting participants.'
                else:
                    error_msg = 'This campaign/gig is not accepting new participants right now.'
                return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

            existing = CampaignParticipant.objects.filter(campaign=campaign, clipper=request.user).first()
            if existing:
                return Response({
                    'error': 'You have already joined this campaign/gig.',
                    'joined': False,
                    'campaignId': campaign.id,
                    'participantId': existing.id,
                }, status=status.HTTP_400_BAD_REQUEST)

            participant = CampaignParticipant.objects.create(campaign=campaign, clipper=request.user)

            return Response({
                'status': 'success',
                'joined': True,
                'campaignId': campaign.id,
                'participantId': participant.id,
                'message': f'Joined {campaign.type} successfully.'
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit-clip')
    @db_transaction.atomic
    def submit_clip(self, request, pk=None):
        """Submit a clip for a campaign or gig"""
        campaign = self.get_object()
        campaign = Campaign.objects.select_for_update().get(pk=campaign.pk)
        participant = CampaignParticipant.objects.select_for_update().filter(campaign=campaign, clipper=request.user).first()
        if not participant:
            return Response({
                'error': f'You must join this {campaign.type} before submitting a clip.'
            }, status=status.HTTP_403_FORBIDDEN)

        platform = (request.data.get('platform') or request.data.get('socialPlatform') or '').strip().lower()
        if platform == 'x':
            platform = 'twitter'
        username = (request.data.get('username') or request.data.get('platformUsername') or '').strip()
        content_url = (request.data.get('url') or request.data.get('contentUrl') or request.data.get('postUrl') or '').strip()

        valid_platforms = [choice[0] for choice in ClipSubmission.PLATFORM_CHOICES]
        if not platform or platform not in valid_platforms:
            return Response({
                'error': f"Invalid platform '{platform or 'empty'}'. Must be one of: {', '.join(valid_platforms)}",
                'valid_platforms': valid_platforms,
            }, status=status.HTTP_400_BAD_REQUEST)

        allowed_platforms = []
        if isinstance(campaign.platforms, list):
            allowed_platforms = [str(item).strip().lower() for item in campaign.platforms if str(item).strip()]
        elif isinstance(campaign.platforms, str) and campaign.platforms.strip():
            allowed_platforms = [campaign.platforms.strip().lower()]
        allowed_platforms = ['twitter' if item == 'x' else item for item in allowed_platforms]

        if allowed_platforms and platform not in allowed_platforms:
            return Response({
                'error': f"Platform '{platform}' is not allowed for this campaign.",
                'allowed_platforms': allowed_platforms,
            }, status=status.HTTP_400_BAD_REQUEST)

        cooldown_info = participant.get_cooldown_info()
        if cooldown_info['is_in_cooldown']:
            return Response({
                'error': f'You must wait before submitting your next clip. Cooling period active for {cooldown_info["hours_remaining"]:.1f} more hours.',
                'cooldown_ends_at': cooldown_info['cooldown_ends_at'],
                'hours_remaining': cooldown_info['hours_remaining'],
                'last_submission_status': cooldown_info.get('last_submission_status'),
            }, status=status.HTTP_400_BAD_REQUEST)

        # Refresh campaign status based on deadline or budget exhaustion
        campaign.refresh_status_from_state()

        # Check if campaign is closed
        if campaign.status == 'closed':
            closure_reason = campaign.closure_reason or 'unknown'
            if closure_reason == 'budget':
                error_msg = 'This campaign has reached its budget limit. No new submissions are being accepted.'
            elif closure_reason == 'deadline':
                error_msg = 'This campaign has ended. No new submissions are being accepted.'
            else:
                error_msg = 'This campaign has been closed. No new submissions are being accepted.'
            
            return Response({
                'error': error_msg,
                'campaign_status': campaign.status,
                'closure_reason': closure_reason,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check max earnings cap
        max_earnings = float(campaign.max_earnings or 0)
        if max_earnings > 0:
            # Get total committed earnings for this participant (approved + pending)
            existing_earnings = float(participant.get_total_committed_earnings() or 0)
            remaining_capacity = max_earnings - existing_earnings
            
            if remaining_capacity <= 0:
                return Response({
                    'error': f'This campaign has reached its maximum earning capacity (₹{max_earnings:,.0f}). No new submissions can be added.',
                    'max_earnings': max_earnings,
                    'current_earnings': existing_earnings,
                    'remaining_capacity': remaining_capacity,
                }, status=status.HTTP_400_BAD_REQUEST)

        if not username:
            return Response({'error': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not content_url:
            return Response({'error': 'Video URL is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.validators import URLValidator
        from django.core.exceptions import ValidationError as DjangoValidationError

        validator = URLValidator()
        try:
            validator(content_url)
        except DjangoValidationError:
            return Response({'error': 'Please provide a valid URL for the submitted clip.'}, status=status.HTTP_400_BAD_REQUEST)

        # Only check for active (not soft-deleted) submissions with same URL
        if participant.submissions.filter(content_url=content_url, is_deleted=False).exists():
            return Response({'error': 'This clip has already been submitted for this campaign.'}, status=status.HTTP_400_BAD_REQUEST)

        submission = CampaignSubmission.objects.create(
            participant=participant,
            platform=platform,
            platform_username=username,
            content_url=content_url,
            status='pending',
        )
        from notifications.helpers import notify_admins_event
        notify_admins_event(
            event_type='content.submission_pending_review',
            title='New submission awaiting review',
            message=f'{request.user.email} submitted a clip for {campaign.name}.',
            category='content',
            entity_type='campaign_submission',
            payload={'submission_id': submission.id, 'campaign_id': campaign.id},
            idempotency_key=f'content.submission_pending_review:{submission.id}',
        )

        return Response({
            'status': 'success',
            'message': 'Clip submitted successfully.',
            'submission': {
                'id': submission.id,
                'campaign': campaign.name,
                'platform': submission.get_platform_display(),
                'platformUsername': submission.platform_username,
                'contentUrl': submission.content_url,
                'status': submission.status.title(),
                'views': submission.views,
                'earning': float(submission.earning or 0),
                'pendingEarning': float(submission.pending_earning or 0),
            }
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='submission-info')
    def submission_info(self, request, pk=None):
        """Get campaign submission info for the submit dialog (platforms, cooling period, etc)"""
        campaign = self.get_object()
        participant = CampaignParticipant.objects.filter(campaign=campaign, clipper=request.user).first()
        
        if not participant:
            return Response({
                'error': f'You must join this {campaign.type} before submitting a clip.',
                'joined': False,
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Refresh campaign status based on deadline or budget exhaustion
        campaign.refresh_status_from_state()
        
        # Get allowed platforms
        allowed_platforms = []
        if isinstance(campaign.platforms, list):
            allowed_platforms = [str(item).strip().lower() for item in campaign.platforms if str(item).strip()]
        elif isinstance(campaign.platforms, str) and campaign.platforms.strip():
            allowed_platforms = [campaign.platforms.strip().lower()]
        
        # Map lowercase to display format
        platform_display_map = {
            'instagram': 'Instagram',
            'youtube': 'YouTube',
            'facebook': 'Facebook',
            'x': 'X',
            'twitter': 'X',
            'tiktok': 'TikTok',
        }
        allowed_platforms_display = [platform_display_map.get(p, p.title()) for p in allowed_platforms]
        
        # Get cooling period info
        cooldown_info = participant.get_cooldown_info()
        
        # Get max earnings and current earnings info
        max_earnings = float(campaign.max_earnings or 0)
        current_earnings = float(participant.get_total_committed_earnings() or 0)
        remaining_capacity = max_earnings - current_earnings if max_earnings > 0 else float('inf')
        
        return Response({
            'campaignId': campaign.id,
            'campaignName': campaign.name,
            'campaignType': campaign.type,
            'allowedPlatforms': allowed_platforms_display,
            'joined': True,
            'cooldown': cooldown_info,
            'campaign': {
                'status': campaign.status,
                'endDate': campaign.end_date.isoformat() if campaign.end_date else None,
                'maxEarnings': max_earnings,
                'currentEarnings': current_earnings,
                'remainingCapacity': remaining_capacity if max_earnings > 0 else None,
                'isClosed': campaign.status == 'closed',
            }
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='clipper-gigs')
    def clipper_gigs(self, request):
        summary_only = request.query_params.get('summary') == 'true'
        participants = (
            CampaignParticipant.objects.filter(clipper=request.user)
            .select_related('campaign', 'campaign__creator')
        )
        if summary_only:
            participants = participants.annotate(
                aggregated_earnings=Sum(
                    'submissions__earning',
                    filter=Q(submissions__status='approved'),
                ),
                aggregated_submission_count=Count('submissions', distinct=True),
            )
        else:
            participants = participants.prefetch_related('submissions')

        if request.query_params.get('count_only') == 'true':
            return Response({'count': participants.count()})

        rows = []
        for participant in participants:
            campaign = participant.campaign
            
            # Refresh campaign status based on deadline or budget exhaustion
            campaign.refresh_status_from_state()
            
            if summary_only:
                pending_earnings = 0
                total_earnings = participant.aggregated_earnings or 0
                total_submissions = participant.aggregated_submission_count or 0
            else:
                # Ensure the latest approved submission earnings are recalculated before computing totals.
                for submission in participant.submissions.filter(status='approved'):
                    try:
                        submission.update_earning()
                    except Exception:
                        pass

                pending_earnings = participant.submissions.aggregate(total=Sum('pending_earning'))['total'] or 0
                total_earnings = participant.get_total_earnings() or 0
                total_submissions = participant.submissions.count()
            rows.append({
                'id': campaign.id,
                'accessKey': str(campaign.public_access_key),
                'name': campaign.name,
                'brandName': campaign.brand_name or '',
                'status': campaign.status.title() if campaign.status else 'Unknown',
                'rewardPool': float(campaign.budget or 0),
                'usedBudget': float(campaign.paid_out or 0),
                'myEarnings': float(total_earnings),
                'pendingPayout': float(pending_earnings or 0),
                'deadline': campaign.end_date.isoformat() if campaign.end_date else None,
                'totalSubmissions': total_submissions,
                'platforms': campaign.platforms if isinstance(campaign.platforms, list) else ([campaign.platforms] if campaign.platforms else []),
                'thumbnail': campaign.thumbnail_url or None,
                'description': campaign.description or '',
                'requirements': campaign.clipper_requirements or '',
                'category': campaign.category or '',
                'rewardPer1k': float(campaign.reward_per_1k or 0),
                'maxEarnings': float(campaign.max_earnings or 0),
            })

        return Response(rows)

    @action(detail=True, methods=['get'], url_path='joined-gig')
    def joined_gig(self, request, pk=None):
        campaign_queryset = Campaign.objects.select_related('creator', 'creator__profile').prefetch_related('resources', 'participants')
        if str(pk).isdigit():
            campaign = get_object_or_404(campaign_queryset, pk=pk)
        else:
            try:
                access_key = uuid.UUID(str(pk))
            except (ValueError, TypeError, AttributeError):
                raise NotFound()
            campaign = get_object_or_404(campaign_queryset, public_access_key=access_key)
        participant = CampaignParticipant.objects.filter(campaign=campaign, clipper=request.user).select_related('campaign').first()
        if not participant:
            raise NotFound('You are not a participant in this joined gig.')

        for submission in participant.submissions.filter(status='approved'):
            try:
                submission.update_earning()
            except Exception:
                pass

        submission_stats = participant.submissions.aggregate(
            total_earnings=Sum('earning', filter=Q(status='approved')),
            pending_earnings=Sum('pending_earning'),
            total=Count('id'),
            approved=Count('id', filter=Q(status='approved')),
            pending=Count('id', filter=Q(status='pending', is_deleted=False)),
            rejected=Count('id', filter=Q(status='rejected', is_deleted=False)),
        )
        requirements = campaign.clipper_requirements or []
        if isinstance(requirements, str):
            requirements = [requirements]
        elif requirements is None:
            requirements = []

        resources = [
            {'id': resource.id, 'name': resource.name, 'url': resource.url}
            for resource in campaign.resources.order_by('order', 'created_at')
        ]

        allowed_platforms = []
        if isinstance(campaign.platforms, list):
            allowed_platforms = [str(item).strip().lower() for item in campaign.platforms if str(item).strip()]
        elif isinstance(campaign.platforms, str) and campaign.platforms.strip():
            allowed_platforms = [campaign.platforms.strip().lower()]

        cooldown_until = None
        if participant.is_in_48hour_cooldown():
            from django.utils import timezone
            from datetime import timedelta
            last_approved = participant.get_last_approved_submission()
            if last_approved:
                cooldown_until = (last_approved.updated_at + timedelta(hours=48)).isoformat()

        payload = {
            'id': campaign.id,
            'accessKey': str(campaign.public_access_key),
            'name': campaign.name,
            'brandName': campaign.brand_name or getattr(campaign.creator, 'profile', None).brand_name if getattr(campaign.creator, 'profile', None) and getattr(campaign.creator.profile, 'brand_name', None) else 'Brand',
            'status': campaign.status.title() if campaign.status else 'Unknown',
            'rewardPool': float(campaign.budget or 0),
            'usedBudget': float(campaign.paid_out or 0),
            'myEarnings': float(submission_stats['total_earnings'] or 0),
            'pendingPayout': float(submission_stats['pending_earnings'] or 0),
            'deadline': campaign.end_date.isoformat() if campaign.end_date else None,
            'totalSubmissions': submission_stats['total'] or 0,  # Include deleted for total accuracy
            'platforms': campaign.platforms if isinstance(campaign.platforms, list) else ([campaign.platforms] if campaign.platforms else []),
            'thumbnail': campaign.thumbnail_url or None,
            'description': campaign.description or '',
            'requirements': requirements,
            'resources': resources,
            'category': campaign.category or '',
            'rewardPer1k': float(campaign.reward_per_1k or 0),
            'maxEarnings': float(campaign.max_earnings or 0),
            'maxCreatorEarnings': float(campaign.max_earnings or 0),
            'creator': campaign.creator.email or '',
            'performance': {
                'submitted': submission_stats['total'] or 0,  # Include deleted
                'approved': submission_stats['approved'] or 0,  # Include deleted
                'pending': submission_stats['pending'] or 0,  # Exclude deleted (still pending)
                'rejected': submission_stats['rejected'] or 0,  # Exclude deleted (rejected)
            },
            'allowedPlatforms': allowed_platforms,
            'cooldownUntil': cooldown_until,
            'submissionCooldownActive': bool(cooldown_until),
            'earningRate': f"₹{campaign.reward_per_1k} per 1,000 valid views" if campaign.reward_per_1k else '—',
        }

        return Response(payload)

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        """Return brand-level analytics based on all approved submissions, including soft-deleted rows."""
        user = request.user
        approved_submissions = CampaignSubmission.objects.filter(
            participant__campaign__creator=user,
            status='approved'
        )

        total_views = approved_submissions.aggregate(total=Sum('views'))['total'] or 0
        total_earnings = approved_submissions.aggregate(
            total=Sum(F('earning') + F('pending_earning'))
        )['total'] or 0

        platform_rows = list(
            approved_submissions.values('platform').annotate(total_views=Sum('views')).order_by('-total_views')
        )
        total_platform_views = sum(int(row['total_views'] or 0) for row in platform_rows)
        platform_breakdown = []
        if platform_rows:
            max_views = max(int(row['total_views'] or 0) for row in platform_rows)
            platform_name_lookup = {
                choice[0]: choice[1] for choice in CampaignSubmission._meta.get_field('platform').choices
            }
            for row in platform_rows:
                views = int(row['total_views'] or 0)
                platform_breakdown.append({
                    'platform': platform_name_lookup.get(row['platform'], str(row['platform'] or '').title()),
                    'views': views,
                    'percent': round((views / total_platform_views) * 100, 1) if total_platform_views else 0,
                    'bar': round((views / max_views) * 100, 1) if max_views else 0,
                })

        campaign_rows = approved_submissions.values(
            'participant__campaign_id',
            'participant__campaign__public_access_key',
            'participant__campaign__name',
        ).annotate(
            total_views=Sum('views'),
            total_submissions=Count('id'),
            total_payout=Sum(F('earning') + F('pending_earning')),
        ).order_by('-total_views', '-total_payout')[:3]

        top_campaigns = [
            {
                'id': row['participant__campaign_id'],
                'accessKey': str(row['participant__campaign__public_access_key']),
                'name': row['participant__campaign__name'],
                'views': int(row['total_views'] or 0),
                'submissions': int(row['total_submissions'] or 0),
                'payout': float(row['total_payout'] or 0),
            }
            for row in campaign_rows
        ]

        daily_rows = approved_submissions.annotate(
            period_date=TruncDate('created_at')
        ).values('period_date').annotate(
            total_views=Sum('views'),
            total_payout=Sum(F('earning') + F('pending_earning')),
        ).order_by('period_date')

        def build_period_series(filter_key):
            today = timezone.now().date()
            labels = []

            if filter_key == '7D':
                for i in range(6, -1, -1):
                    date_value = today - timedelta(days=i)
                    labels.append({'key': date_value.isoformat(), 'label': date_value.strftime('%a')})
            elif filter_key == '30D':
                for i in range(4):
                    start_date = today - timedelta(days=27 - (i * 7))
                    end_date = start_date + timedelta(days=6)
                    labels.append({'key': f'{start_date.isoformat()}-{end_date.isoformat()}', 'label': f'W{i + 1}'})
            elif filter_key == '6M':
                month_anchor = today.replace(day=1)
                for i in range(5, -1, -1):
                    year = month_anchor.year
                    month = month_anchor.month - i
                    while month <= 0:
                        month += 12
                        year -= 1
                    while month > 12:
                        month -= 12
                        year += 1
                    month_date = today.replace(year=year, month=month, day=1)
                    labels.append({'key': month_date.strftime('%Y-%m'), 'label': month_date.strftime('%b')})
            else:
                years = sorted({row['period_date'].year for row in daily_rows if row['period_date']})
                if not years:
                    years = [today.year]
                for year in years:
                    labels.append({'key': str(year), 'label': str(year)})

            buckets = {}
            for row in daily_rows:
                created_date = row['period_date']
                if not created_date:
                    continue
                if filter_key == '7D':
                    bucket_key = created_date.isoformat()
                elif filter_key == '30D':
                    week_start = created_date - timedelta(days=(created_date.weekday() + 6) % 7)
                    bucket_key = f'{week_start.isoformat()}-{(week_start + timedelta(days=6)).isoformat()}'
                elif filter_key == '6M':
                    bucket_key = created_date.strftime('%Y-%m')
                else:
                    bucket_key = str(created_date.year)
                bucket = buckets.setdefault(bucket_key, {'views': 0, 'payout': Decimal('0')})
                bucket['views'] += int(row['total_views'] or 0)
                bucket['payout'] += row['total_payout'] or Decimal('0')

            series = [
                {
                    'period': label['label'],
                    'views': buckets.get(label['key'], {}).get('views', 0),
                    'payout': float(buckets.get(label['key'], {}).get('payout', Decimal('0'))),
                }
                for label in labels
            ]

            return series

        views_by_period = {
            '7D': build_period_series('7D'),
            '30D': build_period_series('30D'),
            '6M': build_period_series('6M'),
            'ALL': build_period_series('ALL'),
        }

        payload = {
            'total_views': int(total_views or 0),
            'total_earnings': float(total_earnings or 0),
            'unique_viewers': 0,
            'avg_watch_time_seconds': 0,
            'platform_breakdown': platform_breakdown,
            'top_campaigns': top_campaigns,
            'views_by_period': views_by_period,
            'payout_by_period': {
                key: [{'period': item['period'], 'payout': item['payout']} for item in value]
                for key, value in views_by_period.items()
            },
        }
        return Response(payload)

    @action(detail=False, methods=['get'], url_path='budget')
    def budget(self, request):
        """Return budget and payout data for the brand using approved submissions (including soft-deleted)."""
        user = request.user
        campaigns = Campaign.objects.filter(creator=user).annotate(
            campaign_spent=Sum(
                F('participants__submissions__earning') + F('participants__submissions__pending_earning'),
                filter=Q(participants__submissions__status='approved'),
            ),
        )
        
        # Calculate budget totals
        total_budget = campaigns.aggregate(total=Sum('budget'))['total'] or 0
        
        # Get all approved submissions (including soft-deleted) to calculate payouts accurately
        approved_submissions = CampaignSubmission.objects.filter(
            participant__campaign__creator=user,
            status='approved'
        ).select_related('participant', 'participant__campaign').order_by('created_at')
        
        total_spent = approved_submissions.aggregate(
            total=Sum(F('earning') + F('pending_earning'))
        )['total'] or Decimal('0')
        
        # Calculate active budget (for campaigns with remaining budget and not closed)
        active_budget = campaigns.filter(
            status__in=['active', 'available']
        ).aggregate(total=Sum('budget'))['total'] or 0
        
        # Average payout per campaign
        num_campaigns = campaigns.count()
        avg_payout = float(total_spent) / num_campaigns if num_campaigns > 0 else 0
        
        # Budget utilization percentage
        utilization = 0
        if total_budget > 0:
            utilization = float(total_spent) / float(total_budget) * 100
        
        # Campaign budget details (campaigns with remaining budget)
        campaign_budgets = []
        for campaign in campaigns:
            budget_amount = float(campaign.budget or 0)
            if budget_amount <= 0:
                continue
            
            campaign_spent = float(campaign.campaign_spent or 0)
            
            remaining = budget_amount - campaign_spent
            if remaining > 0 and campaign.status != 'closed':
                campaign_budgets.append({
                    'id': campaign.id,
                    'name': campaign.name,
                    'budget': budget_amount,
                    'spent': campaign_spent,
                    'remaining': remaining,
                })
        
        payout_rows = list(approved_submissions.annotate(
            period_date=TruncDate('created_at')
        ).values('period_date').annotate(
            amount=Sum(F('earning') + F('pending_earning')),
        ).order_by('period_date'))

        # Build payout trend by period
        def build_payout_series(filter_key):
            today = timezone.now().date()
            labels = []

            if filter_key == '7D':
                for i in range(6, -1, -1):
                    date_value = today - timedelta(days=i)
                    labels.append({'key': date_value.isoformat(), 'label': date_value.strftime('%a')})
            elif filter_key == '30D':
                for i in range(4):
                    start_date = today - timedelta(days=27 - (i * 7))
                    end_date = start_date + timedelta(days=6)
                    labels.append({'key': f'{start_date.isoformat()}-{end_date.isoformat()}', 'label': f'W{i + 1}'})
            elif filter_key == '6M':
                month_anchor = today.replace(day=1)
                for i in range(5, -1, -1):
                    year = month_anchor.year
                    month = month_anchor.month - i
                    while month <= 0:
                        month += 12
                        year -= 1
                    while month > 12:
                        month -= 12
                        year += 1
                    month_date = today.replace(year=year, month=month, day=1)
                    labels.append({'key': month_date.strftime('%Y-%m'), 'label': month_date.strftime('%b')})
            else:
                years = sorted({row['period_date'].year for row in payout_rows if row['period_date']})
                if not years:
                    years = [today.year]
                for year in years:
                    labels.append({'key': str(year), 'label': str(year)})

            buckets = {}
            for row in payout_rows:
                created_date = row['period_date']
                if not created_date:
                    continue
                if filter_key == '7D':
                    bucket_key = created_date.isoformat()
                elif filter_key == '30D':
                    week_start = created_date - timedelta(days=(created_date.weekday() + 6) % 7)
                    bucket_key = f'{week_start.isoformat()}-{(week_start + timedelta(days=6)).isoformat()}'
                elif filter_key == '6M':
                    bucket_key = created_date.strftime('%Y-%m')
                else:
                    bucket_key = str(created_date.year)
                buckets[bucket_key] = buckets.get(bucket_key, Decimal('0')) + (row['amount'] or Decimal('0'))

            series = [
                {'period': label['label'], 'amount': float(buckets.get(label['key'], Decimal('0')))}
                for label in labels
            ]

            return series

        payout_by_period = {
            '7D': build_payout_series('7D'),
            '30D': build_payout_series('30D'),
            '6M': build_payout_series('6M'),
            'ALL': build_payout_series('ALL'),
        }

        payload = {
            'total_budget': float(total_budget or 0),
            'total_spent': float(total_spent or 0),
            'active_budget': float(active_budget or 0),
            'avg_payout': round(avg_payout, 2),
            'utilization': round(utilization, 2),
            'campaign_budgets': campaign_budgets,
            'payout_by_period': payout_by_period,
        }
        return Response(payload)

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """Return aggregated dashboard metrics for the authenticated brand (creator).

        Use approved submissions, not stale cached campaign totals, so active and soft-deleted
        rows are both included in the brand dashboard data.
        """
        user = request.user
        qs = Campaign.objects.filter(creator=user)

        approved_submission_totals = CampaignSubmission.objects.filter(
            participant__campaign__creator=user,
            status='approved'
        ).aggregate(
            total_views=Sum('views'),
            total_earnings=Sum(F('earning') + F('pending_earning')),
        )

        total_campaigns = qs.count()
        total_views = approved_submission_totals.get('total_views') or 0
        total_budget = qs.aggregate(total=Sum('budget'))['total'] or 0
        total_earnings = approved_submission_totals.get('total_earnings') or 0

        creators_worked_with = (
            CampaignParticipant.objects.filter(campaign__creator=user)
            .values_list('clipper_id', flat=True)
            .distinct()
            .count()
        )

        return Response({
            'total_campaigns': total_campaigns,
            'views_generated': int(total_views or 0),
            'total_budget': float(total_budget or 0),
            'total_earnings': float(total_earnings or 0),
            'creators_worked_with': creators_worked_with,
        })

    @action(detail=True, methods=['get'], url_path='performance')
    def performance(self, request, pk=None):
        """Return campaign performance charts using all approved submissions, including soft-deleted rows preserved for real analytics."""
        campaign = self.get_object()
        approved_submissions = list(
            CampaignSubmission.objects.filter(
                participant__campaign=campaign,
                status='approved'
            ).select_related('participant').order_by('created_at')
        )

        total_views = sum(int(submission.views or 0) for submission in approved_submissions)
        total_payout = sum(
            (submission.earning or Decimal('0')) + (submission.pending_earning or Decimal('0'))
            for submission in approved_submissions
        )
        clippers_paid = (
            CampaignSubmission.objects.filter(participant__campaign=campaign, status='approved')
            .values_list('participant__clipper_id', flat=True)
            .distinct()
            .count()
        )

        def build_period_series(filter_key):
            today = timezone.now().date()
            labels = []

            if filter_key == '7D':
                for i in range(6, -1, -1):
                    date_value = today - timedelta(days=i)
                    labels.append({'key': date_value.isoformat(), 'label': date_value.strftime('%a')})
            elif filter_key == '30D':
                for i in range(4):
                    start_date = today - timedelta(days=27 - (i * 7))
                    end_date = start_date + timedelta(days=6)
                    labels.append({'key': f'{start_date.isoformat()}-{end_date.isoformat()}', 'label': f'W{i + 1}'})
            elif filter_key == '6M':
                month_anchor = today.replace(day=1)
                for i in range(5, -1, -1):
                    year = month_anchor.year
                    month = month_anchor.month - i
                    while month <= 0:
                        month += 12
                        year -= 1
                    while month > 12:
                        month -= 12
                        year += 1
                    month_date = today.replace(year=year, month=month, day=1)
                    labels.append({'key': month_date.strftime('%Y-%m'), 'label': month_date.strftime('%b')})
            else:
                years = sorted({submission.created_at.year for submission in approved_submissions if getattr(submission, 'created_at', None)})
                if not years:
                    years = [today.year]
                for year in years:
                    labels.append({'key': str(year), 'label': str(year)})

            series = []
            for label in labels:
                bucket_views = 0
                bucket_payout = Decimal('0')
                for submission in approved_submissions:
                    created_at = getattr(submission, 'created_at', None)
                    if not created_at:
                        continue
                    created_date = created_at.date()

                    if filter_key == '7D':
                        bucket_match = created_date.isoformat() == label['key']
                    elif filter_key == '30D':
                        week_start = created_date - timedelta(days=(created_date.weekday() + 6) % 7)
                        week_end = week_start + timedelta(days=6)
                        bucket_match = f'{week_start.isoformat()}-{week_end.isoformat()}' == label['key']
                    elif filter_key == '6M':
                        bucket_match = created_date.strftime('%Y-%m') == label['key']
                    else:
                        bucket_match = str(created_date.year) == label['key']

                    if bucket_match:
                        bucket_views += int(submission.views or 0)
                        bucket_payout += (submission.earning or Decimal('0')) + (submission.pending_earning or Decimal('0'))

                series.append({
                    'period': label['label'],
                    'views': bucket_views,
                    'payout': float(bucket_payout),
                })

            return series

        views_by_period = {
            '7D': build_period_series('7D'),
            '30D': build_period_series('30D'),
            '6M': build_period_series('6M'),
            'ALL': build_period_series('ALL'),
        }

        payload = {
            'campaign_id': campaign.id,
            'campaign_name': campaign.name,
            'total_views': int(total_views),
            'total_payout': float(total_payout),
            'clippers_paid': clippers_paid,
            'views_by_period': views_by_period,
            'payout_by_period': {
                key: [
                    {'period': item['period'], 'payout': item['payout']}
                    for item in value
                ]
                for key, value in views_by_period.items()
            },
        }
        return Response(payload)

    @action(detail=True, methods=['get'], url_path='participants')
    def participants(self, request, pk=None):
        campaign = self.get_object()
        denied = self._require_owner(campaign)
        if denied:
            return denied
        participants = campaign.participants.select_related('clipper', 'clipper__profile').prefetch_related('submissions').all()

        rows = []
        for participant in participants:
            # Use the full submission set for totals, but still show only non-deleted rows in the UI.
            all_submissions = list(participant.submissions.all())
            display_submissions = list(participant.submissions.filter(is_deleted=False))
            latest_submission = display_submissions[0] if display_submissions else None

            total_views = sum((submission.views or 0) for submission in all_submissions if submission.status == 'approved')
            total_reach = sum((getattr(submission, 'reach', 0) or 0) for submission in all_submissions)
            total_earnings = sum(
                ((submission.earning or Decimal('0')) + (submission.pending_earning or Decimal('0')))
                for submission in all_submissions if submission.status == 'approved'
            )

            profile_username = None
            try:
                profile_username = participant.clipper.profile.username
            except Exception:
                profile_username = None

            fallback_username = None
            if hasattr(participant.clipper, 'username') and participant.clipper.username:
                fallback_username = participant.clipper.username
            elif participant.clipper.email:
                fallback_username = participant.clipper.email.split('@', 1)[0]
            else:
                fallback_username = f"user-{participant.clipper_id}"

            if fallback_username and not fallback_username.startswith('@'):
                fallback_username = f"@{fallback_username}"

            row_status = participant.status.title()
            if campaign.status != 'active':
                row_status = campaign.status.title()

            rows.append({
                'id': participant.clipper_id,
                'clipperId': participant.clipper_id,
                'participantKey': create_participant_access_token(campaign, participant.clipper_id),
                'username': profile_username or fallback_username,
                'platform': latest_submission.get_platform_display() if latest_submission else '',
                'views': total_views,
                'reach': total_reach,
                'engagementRate': 0,
                'status': row_status,
                'campaignStatus': campaign.status,
                'payoutTriggered': bool(latest_submission and getattr(latest_submission, 'payout_triggered', False)),
                'postUrl': latest_submission.content_url if latest_submission else '',
                'createdAt': participant.joined_at,
                'campaignId': campaign.id,
                'earned': f"₹{total_earnings:.2f}",
            })

        return Response(rows)

    @action(detail=True, methods=['get'], url_path=r'clippers/(?P<clipper_id>[^/.]+)/submissions')
    def clipper_submissions(self, request, pk=None, clipper_id=None):
        campaign = self.get_object()
        denied = self._require_owner(campaign)
        if denied:
            return denied
        participant = self._get_participant(campaign, clipper_id)

        # For display: show only non-deleted submissions
        display_submissions = participant.submissions.filter(is_deleted=False).order_by('-created_at')
        # For calculations and charts: use ALL submissions (including deleted) for accurate totals
        all_submissions = CampaignSubmission.objects.filter(participant=participant).order_by('-created_at')

        normalized_submissions = []
        for submission in display_submissions:
            if submission.status == 'approved':
                try:
                    submission.update_earning()
                except Exception:
                    pass

            is_approved = submission.status == 'approved'
            normalized_submissions.append({
                'id': submission.id,
                'platform': submission.get_platform_display() or submission.platform.title(),
                'platformUsername': submission.platform_username,
                'contentUrl': submission.content_url,
                'status': submission.status.title(),
                'views': submission.views if is_approved else 0,
                'earning': float(submission.earning or 0) if is_approved else 0,
                'pendingEarning': float(submission.pending_earning or 0) if is_approved else 0,
                'createdAt': submission.created_at,
            })

        analytics_submissions = []
        for submission in all_submissions:
            if submission.status == 'approved':
                try:
                    submission.update_earning()
                except Exception:
                    pass

            is_approved = submission.status == 'approved'
            analytics_submissions.append({
                'id': submission.id,
                'platform': submission.get_platform_display() or submission.platform.title(),
                'platformUsername': submission.platform_username,
                'contentUrl': submission.content_url,
                'status': submission.status.title(),
                'views': submission.views if is_approved else 0,
                'earning': float(submission.earning or 0) if is_approved else 0,
                'pendingEarning': float(submission.pending_earning or 0) if is_approved else 0,
                'createdAt': submission.created_at,
                'isDeleted': bool(submission.is_deleted),
            })

        approved_submissions = all_submissions.filter(status='approved')
        total_views = approved_submissions.aggregate(total=Sum('views'))['total'] or 0
        total_earnings = approved_submissions.aggregate(
            total=Sum(F('earning') + F('pending_earning'))
        )['total'] or 0
        total_submission_count = all_submissions.count()
        approved_count = approved_submissions.count()
        pending_count = all_submissions.filter(status='pending', is_deleted=False).count()

        platform_totals = list(
            approved_submissions.values('platform').annotate(total_views=Sum('views')).order_by('-total_views')
        )
        platform_name_lookup = {
            choice[0]: choice[1] for choice in CampaignSubmission._meta.get_field('platform').choices
        }
        platform_breakdown = [
            {
                'platform': platform_name_lookup.get(item['platform'], str(item['platform']).title()),
                'views': int(item['total_views'] or 0),
            }
            for item in platform_totals
        ]
        best_platform = platform_breakdown[0]['platform'] if platform_breakdown else 'N/A'

        approval_rate = round((approved_count / total_submission_count) * 100) if total_submission_count else 0
        avg_views_per_clip = round((total_views / total_submission_count)) if total_submission_count else 0

        profile_username = None
        try:
            profile_username = participant.clipper.profile.username
        except Exception:
            profile_username = None

        if profile_username:
            if not profile_username.startswith("@"):
                profile_username = f"@{profile_username}"
        else:
            fallback_username = getattr(participant.clipper, 'username', None)
            if fallback_username:
                profile_username = fallback_username
                if not profile_username.startswith("@"):
                    profile_username = f"@{profile_username}"
            elif participant.clipper.email:
                profile_username = f"@{participant.clipper.email.split('@', 1)[0]}"
            else:
                profile_username = str(participant.clipper)

        participant_info = {
            'clipperId': participant.clipper_id,
            'username': profile_username,
            'status': participant.status.title(),
            'totalSubmissions': total_submission_count,
            'totalViews': total_views,
            'totalEarnings': float(total_earnings or 0),
            'approvedSubmissions': approved_count,
            'pendingSubmissions': pending_count,
            'approvalRate': approval_rate,
            'bestPlatform': best_platform,
            'platformBreakdown': platform_breakdown,
            'avgViewsPerClip': avg_views_per_clip,
            'clipScore': min(100, max(0, round((approval_rate * 0.7) + (min((total_views / 10000) if total_views else 0, 100) * 0.3)))) ,
            'campaign': campaign.name,
            'analyticsSubmissions': analytics_submissions,
            'campaignInfo': {
                'status': campaign.status,
                'endDate': campaign.end_date.isoformat() if campaign.end_date else None,
                'maxEarnings': float(campaign.max_earnings or 0),
                'currentEarnings': float(participant.get_total_committed_earnings() or 0),
                'remainingCapacity': max(0, float(campaign.max_earnings or 0) - float(participant.get_total_committed_earnings() or 0)) if campaign.max_earnings > 0 else None,
                'isClosed': campaign.status == 'closed',
                'isPastEndDate': campaign.end_date and campaign.end_date < __import__('datetime').date.today() if campaign.end_date else False,
            }
        }

        return Response({
            'participant': participant_info,
            'submissions': normalized_submissions,
        })

    @action(detail=True, methods=['delete'], url_path=r'clippers/(?P<clipper_id>[^/.]+)/submissions/(?P<submission_id>[^/.]+)')
    def delete_clipper_submission(self, request, pk=None, clipper_id=None, submission_id=None):
        reason = None
        if hasattr(request, 'data') and isinstance(request.data, dict):
            reason = request.data.get('reason')
        elif request.body:
            try:
                payload = json.loads(request.body)
                if isinstance(payload, dict):
                    reason = payload.get('reason')
            except Exception:
                reason = None

        reason_text = str(reason).strip() if reason else None

        print(f'🔴 DELETE endpoint called:')
        print(f'  pk={pk}, clipper_id={clipper_id}, submission_id={submission_id}')
        print(f'  user={request.user}, user.id={request.user.id if request.user else None}')
        print(f'  reason={reason_text}')
        
        try:
            campaign = self.get_object()
            print(f'  campaign={campaign.id}, creator={campaign.creator.id}')
        except Exception as e:
            print(f'  ERROR getting campaign: {e}')
            return Response(
                {'detail': f'Campaign not found: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if current user is the campaign creator
        if campaign.creator != request.user:
            print(f'  Permission denied: {campaign.creator.id} != {request.user.id}')
            return Response(
                {'detail': 'You do not have permission to delete submissions for this campaign.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            participant = self._get_participant(campaign, clipper_id)
            print(f'  participant={participant.id}')
        except Exception as e:
            print(f'  ERROR getting participant: {e}')
            return Response(
                {'detail': f'Participant not found: {str(e)}'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        try:
            submission = get_object_or_404(
                participant.submissions.all(),
                pk=submission_id,
            )
            print(f'  submission={submission.id}, earning={submission.earning}, pending_earning={submission.pending_earning}')
            
            # 🔑 PRESERVE EARNINGS: Create a Transaction record AND update profile before deleting
            # This ensures earnings are preserved even after submission deletion
            total_earned = submission.earning + submission.pending_earning
            clipper_user = participant.clipper
            
            with db_transaction.atomic():
                if total_earned > 0:
                    print(f'  💰 Preserving earnings: ₹{total_earned}')
                    
                    # Create transaction to record the earnings
                    Transaction.objects.create(
                        user=clipper_user,
                        amount=total_earned,
                        transaction_type='earning',
                        status='completed',  # Mark as completed since earnings were already accrued
                        bot_notes=f'PRESERVED: Campaign "{campaign.name}" - Submission {submission_id} deleted. Earnings protected. (Earned: ₹{submission.earning}, Pending: ₹{submission.pending_earning})'
                    )
                    print(f'  ✅ Transaction created to preserve ₹{total_earned}')
                    
                    # Update profile.total_earnings to ensure it's visible in user's earnings
                    from accounts.models import Profile
                    try:
                        profile = Profile.objects.select_for_update().get(user=clipper_user)
                        profile.total_earnings = F('total_earnings') + total_earned
                        profile.save(update_fields=['total_earnings'])
                        profile.refresh_from_db()
                        print(f'  ✅ Profile updated: total_earnings now ₹{profile.total_earnings}')
                    except Profile.DoesNotExist:
                        print(f'  ⚠️ Profile not found for user {clipper_user.id}, creating earning Transaction only')
                
                # Soft-delete: mark as deleted, clear pending earnings, and preserve status for calculations
                # This ensures deleted submission data is still included in financial queries
                # but won't show as pending for the user
                submission.is_deleted = True
                submission.pending_earning = Decimal('0')
                submission.save(update_fields=['is_deleted', 'pending_earning', 'updated_at'])
                print(f'  ✅ Submission marked as deleted (soft-delete) with pending_earning cleared')
                
                # Recalculate campaign metrics since submission is now deleted
                try:
                    campaign.recalculate_metrics()
                    print(f'  ✅ Campaign metrics recalculated')
                except Exception as e:
                    print(f'  ⚠️ Error recalculating campaign metrics: {e}')
            
            return Response(
                {
                    'status': 'success', 
                    'message': 'Submission deleted successfully. Earnings have been preserved.',
                    'reason': reason_text,
                    'earnings_preserved': float(total_earned) if total_earned > 0 else 0
                }, 
                status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f'  ERROR deleting submission: {e}')
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Error deleting submission: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class BidViewSet(viewsets.ModelViewSet):
    serializer_class = BidSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bid.objects.filter(clipper=self.request.user).select_related('content', 'clipper')

    def create(self, request, *args, **kwargs):
        content_id = request.data.get('content') or request.data.get('contentId')
        if not content_id:
            return Response({'error': 'content is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            content = Content.objects.get(pk=content_id)
        except Content.DoesNotExist:
            return Response({'error': 'Content not found.'}, status=status.HTTP_404_NOT_FOUND)

        if content.creator == request.user:
            return Response({'error': 'You cannot bid on your own project.'}, status=status.HTTP_400_BAD_REQUEST)

        if not content.is_biddable:
            return Response({'error': 'This project does not accept bids.'}, status=status.HTTP_400_BAD_REQUEST)

        if content.status != 'available':
            return Response({'error': 'This project is no longer available.'}, status=status.HTTP_400_BAD_REQUEST)

        if Bid.objects.filter(content=content, clipper=request.user, status='pending').exists():
            return Response({'error': 'You already have a pending bid for this project.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bid_amount = serializer.validated_data.get('bid_amount')
        if bid_amount is not None and Decimal(str(bid_amount)) > Decimal(str(content.budget or 0)):
            return Response({'error': 'Bid amount exceeds the project budget.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer.save(clipper=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(clipper=self.request.user)

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        bid = get_object_or_404(Bid.objects.select_related('content', 'clipper'), pk=pk)

        if bid.content.creator != request.user:
            return Response({'error': 'Only the creator can accept a bid.'}, status=status.HTTP_403_FORBIDDEN)

        if bid.status == 'accepted':
            return Response({'error': 'This bid is already accepted.'}, status=status.HTTP_400_BAD_REQUEST)

        if bid.content.status != 'available':
            return Response({'error': 'This project is no longer available.'}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            bid.status = 'accepted'
            bid.save(update_fields=['status'])

            bid.content.status = 'claimed'
            bid.content.assigned_clipper = bid.clipper
            bid.content.save(update_fields=['status', 'assigned_clipper'])

            Bid.objects.filter(content=bid.content, status='pending').exclude(pk=bid.pk).update(status='rejected')

            Transaction.objects.get_or_create(
                content=bid.content,
                user=bid.clipper,
                transaction_type='earning',
                status='pending',
                defaults={'amount': bid.bid_amount},
            )

        return Response({
            'status': 'success',
            'message': 'Bid accepted successfully.',
            'bid_id': bid.id,
            'content_id': bid.content.id,
        }, status=status.HTTP_200_OK)


class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = ClipSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ClipSubmission.objects.filter(clipper=self.request.user)

    def perform_create(self, serializer):
        serializer.save(clipper=self.request.user)


class ClipperSubmissionsViewSet(viewsets.ModelViewSet):
    """Return campaign submissions for the authenticated clipper."""

    permission_classes = [IsAuthenticated]
    serializer_class = CampaignSubmissionSerializer

    def get_queryset(self):
        queryset = (
            CampaignSubmission.objects.filter(
                participant__clipper=self.request.user,
                is_deleted=False  # Only show non-deleted submissions in "My Submissions"
            )
            .select_related('participant', 'participant__campaign')
            .order_by('-created_at')
        )
        campaign_key = self.request.query_params.get('campaign')
        if campaign_key:
            if str(campaign_key).isdigit():
                queryset = queryset.filter(participant__campaign_id=campaign_key)
            else:
                try:
                    access_key = uuid.UUID(str(campaign_key))
                except (ValueError, TypeError, AttributeError):
                    return queryset.none()
                queryset = queryset.filter(participant__campaign__public_access_key=access_key)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        if request.query_params.get('summary') == 'true':
            totals = queryset.aggregate(
                count=Count('id'),
                total_earned=Sum('earning', filter=Q(status='approved')),
                total_pending=Sum('pending_earning', filter=Q(status='approved')),
            )
            return Response({
                'count': totals['count'] or 0,
                'total_earned': float(totals['total_earned'] or 0),
                'total_pending': float(totals['total_pending'] or 0),
            })
        rows = []
        for submission in queryset:
            participant = submission.participant
            campaign = participant.campaign if participant else None
            is_approved = submission.status == 'approved'
            rows.append({
                'id': submission.id,
                'campaign': campaign.name if campaign else 'Unknown campaign',
                'handle': submission.platform_username or submission.platform.title() or 'Unknown handle',
                'platform': submission.get_platform_display() or submission.platform.title(),
                'status': submission.status.title(),
                'views': submission.views if is_approved else 0,
                'earned': float(submission.earning or 0) if is_approved else 0,
                'pendingPayout': float(submission.pending_earning or 0) if is_approved else 0,
                'submittedAt': submission.created_at.strftime('%Y-%m-%d'),
                'thumbnail': campaign.thumbnail_url if campaign else None,
                'contentUrl': submission.content_url or "",
            })
        return Response(rows)

    def destroy(self, request, pk=None, *args, **kwargs):
        submission = get_object_or_404(
            CampaignSubmission.objects.filter(participant__clipper=request.user),
            pk=pk,
        )
        
        # Soft-delete: mark as deleted while preserving original status for calculations
        # This keeps earning data in financial queries but hides from "My Submissions" view
        submission.is_deleted = True
        submission.save(update_fields=['is_deleted', 'updated_at'])
        
        return Response({
            'status': 'success',
            'message': 'Submission deleted successfully. The 24-hour cooling period still applies.',
            'canDelete': True,
        }, status=status.HTTP_200_OK)


class CampaignSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-facing review and settlement for campaign submissions."""

    queryset = CampaignSubmission.objects.filter(is_deleted=False).select_related(
        'participant__campaign', 'participant__campaign__creator',
        'participant__campaign__creator__profile', 'participant__clipper',
        'participant__clipper__profile',
    ).order_by('-created_at')
    serializer_class = CampaignSubmissionSerializer
    permission_classes = [IsAdminUser]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        campaign_id = self.request.query_params.get('campaign_id')
        if campaign_id:
            queryset = queryset.filter(participant__campaign_id=campaign_id)

        clipper = str(self.request.query_params.get('clipper', '')).strip()
        if clipper:
            queryset = queryset.filter(
                Q(participant__clipper__profile__username__iexact=clipper)
                | Q(participant__clipper__email__iexact=clipper)
            )

        if self.action in ('list', 'retrieve') and self.request.query_params.get('queue') == 'payouts':
            # Include settled and held records as well as currently pending
            # amounts so the admin UI can filter the full payout history.
            queryset = queryset.filter(status='approved')
        return queryset

    @action(detail=True, methods=['post'], url_path='approve', permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        submission = self.get_object()
        if submission.status == 'approved':
            return Response({'detail': 'Submission is already approved.'}, status=status.HTTP_400_BAD_REQUEST)
        if submission.status != 'pending':
            return Response({'detail': 'Only pending submissions can be approved.'}, status=status.HTTP_400_BAD_REQUEST)

        submission.review_checks = request.data.get('checks', {})
        submission.review_notes = request.data.get('notes', '')
        submission.rejection_reason = ''
        submission.status = 'approved'
        submission.payout_review_status = 'pending'
        submission.save(update_fields=['status', 'review_checks', 'review_notes', 'rejection_reason', 'payout_review_status', 'earning', 'pending_earning', 'updated_at'])
        from notifications.helpers import notify_user_event
        notify_user_event(
            user_id=submission.participant.clipper_id,
            event_type='content.submission_approved',
            title='Submission approved',
            message=f'Your submission for {submission.participant.campaign.name} was approved.',
            category='content',
            entity_type='campaign_submission',
            payload={'submission_id': submission.id, 'campaign_id': submission.participant.campaign_id},
            idempotency_key=f'content.submission_approved:{submission.id}',
        )
        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reject', permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        submission = self.get_object()
        if submission.status != 'pending':
            return Response({'detail': 'Only pending submissions can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = str(request.data.get('reason') or '').strip()
        if not reason:
            return Response({'detail': 'A rejection reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
        submission.status = 'rejected'
        submission.rejection_reason = reason
        submission.review_checks = request.data.get('checks', {})
        submission.review_notes = request.data.get('notes', '')
        submission.save(update_fields=['status', 'rejection_reason', 'review_checks', 'review_notes', 'earning', 'pending_earning', 'updated_at'])
        from notifications.helpers import notify_user_event
        notify_user_event(
            user_id=submission.participant.clipper_id,
            event_type='content.submission_rejected',
            title='Submission needs changes',
            message=f'Your submission for {submission.participant.campaign.name} was rejected: {reason}',
            category='content',
            entity_type='campaign_submission',
            payload={'submission_id': submission.id, 'campaign_id': submission.participant.campaign_id},
            idempotency_key=f'content.submission_rejected:{submission.id}',
        )
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'], url_path='settle-pending', permission_classes=[IsAdminUser])
    def settle_pending(self, request, pk=None):
        submission = self.get_object()
        if submission.payout_review_status != 'pending':
            return Response(
                {'detail': 'Only pending payouts can be approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if submission.status != 'approved':
            return Response(
                {'detail': 'Submission must be approved before pending earnings can be settled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not submission.pending_earning or float(submission.pending_earning) <= 0:
            return Response(
                {'detail': 'No pending earnings are available to settle.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.utils import timezone
        from accounts.models import Profile
        from django.db.models import F
        pending_amount = Decimal(str(submission.pending_earning))
        with db_transaction.atomic():
            submission.approve_pending_earning()
            Profile.objects.filter(user_id=submission.participant.clipper_id).update(
                total_earnings=F('total_earnings') + pending_amount,
                clips_completed=F('clips_completed') + 1,
                views_generated=F('views_generated') + submission.views,
            )
            submission.payout_review_status = 'approved'
            submission.payout_reviewed_by = request.user
            submission.payout_reviewed_at = timezone.now()
            submission.payout_review_notes = str(request.data.get('notes') or '')
            submission.save(update_fields=['payout_review_status', 'payout_reviewed_by', 'payout_reviewed_at', 'payout_review_notes', 'updated_at'], skip_earning_update=True)
        from notifications.helpers import notify_user_event
        notify_user_event(
            user_id=submission.participant.clipper_id,
            event_type='earnings.pending_payout_approved',
            title='Pending payout approved',
            message=f'₹{pending_amount} has been released to your earnings.',
            category='earnings',
            entity_type='campaign_submission',
            payload={'submission_id': submission.id, 'amount': str(pending_amount)},
            idempotency_key=f'earnings.pending_payout_approved:{submission.id}',
        )
        submission.payout_review_status = 'approved'
        submission.payout_reviewed_by = request.user
        submission.payout_reviewed_at = timezone.now()
        submission.payout_review_notes = str(request.data.get('notes') or '')
        submission.save(update_fields=['payout_review_status', 'payout_reviewed_by', 'payout_reviewed_at', 'payout_review_notes', 'updated_at'], skip_earning_update=True)
        serializer = self.get_serializer(submission)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='hold', permission_classes=[IsAdminUser])
    def hold(self, request, pk=None):
        submission = self.get_object()
        if submission.payout_review_status != 'pending' or submission.status != 'approved' or not submission.pending_earning:
            return Response({'detail': 'Only pending payouts with pending earnings can be held.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = str(request.data.get('reason') or '').strip()
        if not reason:
            return Response({'detail': 'A hold reason is required.'}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils import timezone
        submission.payout_review_status = 'held'
        submission.payout_review_notes = reason
        submission.payout_reviewed_by = request.user
        submission.payout_reviewed_at = timezone.now()
        submission.save(update_fields=['payout_review_status', 'payout_review_notes', 'payout_reviewed_by', 'payout_reviewed_at', 'updated_at'], skip_earning_update=True)
        return Response(self.get_serializer(submission).data)

    @action(detail=True, methods=['post'], url_path='delete', permission_classes=[IsAdminUser])
    def admin_delete(self, request, pk=None):
        """Admin action to delete a submission: mark as soft-deleted and clear pending earnings."""
        submission = self.get_object()
        
        # Soft-delete: mark as deleted and clear pending earnings
        # This preserves the original status for financial calculations while removing pending amounts
        submission.is_deleted = True
        submission.pending_earning = Decimal('0')
        
        submission.save(update_fields=['is_deleted', 'pending_earning', 'updated_at'])
        
        serializer = self.get_serializer(submission)
        return Response({
            'status': 'success',
            'message': 'Submission deleted successfully. Pending earnings cleared.',
            'submission': serializer.data,
        }, status=status.HTTP_200_OK)


class ContentViewSet(viewsets.ModelViewSet):
    serializer_class = ContentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Content.objects.all().select_related(
            'creator',
            'assigned_clipper'
        ).prefetch_related('likes')

        queryset = queryset.annotate(annotated_likes_count=Count('likes'))

        if user.is_authenticated:
            is_liked_subquery = Content.objects.filter(
                id=OuterRef('id'),
                likes=user
            )
            queryset = queryset.annotate(user_has_liked=Exists(is_liked_subquery))
        else:
            queryset = queryset.annotate(user_has_liked=Value(False, output_field=BooleanField()))

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        if self.action == 'list':
            queryset = queryset.filter(status='available')

        return queryset.order_by('-is_paid_listing', '-created_at')

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=['post'])
    def claim(self, request, pk=None):
        """Claim a non-biddable content project."""
        self.throttle_scope = 'burst'
        try:
            with db_transaction.atomic():
                try:
                    content = Content.objects.select_for_update().get(pk=pk)
                except Content.DoesNotExist:
                    return Response({"error": "Content not found."}, status=status.HTTP_404_NOT_FOUND)

                if content.creator == request.user:
                    return Response({"error": "You cannot claim your own project."}, status=status.HTTP_400_BAD_REQUEST)
                if content.is_biddable:
                    return Response({"error": "This project requires a bid. Please submit a bid instead."}, status=status.HTTP_400_BAD_REQUEST)
                if content.status != 'available':
                    return Response({"error": f"This project is no longer available. Current status: {content.status}."}, status=status.HTTP_400_BAD_REQUEST)
                if content.assigned_clipper is not None:
                    return Response({"error": "This project has already been claimed by another clipper."}, status=status.HTTP_400_BAD_REQUEST)

                content.status = 'claimed'
                content.assigned_clipper = request.user
                content.save()

            return Response({
                "status": "success",
                "message": "Project claimed successfully",
                "content_id": content.id
            }, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error claiming content {pk}: {str(e)}", exc_info=True)
            return Response({"error": "An error occurred while claiming the project. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='get-upload-url')
    def get_upload_url(self, request):
        """Generate a signed upload URL from Supabase storage."""
        filename = request.data.get('filename')
        if not filename:
            return Response({"error": "filename is required"}, status=400)

        upload_type = request.data.get('file_type', 'raw')
        import time
        file_path = f"{upload_type}/user_{request.user.id}/{int(time.time())}-{filename}"

        try:
            bucket = supabase.storage.from_('ClinqBucket')

            if isinstance(bucket, int):
                return Response({"error": f"Bucket not found or access denied. Code: {bucket}"}, status=500)

            if hasattr(bucket, 'create_signed_upload_url'):
                res = bucket.create_signed_upload_url(file_path)
            else:
                return Response({"error": f"Failed to initialize bucket. Received: {bucket}"}, status=500)

            signed_url = None
            if isinstance(res, dict):
                signed_url = res.get('signedUrl') or res.get('signed_url')
            elif isinstance(res, str):
                signed_url = res

            if not signed_url:
                return Response({"error": "Could not generate signed URL", "debug": str(res)}, status=500)

            return Response({"upload_url": signed_url, "final_path": file_path,})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=['post'], url_path='submit-review')
    def submit_review(self, request, pk=None):
        """Submit a review/work submission for a claimed project."""
        try:
            content = self.get_object()
        except (Content.DoesNotExist, NotFound):
            return Response({"error": "Content not found."}, status=status.HTTP_404_NOT_FOUND)

        if content.assigned_clipper != request.user:
            return Response({"error": "Unauthorized. You are not assigned to this project."}, status=status.HTTP_403_FORBIDDEN)
        if content.status != 'claimed':
            return Response({"error": f"Cannot submit review. Project status is '{content.status}', expected 'claimed'.", "current_status": content.status}, status=status.HTTP_400_BAD_REQUEST)

        review_url = request.data.get('review_url')
        if not review_url:
            return Response({"error": "review_url is required."}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.validators import URLValidator
        from django.core.exceptions import ValidationError as DjangoValidationError
        validator = URLValidator()
        try:
            validator(review_url)
        except DjangoValidationError:
            return Response({"error": "Invalid URL format for review_url. Please provide a valid URL."}, status=status.HTTP_400_BAD_REQUEST)

        platform = request.data.get('platform', 'instagram')
        if platform == 'x':
            platform = 'twitter'
        valid_platforms = [choice[0] for choice in ClipSubmission.PLATFORM_CHOICES]
        if platform not in valid_platforms:
            return Response({"error": f"Invalid platform '{platform}'. Must be one of: {', '.join(valid_platforms)}", "valid_platforms": valid_platforms}, status=status.HTTP_400_BAD_REQUEST)

        existing_submission = ClipSubmission.objects.filter(project=content, clipper=request.user, post_url=review_url).first()
        if existing_submission:
            return Response({"error": "You have already submitted this URL for this project.", "submission_id": existing_submission.id}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            try:
                submission = ClipSubmission.objects.create(project=content, clipper=request.user, post_url=review_url, platform=platform)
            except Exception as e:
                if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                    return Response({"error": "This URL has already been submitted by another user."}, status=status.HTTP_400_BAD_REQUEST)
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error creating submission for content {pk}: {str(e)}", exc_info=True)
                return Response({"error": "An error occurred while submitting the review. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            content.status = 'review'
            content.save()

        return Response({"status": "success", "message": "Submitted! Our bots are verifying instructions and tracking reach.", "submission_id": submission.id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='approve-submission', permission_classes=[IsAuthenticated])
    def approve_submission(self, request, pk=None):
        """Creator marks a project as done and releases the payout."""
        try:
            content = self.get_object()
        except (Content.DoesNotExist, NotFound):
            return Response({"error": "Content not found."}, status=status.HTTP_404_NOT_FOUND)

        if content.creator != request.user:
            return Response({"error": "Only the creator can approve work."}, status=status.HTTP_403_FORBIDDEN)
        if content.status != 'review':
            return Response({"error": f"Cannot approve. Project status is '{content.status}', expected 'review'.", "current_status": content.status}, status=status.HTTP_400_BAD_REQUEST)
        if not content.assigned_clipper:
            return Response({"error": "No clipper assigned to this project."}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            content.status = 'completed'
            content.save()

            try:
                from django.core.exceptions import MultipleObjectsReturned
                transaction = Transaction.objects.select_for_update().get(content=content, user=content.assigned_clipper, status='pending')
            except Transaction.DoesNotExist:
                return Response({"error": "Pending transaction not found. Cannot release payout.", "content_id": content.id, "clipper_id": content.assigned_clipper.id}, status=status.HTTP_400_BAD_REQUEST)
            except MultipleObjectsReturned:
                transaction = Transaction.objects.select_for_update().filter(content=content, user=content.assigned_clipper, status='pending').first()
                if transaction is not None:
                    Transaction.objects.filter(content=content, user=content.assigned_clipper, status='pending').exclude(id=transaction.id).update(status='failed')

            transaction.status = 'completed'
            transaction.save()

            from accounts.models import Profile
            try:
                Profile.objects.select_for_update().get(user=content.assigned_clipper)
            except Profile.DoesNotExist:
                Profile.objects.get_or_create(user=content.assigned_clipper)

        return Response({
            "status": "success",
            "message": "Submission approved and payout released.",
            "content_id": content.id,
            "clipper_id": content.assigned_clipper.id,
        }, status=status.HTTP_200_OK)

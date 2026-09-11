from datetime import timedelta
from decimal import Decimal
import uuid

from django.db import models
from django.conf import settings
from django.db.models import Count, Prefetch, Q, Sum, F
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CreatorGig, CreatorSubmission, CreatorAnalyticsSnapshot
from .serializers import CreatorGigSerializer, CreatorSubmissionSerializer, CreatorAnalyticsSerializer
from accounts.models import Profile
from content.models import Campaign, CampaignParticipant, ClipSubmission, CampaignSubmission, CampaignResource


class CreatorDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        summary_only = request.query_params.get('summary') == 'true'
        profile = request.user.profile
        gigs_queryset = Campaign.objects.filter(creator=request.user, type='gig').order_by('-views', '-created_at')
        # Only include non-deleted creator submissions
        submissions_queryset = CreatorSubmission.objects.filter(user=request.user, is_deleted=False)

        stats = CampaignParticipant.objects.filter(clipper=request.user).aggregate(
            campaign_participations=Count('id'),
            campaign_active_participations=Count('id', filter=Q(campaign__status='active')),
        )
        campaign_submission_stats = CampaignSubmission.objects.filter(
            participant__clipper=request.user,
        ).aggregate(
            campaign_submission_count=Count('id'),
            campaign_submission_earnings=Sum('earning', filter=Q(status='approved')),
            campaign_submission_views=Sum('views', filter=Q(status='approved')),
        )

        gigs_stats = gigs_queryset.aggregate(
            total_gigs=Count('id'),
            active_gigs=Count('id', filter=Q(status__in=['active', 'available', 'paused'])),
            views_generated=Sum('views'),
        )

        analytics = None
        if not summary_only:
            analytics = CreatorAnalyticsSnapshot.objects.filter(user=request.user).order_by('-last_updated').first()

        top_gigs = [
            {
                'id': gig.id,
                'accessKey': str(gig.public_access_key),
                'title': gig.name,
                'views': gig.views or 0,
                'submissions_count': gig.submissions or 0,
                'status': gig.status,
            }
            for gig in gigs_queryset[:3]
        ]

        onboarding_data = profile.onboarding_data or {}
        payload = {
            'profile': {
                'name': f"{getattr(profile, 'first_name', '')} {getattr(profile, 'last_name', '')}".strip() or request.user.email,
                'niche': profile.primary_niche or onboarding_data.get('niche', ''),
                'interests': profile.content_interests or onboarding_data.get('interests', []),
                'handles': profile.handles or onboarding_data.get('handles', {}),
                'portfolio_url': profile.portfolio_url or onboarding_data.get('portfolioUrl') or onboarding_data.get('portfolio_url', ''),
            },
            'stats': {
                'total_gigs': gigs_stats['total_gigs'] or 0,
                'active_gigs': gigs_stats['active_gigs'] or 0,
                'views_generated': float(gigs_stats['views_generated'] or 0),
                'brand_deals': stats['campaign_active_participations'] or 0,
                'campaign_participations': stats['campaign_participations'] or 0,
                'total_earnings': float(campaign_submission_stats['campaign_submission_earnings'] or 0),
                'total_submissions': campaign_submission_stats['campaign_submission_count'] or 0,
            },
            'top_gigs': top_gigs,
        }
        if not summary_only:
            payload['recent_submissions'] = CreatorSubmissionSerializer(submissions_queryset[:5], many=True).data
            payload['analytics'] = CreatorAnalyticsSerializer(analytics).data if analytics else None
        return Response(payload)


class CreatorGigViewSet(viewsets.ModelViewSet):
    serializer_class = CreatorGigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CreatorGig.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CreatorSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = CreatorSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only show non-deleted creator submissions
        return CreatorSubmission.objects.filter(user=self.request.user, is_deleted=False)

    def _serialize_creator_submission(self, submission):
        data = CreatorSubmissionSerializer(submission).data
        data['brand_name'] = data.get('brand_name') or 'Brand'
        data['source'] = 'creator-submission'
        return data

    def _refresh_participant_prefetch_data(self, participant):
        # Only include non-deleted submissions
        participant.prefetched_submissions = list(participant.submissions.filter(is_deleted=False).order_by('-created_at'))
        participant.campaign.prefetched_resources = list(participant.campaign.resources.all().order_by('order', 'created_at'))
        return participant

    def _campaign_id_from_key(self, campaign_key):
        if str(campaign_key).isdigit():
            return campaign_key
        try:
            access_key = uuid.UUID(str(campaign_key))
        except (ValueError, TypeError, AttributeError):
            return None
        return Campaign.objects.filter(public_access_key=access_key).values_list('id', flat=True).first()

    def _serialize_campaign_participation(self, participant):
        participant.campaign.update_status_if_ended()
        campaign_status = participant.campaign.status

        if campaign_status == 'closed':
            display_status = 'Closed'
        elif campaign_status == 'paused':
            display_status = 'Paused'
        elif campaign_status == 'active':
            display_status = 'Active'
        elif campaign_status in {'inactive', 'completed'}:
            display_status = campaign_status.title()
        else:
            display_status = participant.status.title() if participant.status else 'Pending'

        # For display: show only non-deleted submissions
        display_submissions = getattr(participant, 'prefetched_submissions', participant.submissions.filter(is_deleted=False).order_by('-created_at'))
        # For calculations: use ALL submissions (including deleted) for accurate totals - fresh queryset
        all_submissions = CampaignSubmission.objects.filter(participant=participant).order_by('-created_at')
        
        published_submissions = []
        for submission in display_submissions:
            # For approved submissions, persist calculated earning if it differs
            try:
                calc = submission.calculate_earning()
            except Exception:
                calc = None

            if submission.status == 'approved' and calc is not None:
                try:
                    current = float(submission.earning or 0)
                    if round(current, 2) != round(float(calc or 0), 2):
                        # Persist the recalculated earning to DB
                        submission.update_earning()
                except Exception:
                    pass

            if submission.status == 'approved':
                try:
                    submission.update_earning()
                except Exception:
                    pass

            published_submissions.append({
                'id': submission.id,
                'platform': submission.platform.title(),
                'platformUsername': submission.platform_username,
                'contentUrl': submission.content_url,
                'earning': float(submission.earning or 0),
                'pending_earning': float(submission.pending_earning or 0),
                'views': submission.views,
                'likes': submission.likes,
                'status': submission.status.title(),
                'submitted_at': submission.created_at,
            })
        # Preserve historical contribution for soft-deleted submissions while hiding them from the visible list.
        approved_count = all_submissions.filter(status='approved').count()
        published_count = approved_count
        approved_submissions = all_submissions.filter(status='approved')
        total_reward = float(approved_submissions.aggregate(
            total=Sum('earning')
        )['total'] or 0)
        total_views = approved_submissions.aggregate(total=Sum('views'))['total'] or 0

        resources = getattr(participant.campaign, 'prefetched_resources', participant.campaign.resources.all())
        resources_payload = [
            {
                'id': resource.id,
                'name': resource.name,
                'url': resource.url,
            }
            for resource in resources
        ]

        # Resolve brand name defensively: prefer campaign.brand_name, then creator.profile.brand_name, else 'Brand'
        creator_brand_name = None
        try:
            creator_brand_name = getattr(participant.campaign.creator, 'profile', None)
            if creator_brand_name:
                creator_brand_name = getattr(creator_brand_name, 'brand_name', None)
        except Exception:
            creator_brand_name = None

        return {
            'id': f"campaign-{participant.campaign.public_access_key}",
            'title': participant.campaign.name,
            'brand_name': participant.campaign.brand_name or creator_brand_name or 'Brand',
            'status': display_status,
            'campaign_status': campaign_status,
            'reward': 0,
            'submitted_at': participant.joined_at,
            'views': 0,
            'content_url': '',
            'feedback': '',
            'published_posts': published_count,  # Include deleted submissions
            'approved_posts': approved_count,  # Include deleted submissions
            'published_submissions': published_submissions,
            'source': 'campaign-participation',
            'campaign_description': participant.campaign.description or '',
            'campaign_category': participant.campaign.category or '',
            'campaign_thumbnail': participant.campaign.thumbnail_url or '',
            'campaign_requirements': participant.campaign.clipper_requirements or '',
            'total_reward': total_reward,
            'total_views': total_views,
            'campaign_resources': resources_payload,
            'campaign_start_date': participant.campaign.start_date,
            'campaign_end_date': participant.campaign.end_date,
            'campaign_reward_per_1k': float(participant.campaign.reward_per_1k) if participant.campaign.reward_per_1k else 0,
            'campaign_max_earnings': float(participant.campaign.max_earnings) if participant.campaign.max_earnings else 0,
            'campaign_budget': float(participant.campaign.budget) if participant.campaign.budget else 0,
        }

    def list(self, request, *args, **kwargs):
        if request.query_params.get('summary') == 'true':
            creator_submissions = [
                self._serialize_creator_submission(item)
                for item in CreatorSubmission.objects.filter(
                    user=request.user,
                    is_deleted=False,
                ).select_related('gig')
            ]

            participation_queryset = CampaignParticipant.objects.filter(
                clipper=request.user,
            ).select_related(
                'campaign', 'campaign__creator', 'campaign__creator__profile',
            ).annotate(
                total_reward=Sum(
                    'submissions__earning',
                    filter=Q(submissions__status='approved'),
                ),
                total_views=Sum(
                    'submissions__views',
                    filter=Q(submissions__status='approved'),
                ),
                approved_posts=Count(
                    'submissions',
                    filter=Q(submissions__status='approved'),
                ),
            )

            campaign_participations = []
            for participant in participation_queryset:
                campaign = participant.campaign
                campaign_status = campaign.status
                if campaign_status == 'closed':
                    display_status = 'Closed'
                elif campaign_status == 'paused':
                    display_status = 'Paused'
                elif campaign_status == 'active':
                    display_status = 'Active'
                elif campaign_status in {'inactive', 'completed'}:
                    display_status = campaign_status.title()
                elif participant.approved_posts:
                    display_status = 'Active'
                else:
                    display_status = participant.status.title() if participant.status else 'Pending'

                creator_profile = getattr(campaign.creator, 'profile', None)
                campaign_participations.append({
                    'id': f'campaign-{campaign.public_access_key}',
                    'title': campaign.name,
                    'brand_name': campaign.brand_name or getattr(creator_profile, 'brand_name', None) or 'Brand',
                    'status': display_status,
                    'campaign_status': campaign_status,
                    'submitted_at': participant.joined_at,
                    'total_reward': float(participant.total_reward or 0),
                    'total_views': int(participant.total_views or 0),
                    'approved_posts': participant.approved_posts or 0,
                    'content_url': '',
                    'feedback': '',
                    'campaign_category': campaign.category or '',
                    'campaign_thumbnail': campaign.thumbnail_url or '',
                })

            merged = creator_submissions + campaign_participations
            merged.sort(key=lambda item: item.get('submitted_at') or '', reverse=True)
            return Response(merged)

        # Only show non-deleted creator submissions
        creator_submissions = [self._serialize_creator_submission(item) for item in CreatorSubmission.objects.filter(user=request.user, is_deleted=False)]

        campaign_participations = [
            self._serialize_campaign_participation(item)
            for item in CampaignParticipant.objects.filter(clipper=request.user)
            .select_related('campaign', 'campaign__creator', 'campaign__creator__profile')
            .prefetch_related(
                Prefetch(
                    'submissions',
                    queryset=CampaignSubmission.objects.filter(is_deleted=False).order_by('-created_at'),
                    to_attr='prefetched_submissions',
                ),
                Prefetch(
                    'campaign__resources',
                    queryset=CampaignResource.objects.order_by('order', 'created_at'),
                    to_attr='prefetched_resources',
                ),
            )
        ]

        merged = creator_submissions + campaign_participations
        merged.sort(key=lambda item: item.get('submitted_at') or '', reverse=True)
        return Response(merged)

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')

        if isinstance(pk, str) and pk.startswith('campaign-'):
            campaign_key = pk.split('-', 1)[1]
            campaign_id = self._campaign_id_from_key(campaign_key)
            if not campaign_id:
                return Response({'detail': 'Invalid campaign identifier.'}, status=status.HTTP_400_BAD_REQUEST)

            participant = (
                CampaignParticipant.objects.filter(campaign_id=campaign_id, clipper=request.user)
                .select_related('campaign', 'campaign__creator', 'campaign__creator__profile')
                .prefetch_related(
                    Prefetch(
                        'submissions',
                        queryset=CampaignSubmission.objects.filter(is_deleted=False).order_by('-created_at'),
                        to_attr='prefetched_submissions',
                    ),
                    Prefetch(
                        'campaign__resources',
                        queryset=CampaignResource.objects.order_by('order', 'created_at'),
                        to_attr='prefetched_resources',
                    ),
                )
                .first()
            )
            if not participant:
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(self._serialize_campaign_participation(participant))

        submission = CreatorSubmission.objects.filter(user=request.user, id=pk, is_deleted=False).first()
        if not submission:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._serialize_creator_submission(submission))

    def _normalize_platform_value(self, platform_value):
        if platform_value is None:
            return None
        return str(platform_value).strip().lower()

    @action(detail=True, methods=['post'], url_path='submit-content')
    def submit_content(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        if not isinstance(pk, str) or not pk.startswith('campaign-'):
            return Response({'detail': 'Invalid campaign submission endpoint.'}, status=status.HTTP_400_BAD_REQUEST)

        campaign_key = pk.split('-', 1)[1]
        campaign_id = self._campaign_id_from_key(campaign_key)
        if not campaign_id:
            return Response({'detail': 'Invalid campaign identifier.'}, status=status.HTTP_400_BAD_REQUEST)

        participant = (
            CampaignParticipant.objects.filter(campaign_id=campaign_id, clipper=request.user)
            .select_related('campaign', 'campaign__creator', 'campaign__creator__profile')
            .prefetch_related(
                Prefetch(
                    'submissions',
                    queryset=CampaignSubmission.objects.order_by('-created_at'),
                    to_attr='prefetched_submissions',
                ),
                Prefetch(
                    'campaign__resources',
                    queryset=CampaignResource.objects.order_by('order', 'created_at'),
                    to_attr='prefetched_resources',
                ),
            )
            .first()
        )
        if not participant:
            return Response({'detail': 'You must join this campaign before submitting content.'}, status=status.HTTP_403_FORBIDDEN)

        participant.campaign.update_status_if_ended()
        allowed_statuses = ['active'] if participant.campaign.type == 'campaign' else ['active', 'available']
        if participant.campaign.status == 'closed':
            return Response({'detail': 'This campaign has ended and is no longer accepting submissions.'}, status=status.HTTP_400_BAD_REQUEST)
        if participant.campaign.status == 'paused':
            return Response({'detail': 'This campaign is currently paused and not accepting new submissions.'}, status=status.HTTP_400_BAD_REQUEST)
        if participant.campaign.status not in allowed_statuses:
            return Response({'detail': 'This campaign is not accepting new submissions.'}, status=status.HTTP_400_BAD_REQUEST)

        if participant.has_reached_max_earnings():
            return Response({'detail': 'You have reached the maximum earning limit for this campaign and cannot submit more content.'}, status=status.HTTP_400_BAD_REQUEST)

        cooldown_info = participant.get_cooldown_info()
        if cooldown_info['is_in_cooldown']:
            return Response({
                'detail': f'You must wait before submitting your next clip. Cooling period active for {cooldown_info["hours_remaining"]:.1f} more hours.',
                'cooldown_ends_at': cooldown_info['cooldown_ends_at'],
                'hours_remaining': cooldown_info['hours_remaining'],
                'last_submission_status': cooldown_info.get('last_submission_status'),
            }, status=status.HTTP_400_BAD_REQUEST)

        platform = request.data.get('platform')
        platform_username = request.data.get('platformUsername') or request.data.get('platform_username')
        content_url = request.data.get('contentUrl') or request.data.get('content_url')

        if not platform or not content_url or not platform_username:
            return Response({'detail': 'platform, platformUsername, and contentUrl are required.'}, status=status.HTTP_400_BAD_REQUEST)

        normalized_platform = self._normalize_platform_value(platform)
        valid_platforms = [choice[0] for choice in ClipSubmission.PLATFORM_CHOICES]
        if normalized_platform not in [choice.lower() for choice in valid_platforms]:
            return Response({'detail': f"Invalid platform '{platform}'. Must be one of: {', '.join(valid_platforms)}."}, status=status.HTTP_400_BAD_REQUEST)

        campaign_platforms = getattr(participant.campaign, 'platforms', []) or []
        campaign_allowed = {self._normalize_platform_value(item) for item in campaign_platforms if item}
        if campaign_allowed and normalized_platform not in campaign_allowed:
            return Response({
                'detail': f"This campaign only accepts submissions on the following platforms: {', '.join(campaign_platforms)}."
            }, status=status.HTTP_400_BAD_REQUEST)

        from django.core.validators import URLValidator
        from django.core.exceptions import ValidationError as DjangoValidationError
        validator = URLValidator()
        try:
            validator(content_url)
        except DjangoValidationError:
            return Response({'detail': 'Invalid URL format for contentUrl.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = participant.submissions.filter(content_url=content_url).first()
        if existing:
            return Response({'detail': 'This content URL has already been submitted for this campaign.', 'submission_id': existing.id}, status=status.HTTP_400_BAD_REQUEST)

        participant.submissions.create(
            platform=platform,
            platform_username=platform_username,
            content_url=content_url,
        )

        if participant.status == 'pending':
            participant.status = 'submitted'
            participant.save(update_fields=['status'])

        participant.refresh_from_db()
        participant = self._refresh_participant_prefetch_data(participant)

        return Response(self._serialize_campaign_participation(participant), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='delete-content')
    def delete_content(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        if not isinstance(pk, str) or not pk.startswith('campaign-'):
            return Response({'detail': 'Invalid campaign submission endpoint.'}, status=status.HTTP_400_BAD_REQUEST)

        campaign_key = pk.split('-', 1)[1]
        campaign_id = self._campaign_id_from_key(campaign_key)
        if not campaign_id:
            return Response({'detail': 'Invalid campaign identifier.'}, status=status.HTTP_400_BAD_REQUEST)

        participant = (
            CampaignParticipant.objects.filter(campaign_id=campaign_id, clipper=request.user)
            .select_related('campaign', 'campaign__creator', 'campaign__creator__profile')
            .prefetch_related(
                Prefetch(
                    'submissions',
                    queryset=CampaignSubmission.objects.order_by('-created_at'),
                    to_attr='prefetched_submissions',
                ),
                Prefetch(
                    'campaign__resources',
                    queryset=CampaignResource.objects.order_by('order', 'created_at'),
                    to_attr='prefetched_resources',
                ),
            )
            .first()
        )
        if not participant:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        submission_id = request.data.get('submissionId') or request.data.get('submission_id')
        if not submission_id:
            return Response({'detail': 'submissionId is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            submission_id = int(submission_id)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid submission id.'}, status=status.HTTP_400_BAD_REQUEST)

        submission = participant.submissions.filter(id=submission_id).first()
        if not submission:
            return Response({'detail': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Soft-delete: mark as deleted instead of hard delete
        submission.is_deleted = True
        submission.save(update_fields=['is_deleted'])

        participant.refresh_from_db()
        participant = self._refresh_participant_prefetch_data(participant)

        if not participant.submissions.filter(is_deleted=False).exists():
            participant.status = 'pending'
            participant.save(update_fields=['status'])

        return Response(self._serialize_campaign_participation(participant), status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='cooldown-debug')
    def cooldown_debug(self, request, *args, **kwargs):
        """Debug endpoint to check cooldown status."""
        pk = kwargs.get('pk')
        if not isinstance(pk, str) or not pk.startswith('campaign-'):
            return Response({'detail': 'Invalid campaign submission endpoint.'}, status=status.HTTP_400_BAD_REQUEST)

        campaign_key = pk.split('-', 1)[1]
        campaign_id = self._campaign_id_from_key(campaign_key)
        if not campaign_id:
            return Response({'detail': 'Invalid campaign identifier.'}, status=status.HTTP_400_BAD_REQUEST)

        participant = (
            CampaignParticipant.objects.filter(campaign_id=campaign_id, clipper=request.user)
            .select_related('campaign', 'campaign__creator', 'campaign__creator__profile')
            .prefetch_related(
                Prefetch(
                    'submissions',
                    queryset=CampaignSubmission.objects.order_by('-created_at'),
                    to_attr='prefetched_submissions',
                ),
                Prefetch(
                    'campaign__resources',
                    queryset=CampaignResource.objects.order_by('order', 'created_at'),
                    to_attr='prefetched_resources',
                ),
            )
            .first()
        )
        if not participant:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(participant.get_cooldown_debug_info())

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to soft-delete CreatorSubmission and preserve earnings"""
        instance = self.get_object()
        
        # Only preserve earnings for approved submissions with reward > 0
        if instance.status == 'approved' and instance.reward and float(instance.reward) > 0:
            print(f'🔴 DESTROY CreatorSubmission: {instance.id}, reward={instance.reward}')
            
            try:
                from django.db import transaction as db_transaction
                from earnings.models import Transaction
                from accounts.models import Profile
                from decimal import Decimal
                
                with db_transaction.atomic():
                    # Create transaction to preserve earnings
                    Transaction.objects.create(
                        user=request.user,
                        amount=instance.reward,
                        transaction_type='earning',
                        status='completed',
                        bot_notes=f'PRESERVED: Creator Submission "{instance.title}" (Gig: {instance.gig.title if instance.gig else "N/A"}) deleted. Reward ₹{instance.reward} protected.'
                    )
                    print(f'  ✅ Transaction created to preserve ₹{instance.reward}')
                    
                    # Update profile total_earnings
                    try:
                        profile = Profile.objects.select_for_update().get(user=request.user)
                        profile.total_earnings = F('total_earnings') + instance.reward
                        profile.save(update_fields=['total_earnings'])
                        profile.refresh_from_db()
                        print(f'  ✅ Profile updated: total_earnings now ₹{profile.total_earnings}')
                    except Profile.DoesNotExist:
                        print(f'  ⚠️ Profile not found for user {request.user.id}')
                    
                    # Soft-delete: mark as deleted instead of hard delete
                    instance.is_deleted = True
                    instance.save(update_fields=['is_deleted'])
                    print(f'  ✅ CreatorSubmission soft-deleted successfully')
            except Exception as e:
                print(f'  ❌ ERROR: {e}')
                import traceback
                traceback.print_exc()
                return Response(
                    {'detail': f'Error deleting submission: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # For non-approved submissions, soft-delete normally
            instance.is_deleted = True
            instance.save(update_fields=['is_deleted'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class CreatorAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CreatorAnalyticsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CreatorAnalyticsSnapshot.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        approved_submissions = CampaignSubmission.objects.filter(
            participant__clipper=request.user,
            status='approved',
        ).select_related('participant', 'participant__campaign').order_by('-created_at')

        total_views = sum(int(submission.views or 0) for submission in approved_submissions)
        total_earned = sum(
            float(submission.earning or Decimal('0'))
            for submission in approved_submissions
        )

        platform_breakdown = []
        if total_views:
            platform_rows = list(
                approved_submissions.values('platform').annotate(total_views=Sum('views')).order_by('-total_views')
            )
            max_views = max((int(row['total_views'] or 0) for row in platform_rows), default=0)
            for row in platform_rows:
                views = int(row['total_views'] or 0)
                platform_breakdown.append({
                    'platform': (row['platform'] or '').title(),
                    'views': views,
                    'percent': round((views / total_views) * 100, 1) if total_views else 0,
                    'bar': max_views and round((views / max_views) * 100, 1) or 0,
                })

        # Top campaigns/gigs where this clipper has approved submissions
        from django.db.models import Q
        campaign_stats = {}
        for submission in approved_submissions:
            if submission.participant and submission.participant.campaign:
                campaign = submission.participant.campaign
                if campaign.id not in campaign_stats:
                    campaign_stats[campaign.id] = {
                        'id': campaign.id,
                        'name': campaign.name,
                        'views': 0,
                        'submissions': 0,
                        'payout': 0.0,
                    }
                campaign_stats[campaign.id]['views'] += int(submission.views or 0)
                campaign_stats[campaign.id]['submissions'] += 1
                campaign_stats[campaign.id]['payout'] += float(submission.earning or Decimal('0'))

        top_gigs = sorted(
            campaign_stats.values(),
            key=lambda x: (x['payout'], x['views']),
            reverse=True
        )[:3]

        def build_period_series(filter_key):
            today = timezone.now().date()
            if filter_key == '7D':
                labels = []
                for i in range(6, -1, -1):
                    day = today - timedelta(days=i)
                    labels.append({
                        'key': day.isoformat(),
                        'label': day.strftime('%a'),
                    })
            elif filter_key == '30D':
                labels = []
                for i in range(3, -1, -1):
                    end = today - timedelta(weeks=i)
                    start = end - timedelta(days=6)
                    labels.append({
                        'key': f'{start.isoformat()}-{end.isoformat()}',
                        'label': f'W{4 - i}',
                    })
            elif filter_key == '6M':
                labels = []
                for i in range(5, -1, -1):
                    month_date = today.replace(day=1)
                    month_value = (month_date.year * 12 + month_date.month) - i
                    year = month_value // 12
                    month = month_value % 12
                    if month == 0:
                        year -= 1
                        month = 12
                    month_date = today.replace(year=year, month=month, day=1)
                    labels.append({
                        'key': month_date.strftime('%Y-%m'),
                        'label': month_date.strftime('%b'),
                    })
            else:
                labels = []
                years = sorted({submission.created_at.year for submission in approved_submissions if submission.created_at})
                if not years:
                    years = [today.year]
                for year in years:
                    labels.append({'key': str(year), 'label': str(year)})

            series = []
            for label in labels:
                bucket_views = 0
                bucket_payout = 0.0
                for submission in approved_submissions:
                    created_date = submission.created_at.date() if submission.created_at else None
                    if not created_date:
                        continue
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
                        bucket_payout += float(submission.earning or Decimal('0'))

                series.append({
                    'period': label['label'],
                    'views': bucket_views,
                    'payout': round(bucket_payout, 2),
                })

            return series

        period_series = {
            filter_key: build_period_series(filter_key)
            for filter_key in ('7D', '30D', '6M', 'ALL')
        }

        payload = {
            'total_views': total_views,
            'total_earned': round(total_earned, 2),
            'unique_viewers': 0,
            'avg_watch_time_seconds': 0,
            'platform_breakdown': platform_breakdown,
            'top_gigs': top_gigs,
            'views_by_period': {
                '7D': period_series['7D'],
                '30D': period_series['30D'],
                '6M': period_series['6M'],
                'ALL': period_series['ALL'],
            },
            'payout_by_period': {
                '7D': [{'period': item['period'], 'payout': item['payout']} for item in period_series['7D']],
                '30D': [{'period': item['period'], 'payout': item['payout']} for item in period_series['30D']],
                '6M': [{'period': item['period'], 'payout': item['payout']} for item in period_series['6M']],
                'ALL': [{'period': item['period'], 'payout': item['payout']} for item in period_series['ALL']],
            },
        }
        return Response([payload])

    @action(detail=False, methods=['get'], url_path='activity')
    def activity(self, request):
        submissions = (
            CampaignSubmission.objects.filter(participant__clipper=request.user, is_deleted=False)
            .select_related('participant', 'participant__campaign')
            .order_by('-created_at')
        )

        events = []
        if not submissions.exists():
            return Response(events)

        latest_upload = submissions.first()
        approved = submissions.filter(status='approved').order_by('-updated_at')
        top_viewed = submissions.filter(status='approved').order_by('-views').first()
        latest_approved = approved.first()

        if latest_upload:
            campaign = None
            try:
                campaign = latest_upload.participant.campaign
            except Exception:
                campaign = None
            campaign_name = campaign.name if campaign else 'campaign'
            events.append({
                'id': f'upload-{latest_upload.id}',
                'type': 'upload',
                'time': latest_upload.created_at.strftime('%d %b %Y'),
                'title': latest_upload.platform_username or latest_upload.content_url or f'Clip {latest_upload.id}',
                'description': f'Uploaded a new clip for {campaign_name}.',
                'status': 'completed' if latest_upload.status == 'approved' else 'pending',
            })

        if latest_approved and latest_approved.id != latest_upload.id:
            campaign = None
            try:
                campaign = latest_approved.participant.campaign
            except Exception:
                campaign = None
            campaign_name = campaign.name if campaign else 'campaign'
            events.append({
                'id': f'approved-{latest_approved.id}',
                'type': 'approved',
                'time': latest_approved.updated_at.strftime('%d %b %Y'),
                'title': latest_approved.platform_username or latest_approved.content_url or f'Clip {latest_approved.id}',
                'description': f'Approved clip for {campaign_name}.',
                'status': 'completed',
            })

        if top_viewed and top_viewed.id not in {getattr(latest_upload, 'id', None), getattr(latest_approved, 'id', None)}:
            events.append({
                'id': f'topview-{top_viewed.id}',
                'type': 'milestone',
                'time': top_viewed.updated_at.strftime('%d %b %Y'),
                'title': top_viewed.platform_username or top_viewed.content_url or f'Clip {top_viewed.id}',
                'description': f'Top clip reached {top_viewed.views:,} views.',
                'status': 'completed',
            })

        return Response(events)

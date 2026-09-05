from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.conf import settings
from drf_spectacular.utils import extend_schema

from .models import ReferralCode, Referral, ReferralInvite
from .serializers import (
    ReferralCodeSerializer, ReferralSerializer, ReferralInviteSerializer
)


class ReferralViewSet(viewsets.ViewSet):
    """
    ViewSet for referral management
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReferralCodeSerializer

    @extend_schema(
        summary='Get referral statistics',
        description='Get referral statistics including code, link, referrals, and earnings',
        tags=['Referral'],
    )
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get referral statistics for the authenticated user
        """
        user = request.user
        
        # Get or create referral code
        referral_code, created = ReferralCode.objects.get_or_create(user=user)
        
        # Get referrals
        referrals = Referral.objects.filter(referrer=user).select_related(
            'referred_user', 'referred_user__profile'
        )
        active_referrals = referrals.filter(is_active=True)
        
        # Get invites
        invites = ReferralInvite.objects.filter(referrer=user).order_by('-sent_at')
        sent_invites = invites.count()
        accepted_invites = invites.filter(status='accepted').count()
        
        # Calculate stats
        total_referrals = referrals.count()
        total_earned = sum([float(r.referrer_bonus) for r in referrals if r.has_earned_bonus])
        
        return Response({
            'referral_code': referral_code.code,
            'referral_link': f"{settings.FRONTEND_URL.rstrip('/')}/signup?ref={referral_code.code}",
            'total_referrals': total_referrals,
            'active_referrals': active_referrals.count(),
            'total_earned': total_earned,
            'sent_invites': sent_invites,
            'accepted_invites': accepted_invites,
            'referrals': ReferralSerializer(referrals, many=True).data,
            'invites': ReferralInviteSerializer(invites[:10], many=True).data,
        })

    @extend_schema(
        summary='Send referral invite',
        description='Send a referral invite to an email address',
        tags=['Referral'],
    )
    @action(detail=False, methods=['post'], url_path='invite')
    def invite(self, request):
        """
        Send referral invite
        """
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        # Get or create referral code
        referral_code, created = ReferralCode.objects.get_or_create(user=user)
        
        # Check if user with this email already exists
        from accounts.models import CustomUser
        if CustomUser.objects.filter(email__iexact=email).exists():
            return Response(
                {'error': 'User with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if invite already sent
        if ReferralInvite.objects.filter(referrer=user, email__iexact=email).exists():
            return Response(
                {'error': 'Invite already sent to this email'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create invite
        invite_link = f"{settings.FRONTEND_URL.rstrip('/')}/signup?ref={referral_code.code}&email={email}"
        invite = ReferralInvite.objects.create(
            referrer=user,
            email=email,
            referral_code=referral_code,
            invite_link=invite_link,
            status='sent'
        )
        
        # TODO: Send email with invite link
        # send_referral_email.delay(invite.id)
        
        return Response({
            'message': 'Invite sent successfully',
            'invite': ReferralInviteSerializer(invite).data
        }, status=status.HTTP_201_CREATED)

    @extend_schema(summary='List all referrals', tags=['Referral'])
    @action(detail=False, methods=['get'])
    def list_referrals(self, request):
        """
        List all referrals made by the user
        """
        referrals = Referral.objects.filter(referrer=request.user).select_related(
            'referred_user', 'referred_user__profile'
        ).order_by('-created_at')
        serializer = ReferralSerializer(referrals, many=True)
        return Response(serializer.data)

    @extend_schema(summary='List all referral invites', tags=['Referral'])
    @action(detail=False, methods=['get'])
    def list_invites(self, request):
        """
        List all referral invites sent by the user
        """
        invites = ReferralInvite.objects.filter(referrer=request.user).order_by('-sent_at')
        serializer = ReferralInviteSerializer(invites, many=True)
        return Response(serializer.data)

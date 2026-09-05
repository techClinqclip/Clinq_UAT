from rest_framework import serializers
from .models import ReferralCode, Referral, ReferralInvite


class ReferralCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralCode
        fields = ['code', 'is_active', 'total_referrals', 'total_earnings', 'created_at']
        read_only_fields = ['code', 'total_referrals', 'total_earnings', 'created_at']


class ReferralSerializer(serializers.ModelSerializer):
    referred_user_email = serializers.CharField(source='referred_user.email', read_only=True)
    referred_user_name = serializers.SerializerMethodField()

    class Meta:
        model = Referral
        fields = [
            'id', 'referred_user_email', 'referred_user_name',
            'is_active', 'has_earned_bonus', 'referrer_bonus',
            'referred_bonus', 'created_at', 'bonus_paid_at'
        ]
        read_only_fields = ['referrer', 'referred_user', 'has_earned_bonus',
                          'referrer_bonus', 'referred_bonus', 'bonus_paid_at', 'created_at']

    def get_referred_user_name(self, obj):
        if hasattr(obj.referred_user, 'profile'):
            profile = obj.referred_user.profile
            if profile.first_name or profile.last_name:
                return f"{profile.first_name} {profile.last_name}".strip()
        return obj.referred_user.email


class ReferralInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralInvite
        fields = ['email']
        read_only_fields = ['referrer', 'referral_code', 'invite_link', 'status',
                          'sent_at', 'opened_at', 'accepted_at']


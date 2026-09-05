from django.contrib import admin
from .models import ReferralCode, Referral, ReferralInvite


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'is_active', 'total_referrals', 'total_earnings', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__email', 'code']
    readonly_fields = ['code', 'total_referrals', 'total_earnings', 'created_at', 'updated_at']


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ['referrer', 'referred_user', 'is_active', 'has_earned_bonus', 'referrer_bonus', 'created_at']
    list_filter = ['is_active', 'has_earned_bonus', 'created_at']
    search_fields = ['referrer__email', 'referred_user__email']
    readonly_fields = ['created_at', 'bonus_paid_at']


@admin.register(ReferralInvite)
class ReferralInviteAdmin(admin.ModelAdmin):
    list_display = ['referrer', 'email', 'status', 'sent_at', 'accepted_at']
    list_filter = ['status', 'sent_at']
    search_fields = ['referrer__email', 'email']
    readonly_fields = ['sent_at', 'opened_at', 'accepted_at']

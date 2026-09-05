from django.contrib import admin
from .models import UserSettings


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'theme', 'email_notifications', 'profile_visibility', 'preferred_payout_method', 'updated_at']
    list_filter = ['theme', 'email_notifications', 'profile_visibility', 'preferred_payout_method']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Notifications', {
            'fields': ('email_notifications', 'push_notifications', 'earnings_notifications',
                      'content_notifications', 'social_notifications', 'marketing_notifications')
        }),
        ('Privacy', {
            'fields': ('profile_visibility', 'show_earnings', 'show_email')
        }),
        ('App Preferences', {
            'fields': ('theme', 'language', 'timezone')
        }),
        ('Content Preferences', {
            'fields': ('default_content_category', 'auto_claim_enabled')
        }),
        ('Payment Preferences', {
            'fields': ('preferred_payout_method', 'payout_threshold')
        }),
    )

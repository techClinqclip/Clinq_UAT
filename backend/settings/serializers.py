from rest_framework import serializers
from .models import UserSettings


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            # Notifications
            'email_notifications', 'push_notifications', 'earnings_notifications',
            'content_notifications', 'social_notifications', 'marketing_notifications',
            # Privacy
            'profile_visibility', 'show_earnings', 'show_email',
            # App preferences
            'theme', 'language', 'timezone',
            # Content preferences
            'default_content_category', 'auto_claim_enabled',
            # Payment preferences
            'preferred_payout_method', 'payout_threshold',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


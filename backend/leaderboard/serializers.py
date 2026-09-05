from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import LeaderboardEntry
from accounts.serializers import ProfileSerializer


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    user_profile = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_type = serializers.CharField(source='user.type', read_only=True)

    class Meta:
        model = LeaderboardEntry
        fields = [
            'rank', 'user_email', 'user_type', 'user_profile',
            'total_earnings', 'clips_completed', 'content_created',
            'average_rating', 'engagement_score', 'score',
            'calculated_at'
        ]
        read_only_fields = ['rank', 'calculated_at']

    @extend_schema_field(ProfileSerializer(allow_null=True))
    def get_user_profile(self, obj):
        if hasattr(obj.user, 'profile'):
            return ProfileSerializer(obj.user.profile).data
        return None


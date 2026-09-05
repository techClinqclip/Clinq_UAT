from rest_framework import serializers
from .models import CreatorGig, CreatorSubmission, CreatorAnalyticsSnapshot


class CreatorGigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorGig
        fields = [
            'id', 'title', 'category', 'status', 'description', 'thumbnail_url',
            'views', 'submissions_count', 'budget', 'paid_out', 'created_at', 'updated_at'
        ]


class CreatorSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorSubmission
        fields = [
            'id', 'gig', 'title', 'brand_name', 'status', 'reward', 'submitted_at',
            'views', 'content_url', 'feedback'
        ]


class CreatorAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreatorAnalyticsSnapshot
        fields = [
            'id', 'total_views', 'unique_viewers', 'avg_watch_time_seconds',
            'total_earned', 'last_updated'
        ]

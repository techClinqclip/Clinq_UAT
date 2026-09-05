from rest_framework import serializers
from decimal import Decimal
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import Campaign, CampaignResource, Content, Bid, ClipSubmission, CampaignSubmission
from drf_spectacular.utils import extend_schema_field

class ContentSerializer(serializers.ModelSerializer):
    # Map Python snake_case to JS camelCase for discover.js
    creatorEmail = serializers.EmailField(source='creator.email', read_only=True)
    thumbnailUrl = serializers.URLField(source='thumbnail_url', read_only=True)
    rawVideoUrl = serializers.URLField(source='raw_video_url', read_only=True)
    isBiddable = serializers.BooleanField(source='is_biddable')
    highlightType = serializers.CharField(source='highlight_type', read_only=True)
    isPaidListing = serializers.BooleanField(source='is_paid_listing', read_only=True)
    assignedClipper = serializers.PrimaryKeyRelatedField(source='assigned_clipper', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    category = serializers.ChoiceField(
        choices=Content.CATEGORY_CHOICES,
        help_text="Content category"
    )
    likesCount = serializers.IntegerField(source='annotated_likes_count', read_only=True)
    isLiked = serializers.BooleanField(source='user_has_liked', read_only=True)

    class Meta:
        model = Content
        # Use the NEW camelCase names in the fields list to match frontend expectations
        fields = [
            'id', 'creatorEmail', 'title', 'description', 'category', 
            'rawVideoUrl', 'thumbnailUrl', 'isBiddable', 'budget', 
            'highlightType', 'isPaidListing', 'status', 'assignedClipper', 'createdAt','likesCount', 'isLiked'
        ]
        # These fields should NEVER be sent by the user in a POST/PUT
        read_only_fields = ['status', 'assigned_clipper', 'is_paid_listing'] # Status should be changed via specific actions, not direct PUT
    
    def validate_budget(self, value):
        """Validate budget is positive and reasonable"""
        if value <= 0:
            raise serializers.ValidationError("Budget must be greater than zero.")
        if value > Decimal('1000000.00'):  # Reasonable upper limit
            raise serializers.ValidationError("Budget exceeds maximum allowed amount.")
        return value
    
    def validate_category(self, value):
        """Validate category is from allowed choices"""
        valid_categories = [choice[0] for choice in Content.CATEGORY_CHOICES]
        if value not in valid_categories:
            raise serializers.ValidationError(
                f"Invalid category '{value}'. Must be one of: {', '.join(valid_categories)}"
            )
        return value
    
    def validate_raw_video_url(self, value):
        """Validate URL format"""
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("URL must start with http:// or https://")
        return value

class BidSerializer(serializers.ModelSerializer):
    # Mapping for Bid model
    clipperEmail = serializers.EmailField(source='clipper.email', read_only=True)
    bidAmount = serializers.DecimalField(source='bid_amount', max_digits=10, decimal_places=2)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'content', 'clipperEmail', 'pitch', 'bidAmount', 'status', 'createdAt']
        read_only_fields = ['status', 'clipper'] # Managed by logic, not user input
    
    def validate_bid_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Bid amount must be greater than zero.")
        return value

class ClipSubmissionSerializer(serializers.ModelSerializer):
    clipperEmail = serializers.EmailField(source='clipper.email', read_only=True)
    postUrl = serializers.URLField(source='post_url', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = ClipSubmission
        fields = [
            'id', 'project', 'clipperEmail', 'postUrl', 'platform', 
            'views', 'reach', 'engagement_rate', 'is_moderated', 
            'meets_instructions', 'moderation_notes', 'status', 
            'payout_triggered', 'createdAt'
        ]
        read_only_fields = ['status', 'is_moderated', 'payout_triggered']


class CampaignResourceSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(required=False, allow_blank=True)
    url = serializers.CharField(required=False, allow_blank=True)
    order = serializers.IntegerField(required=False)

    class Meta:
        model = CampaignResource
        fields = ['id', 'name', 'url', 'order']


class CampaignParticipantSerializer(serializers.Serializer):
    """Flattened participant row for a campaign."""

    clipperId = serializers.IntegerField()
    username = serializers.EmailField()
    platform = serializers.CharField()
    earned = serializers.CharField(read_only=True)

    views = serializers.IntegerField()
    reach = serializers.IntegerField()
    engagementRate = serializers.DecimalField(max_digits=8, decimal_places=2)

    status = serializers.CharField()
    payoutTriggered = serializers.BooleanField()
    postUrl = serializers.URLField()

    createdAt = serializers.DateTimeField()
    campaignId = serializers.IntegerField()


class CampaignSubmissionSerializer(serializers.ModelSerializer):
    platform = serializers.SerializerMethodField()
    platformUsername = serializers.CharField(source='platform_username')
    contentUrl = serializers.URLField(source='content_url')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    likes = serializers.IntegerField(read_only=True)
    pendingEarning = serializers.DecimalField(source='pending_earning', max_digits=10, decimal_places=2, read_only=True)
    campaignId = serializers.IntegerField(source='participant.campaign_id', read_only=True)
    campaignTitle = serializers.CharField(source='participant.campaign.name', read_only=True)
    brandName = serializers.SerializerMethodField()
    clipperId = serializers.IntegerField(source='participant.clipper_id', read_only=True)
    clipperEmail = serializers.EmailField(source='participant.clipper.email', read_only=True)
    clipperUsername = serializers.SerializerMethodField()
    isFirstSubmission = serializers.SerializerMethodField()
    reviewChecks = serializers.JSONField(source='review_checks', required=False)
    reviewNotes = serializers.CharField(source='review_notes', required=False, allow_blank=True)
    rejectionReason = serializers.CharField(source='rejection_reason', required=False, allow_blank=True)
    campaignMaxEarnings = serializers.DecimalField(source='participant.campaign.max_earnings', max_digits=12, decimal_places=2, read_only=True)
    payoutReviewStatus = serializers.CharField(source='payout_review_status', read_only=True)
    payoutReviewNotes = serializers.CharField(source='payout_review_notes', read_only=True)
    payoutReviewedAt = serializers.DateTimeField(source='payout_reviewed_at', read_only=True)

    class Meta:
        model = CampaignSubmission
        fields = [
            'id', 'platform', 'platformUsername', 'contentUrl',
            'earning', 'pendingEarning', 'views', 'likes', 'status', 'createdAt',
            'campaignId', 'campaignTitle', 'brandName', 'clipperId', 'clipperEmail',
            'isFirstSubmission', 'clipperUsername', 'reviewChecks', 'reviewNotes', 'rejectionReason',
            'payoutReviewStatus', 'payoutReviewNotes', 'payoutReviewedAt', 'campaignMaxEarnings',
        ]
        read_only_fields = ['status', 'earning', 'pendingEarning', 'views', 'likes', 'createdAt', 'campaignId', 'campaignTitle', 'brandName', 'clipperId', 'clipperEmail', 'clipperUsername', 'isFirstSubmission']

    def get_platform(self, obj):
        return obj.get_platform_display()

    def get_brandName(self, obj):
        campaign = obj.participant.campaign
        return campaign.brand_name or getattr(getattr(campaign.creator, 'profile', None), 'brand_name', None) or campaign.creator.email

    def get_isFirstSubmission(self, obj):
        return not CampaignSubmission.objects.filter(
            participant__clipper_id=obj.participant.clipper_id,
            is_deleted=False,
        ).exclude(pk=obj.pk).exists()

    def get_clipperUsername(self, obj):
        profile = getattr(obj.participant.clipper, 'profile', None)
        return getattr(profile, 'username', '') or obj.participant.clipper.email


class CampaignSerializer(serializers.ModelSerializer):

    # Override category field so DRF doesn't perform strict ChoiceField validation
    # (which would reject labels like "Gaming" instead of keys like "gaming").
    category = serializers.CharField()

    creatorEmail = serializers.EmailField(source='creator.email', read_only=True)
    accessKey = serializers.UUIDField(source='public_access_key', read_only=True)
    brandName = serializers.SerializerMethodField()
    thumbnail = serializers.CharField(source='thumbnail_url', required=False, allow_blank=True)
    thumbnailUrl = serializers.CharField(source='thumbnail_url', read_only=True)
    clipperRequirements = serializers.CharField(source='clipper_requirements', required=False, allow_blank=True)
    rewardPer1k = serializers.DecimalField(source='reward_per_1k', max_digits=10, decimal_places=2)
    maxEarnings = serializers.DecimalField(source='max_earnings', max_digits=12, decimal_places=2)
    startDate = serializers.DateField(source='start_date', required=False, allow_null=True)
    endDate = serializers.DateField(source='end_date', required=False, allow_null=True)
    platforms = serializers.ListField(child=serializers.CharField(), required=False)
    resources = CampaignResourceSerializer(many=True, required=False)
    paidOut = serializers.DecimalField(source='paid_out', max_digits=12, decimal_places=2, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    
    # Gig-specific fields
    type = serializers.CharField(required=False)
    highlightType = serializers.CharField(source='highlight_type', required=False, allow_blank=True)
    isPaidListing = serializers.BooleanField(source='is_paid_listing', required=False)
    isBiddable = serializers.BooleanField(source='is_biddable', required=False)
    assignedClipper = serializers.PrimaryKeyRelatedField(
        source='assigned_clipper',
        queryset=get_user_model().objects.all(),
        required=False,
        allow_null=True
    )
    rawVideoUrl = serializers.URLField(source='raw_video_url', required=False, allow_blank=True)
    proxyVideoUrl = serializers.URLField(source='proxy_video_url', required=False, allow_blank=True)
    reviewUrl = serializers.URLField(source='review_url', required=False, allow_blank=True)
    finalVideoUrl = serializers.URLField(source='final_video_url', required=False, allow_blank=True)
    remainingBudget = serializers.SerializerMethodField()
    needsRemainingSettlement = serializers.SerializerMethodField()
    closureReason = serializers.CharField(source='closure_reason', read_only=True)
    remainingFundsSettled = serializers.BooleanField(source='remaining_funds_settled', read_only=True)

    class Meta:
        model = Campaign
        fields = [
            'id', 'accessKey', 'type', 'creatorEmail', 'brandName', 'name', 'description', 'category',
            'thumbnail', 'thumbnailUrl', 'clipperRequirements',
            'budget', 'rewardPer1k', 'maxEarnings', 'platforms',
            'resources', 'startDate', 'endDate', 'status',
            'views', 'submissions', 'paidOut', 'createdAt', 'updatedAt',
            # Gig fields
            'highlightType', 'isPaidListing', 'isBiddable', 'assignedClipper',
            'rawVideoUrl', 'proxyVideoUrl', 'reviewUrl', 'finalVideoUrl',
            'remainingBudget', 'needsRemainingSettlement', 'closureReason',
            'remainingFundsSettled',
        ]
        read_only_fields = ['creatorEmail', 'views', 'submissions', 'paidOut', 'createdAt', 'updatedAt', 'type']

    def validate_category(self, value):
        if value is None:
            return value
        normalized = str(value).strip().lower()
        for choice_value, choice_label in Campaign.CATEGORY_CHOICES:
            if normalized == choice_value or normalized == choice_label.lower():
                return choice_value
        raise serializers.ValidationError(
            f"Invalid category '{value}'. Must be one of: {', '.join([c[1] for c in Campaign.CATEGORY_CHOICES])}"
        )

    def get_brandName(self, obj):
        if obj.brand_name:
            return obj.brand_name

        creator_profile = getattr(obj.creator, 'profile', None)
        for value in (
            getattr(creator_profile, 'brand_name', ''),
            getattr(creator_profile, 'company_name', ''),
            getattr(obj.creator, 'brand_name', ''),
            getattr(obj.creator, 'company_name', ''),
        ):
            if value and str(value).strip():
                return str(value).strip()

        profile_name = ' '.join(
            value for value in (
                getattr(creator_profile, 'first_name', ''),
                getattr(creator_profile, 'last_name', ''),
            ) if value and str(value).strip()
        ).strip()
        if profile_name:
            return profile_name

        return 'Brand'

    def get_remainingBudget(self, obj):
        return max(float(obj.budget or 0) - float(obj.paid_out or 0), 0)

    def get_needsRemainingSettlement(self, obj):
        """Settlement is required when:
        1. Campaign/gig is closed (not due to budget exhaustion)
        2. Remaining funds have not been settled
        3. There is remaining budget to settle
        
        Settlement is triggered by:
        - Manual close: User clicks Close button
        - Deadline close: Campaign naturally expires at deadline
        
        Settlement is NOT required for:
        - Budget exhaustion: Campaign auto-closed when budget is fully spent
        """
        return (
            obj.status == 'closed' 
            and obj.closure_reason != 'budget'  # Settlement for deadline and manual closures, not budget exhaustion
            and not obj.remaining_funds_settled 
            and self.get_remainingBudget(obj) > 0
        )

    def validate_platforms(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Platforms must be a list of strings.')
        normalized = [str(item).strip() for item in value if str(item).strip()]
        return normalized

    def validate_resources(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('Resources must be a list.')
        return value

    def _validate_brand_wallet_capacity(self, user, budget):
        if getattr(user, 'type', None) not in {'brand', 'creator'}:
            return

        profile = getattr(user, 'profile', None)
        if profile is None:
            raise serializers.ValidationError({
                'budget': 'Wallet is not available. Please complete your profile setup first.'
            })

        wallet_balance = Decimal(str(profile.wallet_balance or '0'))
        if budget > wallet_balance:
            raise serializers.ValidationError({
                'budget': 'Insufficient wallet balance. Add funds or lower the gig budget.'
            })

    def create(self, validated_data):
        resources_data = validated_data.pop('resources', [])
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        budget = validated_data.get('budget', Decimal('0'))

        if user is not None:
            self._validate_brand_wallet_capacity(user, Decimal(str(budget or '0')))

        campaign = Campaign.objects.create(**validated_data)
        self._save_resources(campaign, resources_data)
        return campaign

    def update(self, instance, validated_data):
        new_end_date = validated_data.get('end_date', instance.end_date)
        next_status = validated_data.get('status')

        if instance.remaining_funds_settled and next_status is not None and str(next_status).lower() != 'closed':
            raise serializers.ValidationError({
                'status': 'This campaign has already been settled and cannot be reopened.'
            })

        if instance.status == 'closed' and new_end_date is not None:
            if instance.budget and instance.paid_out >= instance.budget:
                raise serializers.ValidationError({
                    'endDate': 'Campaign budget has been exhausted. Create a new campaign instead.'
                })
            # A closed event must remain closed until the owner explicitly chooses to
            # extend the deadline or transfer the remaining funds via the dedicated actions.
            validated_data['status'] = 'closed'

        resources_data = validated_data.pop('resources', None)
        campaign = super().update(instance, validated_data)

        if campaign.status == 'paused':
            campaign.save(update_fields=['updated_at'])
        else:
            campaign.refresh_status_from_state()

        if resources_data is not None:
            campaign.resources.all().delete()
            self._save_resources(campaign, resources_data)
        return campaign

    def _save_resources(self, campaign, resources_data):
        for index, resource_data in enumerate(resources_data):
            name = (resource_data.get('name') or '').strip()
            url = (resource_data.get('url') or '').strip()
            if not name and not url:
                continue
            CampaignResource.objects.create(
                campaign=campaign,
                name=name,
                url=url,
                order=resource_data.get('order', index),
            )


class CampaignSummarySerializer(CampaignSerializer):
    class Meta:
        model = Campaign
        fields = [
            'id', 'accessKey', 'creatorEmail', 'brandName', 'name', 'category',
            'thumbnail', 'thumbnailUrl', 'budget', 'status', 'views', 'submissions',
            'paidOut', 'createdAt', 'updatedAt', 'remainingBudget',
            'needsRemainingSettlement', 'closureReason', 'remainingFundsSettled',
        ]
        read_only_fields = [
            'creatorEmail', 'views', 'submissions', 'paidOut', 'createdAt',
            'updatedAt', 'remainingBudget', 'needsRemainingSettlement',
            'closureReason', 'remainingFundsSettled',
        ]

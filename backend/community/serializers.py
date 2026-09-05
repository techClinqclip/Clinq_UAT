from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Discussion, DiscussionReply, DiscussionLike, CommunityEvent
from accounts.serializers import ProfileSerializer


def _flatten_media_values(value):
    flattened = []
    media_keys = {
        'url', 'preview', 'src', 'image', 'image_url', 'thumbnail',
        'cover', 'cover_url', 'video', 'video_url', 'media_url', 'gif', 'poster'
    }
    ignored_keys = {'type', 'mime_type', 'mimeType', 'name', 'label', 'alt', 'caption', 'description'}

    def walk(item):
        if item is None:
            return

        if isinstance(item, str):
            trimmed = item.strip()
            if trimmed:
                flattened.append(trimmed)
            return

        if isinstance(item, dict):
            for key, nested in item.items():
                if key in media_keys and isinstance(nested, str):
                    trimmed = nested.strip()
                    if trimmed:
                        flattened.append(trimmed)
                    continue
                if key in ignored_keys:
                    continue
                if isinstance(nested, (dict, list, tuple, set)):
                    walk(nested)
            return

        if isinstance(item, (list, tuple, set)):
            for nested in item:
                walk(nested)

    walk(value)

    unique = []
    seen = set()
    for entry in flattened:
        if entry not in seen:
            seen.add(entry)
            unique.append(entry)
    return unique


class MediaListField(serializers.Field):
    def to_internal_value(self, data):
        if data is None:
            return []

        if isinstance(data, str):
            data = [data]

        if isinstance(data, dict):
            data = list(data.values())

        if not isinstance(data, (list, tuple, set)):
            raise serializers.ValidationError('Not a valid list of media URLs.')

        cleaned = _flatten_media_values(data)
        return cleaned

    def to_representation(self, value):
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        if isinstance(value, dict):
            return _flatten_media_values(value)
        if isinstance(value, (list, tuple, set)):
            return _flatten_media_values(value)
        return []


class CommunityAuthorSerializer(serializers.ModelSerializer):
    user_type = serializers.SerializerMethodField()
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    cover = serializers.SerializerMethodField()

    class Meta:
        model = __import__('accounts.models', fromlist=['CustomUser']).CustomUser
        fields = [
            'id', 'email', 'user_type', 'first_name', 'last_name',
            'username', 'avatar', 'bio', 'cover'
        ]

    def _profile(self, obj):
        return getattr(obj, 'profile', None)

    def get_user_type(self, obj):
        return getattr(obj, 'type', None)

    def get_first_name(self, obj):
        profile = self._profile(obj)
        return getattr(profile, 'first_name', '') if profile else ''

    def get_last_name(self, obj):
        profile = self._profile(obj)
        return getattr(profile, 'last_name', '') if profile else ''

    def get_username(self, obj):
        profile = self._profile(obj)
        return getattr(profile, 'username', '') if profile else ''

    def get_avatar(self, obj):
        profile = self._profile(obj)
        if not profile or not getattr(profile, 'avatar', None):
            return None
        return profile.avatar.url

    def get_bio(self, obj):
        profile = self._profile(obj)
        return getattr(profile, 'bio', '') if profile else ''

    def get_cover(self, obj):
        profile = self._profile(obj)
        if not profile or not getattr(profile, 'cover', None):
            return None
        return profile.cover.url


class DiscussionReplySerializer(serializers.ModelSerializer):
    author = CommunityAuthorSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = DiscussionReply
        fields = [
            'id', 'content', 'author', 'likes_count', 'is_solution',
            'is_liked', 'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'likes_count', 'is_solution', 'created_at', 'updated_at']

    @extend_schema_field(serializers.BooleanField)
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            likes = getattr(obj, '_prefetched_objects_cache', {}).get('likes')
            if likes is not None:
                return any(like.user_id == request.user.id for like in likes)
            return DiscussionLike.objects.filter(user=request.user, reply=obj).exists()
        return False


class DiscussionSerializer(serializers.ModelSerializer):
    author = CommunityAuthorSerializer(read_only=True)
    replies = DiscussionReplySerializer(many=True, read_only=True)
    replies_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    latest_reply = serializers.SerializerMethodField()
    category = serializers.ChoiceField(
        choices=Discussion._meta.get_field('category').choices,
        help_text="Discussion category"
    )
    media = MediaListField(
        required=False,
        allow_null=True,
        help_text="List of media URLs attached to the discussion"
    )
    poll = serializers.JSONField(
        required=False,
        help_text="Poll payload for the discussion"
    )

    def validate_media(self, value):
        return _flatten_media_values(value)

    class Meta:
        model = Discussion
        fields = [
            'id', 'title', 'content', 'author', 'category', 'tags',
            'media', 'poll', 'views_count', 'likes_count', 'replies_count',
            'is_pinned', 'is_locked', 'is_liked', 'replies', 'latest_reply',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'author', 'views_count', 'likes_count', 'replies_count',
            'is_pinned', 'is_locked', 'created_at', 'updated_at'
        ]

    @extend_schema_field(serializers.BooleanField)
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            likes = getattr(obj, '_prefetched_objects_cache', {}).get('likes')
            if likes is not None:
                return any(like.user_id == request.user.id for like in likes)
            return DiscussionLike.objects.filter(user=request.user, discussion=obj).exists()
        return False

    @extend_schema_field(DiscussionReplySerializer(allow_null=True))
    def get_latest_reply(self, obj):
        replies = getattr(obj, '_prefetched_objects_cache', {}).get('replies')
        if replies is None:
            latest = obj.replies.order_by('-created_at').first()
        else:
            replies = list(replies)
            latest = replies[-1] if replies else None
        if latest:
            return DiscussionReplySerializer(latest, context=self.context).data
        return None


class DiscussionCreateSerializer(serializers.ModelSerializer):
    category = serializers.ChoiceField(
        choices=[
            ('general', 'General'),
            ('tips', 'Tips & Tricks'),
            ('showcase', 'Showcase'),
            ('help', 'Help & Support'),
            ('announcements', 'Announcements'),
        ],
        help_text="Discussion category"
    )
    media = MediaListField(
        required=False,
        allow_null=True,
        help_text="List of media URLs attached to the discussion"
    )
    poll = serializers.JSONField(
        required=False,
        help_text="Poll payload for the discussion"
    )

    def validate_media(self, value):
        return _flatten_media_values(value)

    class Meta:
        model = Discussion
        fields = ['title', 'content', 'category', 'tags', 'media', 'poll']


class CommunityEventSerializer(serializers.ModelSerializer):
    organizer = CommunityAuthorSerializer(read_only=True)
    is_registered = serializers.SerializerMethodField()

    class Meta:
        model = CommunityEvent
        fields = [
            'id', 'title', 'description', 'organizer', 'event_type',
            'start_date', 'end_date', 'location', 'is_online',
            'meeting_link', 'max_participants', 'participants_count',
            'is_featured', 'is_registered', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'organizer', 'participants_count', 'is_featured',
            'created_at', 'updated_at'
        ]

    @extend_schema_field(serializers.BooleanField)
    def get_is_registered(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.participants.filter(id=request.user.id).exists()
        return False


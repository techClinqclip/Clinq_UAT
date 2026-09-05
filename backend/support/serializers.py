from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field, OpenApiTypes
from .models import SupportTicket, SupportTicketMessage, FAQ, FAQFeedback


class SupportTicketCategoryField(serializers.ChoiceField):
    """Custom field to explicitly name the enum in OpenAPI schema"""
    def __init__(self, **kwargs):
        kwargs.setdefault('choices', SupportTicket.CATEGORY_CHOICES)
        super().__init__(**kwargs)


class SupportTicketSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_type = serializers.CharField(source='user.type', read_only=True)
    resolved_by_email = serializers.CharField(source='resolved_by.email', read_only=True, allow_null=True)
    category = SupportTicketCategoryField(help_text="Ticket category")
    messages = serializers.SerializerMethodField()

    def get_messages(self, obj):
        return SupportTicketMessageSerializer(
            obj.messages.select_related('sender').all(),
            many=True,
            context=self.context,
        ).data

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'subject', 'description', 'category',
            'priority', 'status', 'user_email', 'user_type', 'attachment',
            'admin_response', 'resolved_by_email', 'resolved_at',
            'created_at', 'updated_at', 'messages'
        ]
        read_only_fields = [
            'ticket_number', 'user', 'created_at', 'updated_at'
        ]


class SupportTicketSummarySerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_type = serializers.CharField(source='user.type', read_only=True)
    resolved_by_email = serializers.CharField(source='resolved_by.email', read_only=True, allow_null=True)
    category = SupportTicketCategoryField(help_text="Ticket category")

    class Meta:
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'subject', 'description', 'category',
            'priority', 'status', 'user_email', 'user_type', 'attachment',
            'admin_response', 'resolved_by_email', 'resolved_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'ticket_number', 'user', 'created_at', 'updated_at',
        ]


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    category = SupportTicketCategoryField(help_text="Ticket category")

    class Meta:
        model = SupportTicket
        fields = ['subject', 'description', 'category', 'priority', 'attachment']


class SupportTicketMessageSerializer(serializers.ModelSerializer):
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    sender_role = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicketMessage
        fields = ['id', 'body', 'attachment', 'sender_email', 'sender_role', 'created_at']
        read_only_fields = ['id', 'sender_email', 'sender_role', 'created_at']

    def get_sender_role(self, obj):
        if obj.sender.is_staff or obj.sender.is_superuser:
            return 'admin'
        return obj.sender.type


class FAQCategoryField(serializers.ChoiceField):
    """Custom field to explicitly name the enum in OpenAPI schema"""
    def __init__(self, **kwargs):
        kwargs.setdefault('choices', FAQ.CATEGORY_CHOICES)
        super().__init__(**kwargs)


class FAQSerializer(serializers.ModelSerializer):
    is_helpful = serializers.SerializerMethodField()
    category = FAQCategoryField(help_text="FAQ category")

    class Meta:
        model = FAQ
        fields = [
            'id', 'question', 'answer', 'category', 'is_featured',
            'views_count', 'helpful_count', 'not_helpful_count',
            'is_helpful', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'views_count', 'helpful_count', 'not_helpful_count',
            'created_at', 'updated_at'
        ]

    @extend_schema_field(serializers.BooleanField(allow_null=True))
    def get_is_helpful(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            feedback = FAQFeedback.objects.filter(faq=obj, user=request.user).first()
            if feedback:
                return feedback.is_helpful
        return None


class FAQFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQFeedback
        fields = ['faq', 'is_helpful']
        read_only_fields = ['user', 'created_at']


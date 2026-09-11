from rest_framework import serializers
from django.conf import settings
# from django.contrib.auth.models import User 
from .models import CustomUser, Profile, ProfileResource
from core.media_storage import resolve_media_url
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password # to enforce the rules set in AUTH_PASSWORD_VALIDATORS in settings.py, for password validation.


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password2 = serializers.CharField(write_only=True, required=True, min_length=8)
    type = serializers.ChoiceField(choices=CustomUser.USER_TYPE_CHOICES, required=False, write_only=True, default='creator')
    role = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'password', 'password2', 'type', 'role']

    def validate_email(self, value):
        """
        Validate email format and uniqueness
        """
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()  # Normalize email to lowercase

    def validate_password(self, value):
        """
        Basic password strength validation
        """
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long.')
        # Add more validation as needed (e.g., require numbers, special chars)
        validate_password(value) # uses settings.py rules
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords must match.'})

        role = attrs.pop('role', None)
        if role:
            attrs['type'] = role.strip().lower()
        attrs.setdefault('type', 'creator')
        return attrs

    def create(self, validated_data) -> CustomUser:
        validated_data.pop('password2') # remove password2
        password = validated_data.pop('password')

        user = CustomUser(**validated_data)
        user.set_password(password) # properly hashes the password
        user.save()
        return user

    def to_representation(self, instance):
        """
        controls what response is sent after signup
        """
        refresh = RefreshToken.for_user(instance)
        profile_data = None

        try:
            profile = instance.profile
            profile_data = {
                'company_name': profile.company_name,
                'brand_name': profile.brand_name,
                'manager_first_name': profile.manager_first_name,
                'manager_last_name': profile.manager_last_name,
                'primary_niche': profile.primary_niche,
                'content_interests': profile.content_interests,
                'handles': profile.handles,
                'onboarding_data': profile.onboarding_data or {},
            }
        except Profile.DoesNotExist:
            profile_data = None

        return {
            'id': instance.id,
            'email': instance.email,
            'user_type': instance.type,
            'user': {
                'id': instance.id,
                'email': instance.email,
                'user_type': instance.type,
            },
            'profile': profile_data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }


class ProfileResourceSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(required=False, allow_blank=True)
    url = serializers.URLField(required=False, allow_blank=True)
    order = serializers.IntegerField(required=False)

    class Meta:
        model = ProfileResource
        fields = ['id', 'name', 'url', 'order']


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    user_type = serializers.SerializerMethodField()
    resources = ProfileResourceSerializer(many=True, required=False)
    avatar = serializers.SerializerMethodField()
    cover = serializers.SerializerMethodField()

    def get_user_type(self, obj):
        return 'admin' if obj.user.is_staff or obj.user.is_superuser else obj.user.type

    class Meta:
        model = Profile
        fields = [
            'email', 'user_type',
            'bio', 'location', 'avatar', 'cover',
            'onboarding_data',
            'first_name', 'last_name', 'date_of_birth', 'gender', 'contact_number',

            'company_name', 'brand_name', 'website_url', 'company_description',
            'manager_first_name', 'manager_last_name', 'manager_role', 'manager_contact',
            'manager_email', 'manager_dob', 'company_email',
            'industry', 'company_size', 'founded_year', 'languages', 'handles',
            'primary_niche', 'content_interests', 'portfolio_url',
            'username', 'experience_level', 'experience_description', 'editing_tools', 'skills',

            # company description: we only keep company_description (about_company removed)
            'city', 'state', 'country',

            'payment_method',
            'email_notifications',
            'bank_account_holder', 'bank_account_number', 'bank_ifsc', 'bank_name',
            'upi_id',
            'total_earnings',
            'rating', 'clips_completed', 'views_generated',
            'resources',
        ]

    def update(self, instance, validated_data):
        resources_data = validated_data.pop('resources', None)
        profile = super().update(instance, validated_data)

        if resources_data is not None:
            profile.resources.all().delete()
            for index, resource_data in enumerate(resources_data):
                name = (resource_data.get('name') or '').strip()
                url = (resource_data.get('url') or '').strip()
                if not name and not url:
                    continue
                ProfileResource.objects.create(profile=profile, name=name, url=url, order=index)

        return profile

    def to_representation(self, instance):
        """Hide sensitive fields for non-owners."""
        representation = super().to_representation(instance)
        request = self.context.get('request')

        sensitive_fields = ['upi_id', 'total_earnings']

        is_owner = request and request.user.is_authenticated and request.user.id == instance.user.id
        if not is_owner:
            for field in sensitive_fields:
                representation.pop(field, None)

        return representation

    def _build_media_url(self, request, field_file):
        if not field_file:
            return None
        url = resolve_media_url(field_file)

        if not url:
            return None
        if url.startswith(('https://', 'http://')):
            return url

        if request:
            try:
                return request.build_absolute_uri(url)
            except Exception:
                pass

        base = getattr(settings, 'VITE_API_BASE_URL', None)
        if base:
            base = str(base).rstrip('/')
            if url.startswith('/'):
                return f"{base}{url}"
            return f"{base}/{url}"

        return url

    def get_avatar(self, instance):
        request = self.context.get('request')
        return self._build_media_url(request, getattr(instance, 'avatar', None))

    def get_cover(self, instance):
        request = self.context.get('request')
        return self._build_media_url(request, getattr(instance, 'cover', None))


from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
import logging
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.tokens import default_token_generator
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
import requests
import base64
import json
import mimetypes
import re
import uuid
import binascii
from datetime import timedelta

# for Signup(Register) view
from rest_framework import generics, status
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample

# for profile view
from rest_framework import viewsets
from rest_framework.decorators import action
from .models import CustomUser, Profile, PasswordResetToken
from .serializers import RegisterSerializer, ProfileSerializer
from .email_utils import sha256_hexdigest
from core.media_storage import upload_public_media
from decimal import Decimal
from content.models import CampaignSubmission

class ProfileViewSet(viewsets.ModelViewSet):
    # Optimize queryset with select_related to prevent N+1 queries
    queryset = Profile.objects.select_related('user').all()
    serializer_class = ProfileSerializer
    # Allow reading public profiles, but require auth for updates/me
    permission_classes = [IsAuthenticatedOrReadOnly] 
    lookup_field = 'user__id' # Allows us to use /profile/1/ where 1 is user ID

    def get_queryset(self):
        """
        Optimize queryset with select_related to prevent N+1 queries.
        We keep this returning .all() so Public Profiles (retrieve) still work.
        """
        return Profile.objects.select_related('user').all()

    def list(self, request, *args, **kwargs):
        """
        OVERRIDE: Handles GET /api/auth/profile/
        Returns ONLY the current user's profile as a single object.
        Fixes the issue where the frontend received a list of all users.
        """
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            # Fetch the logged-in user's profile
            profile = request.user.profile
            # Serialize it
            serializer = self.get_serializer(profile)
            # Return single object (not a list)
            return Response(serializer.data)
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get', 'patch', 'put'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Handles /api/auth/profile/me/
        """
        logger = logging.getLogger(__name__)
        try:
            auth_hdr = request.headers.get('Authorization')
        except Exception:
            auth_hdr = None
        logger.info(f"[ProfileMe] method={request.method} origin={request.META.get('HTTP_ORIGIN')} auth_present={'yes' if auth_hdr else 'no'} authenticated={getattr(request.user, 'is_authenticated', False)} user_id={getattr(request.user, 'pk', None)}")
        # Use select_related to get both Profile and User in one locked row
        profile, created = Profile.objects.select_related('user').get_or_create(user=request.user)
        
        cache_key = f'profile_me:{request.user.pk}'
        if request.method == 'GET':
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                # Staff users are effective admins even though the custom
                # user type choices only contain end-user roles. Correct any
                # stale cached profile payload before returning it.
                cached_data = {**cached_data}
                if request.user.is_staff or request.user.is_superuser:
                    cached_data['user_type'] = 'admin'
                # Ensure cached payload includes up-to-date total_earnings
                try:
                    if 'total_earnings' not in cached_data:
                        total = CampaignSubmission.objects.filter(
                            participant__clipper=request.user,
                            status='approved'
                        ).aggregate(sum=__import__('django').db.models.Sum('earning'))['sum'] or Decimal('0.00')
                        cached_data['total_earnings'] = float(total)
                        cache.set(cache_key, cached_data, getattr(settings, 'CACHE_TIMEOUT', 60 * 15))
                except Exception:
                    pass
                return Response(cached_data)

            # Use full serializer for own profile (includes sensitive fields)
            serializer = self.get_serializer(profile)
            response_data = serializer.data

            # Compute up-to-date total earnings from approved campaign submissions
            try:
                total = CampaignSubmission.objects.filter(
                    participant__clipper=request.user,
                    status='approved'
                ).aggregate(sum=__import__('django').db.models.Sum('earning'))['sum'] or Decimal('0.00')
                # Ensure a numeric JSON-friendly value
                response_data['total_earnings'] = float(total)
            except Exception:
                # If anything goes wrong, leave the serializer value as-is
                pass
            cache.set(cache_key, response_data, getattr(settings, 'CACHE_TIMEOUT', 60 * 15))
            return Response(response_data)

        # Handle Update (PUT/PATCH)
        # Allow resources to be provided either at top-level or nested inside onboarding_data
        incoming = request.data
        try:
            # if incoming is a QueryDict-like, make a mutable copy
            incoming = incoming.copy()
        except Exception:
            incoming = dict(incoming)

        def decode_base64_image(value):
            if not isinstance(value, str):
                return None
            match = re.match(r'^data:(?P<mime>image/[^;]+);base64,(?P<data>.+)$', value)
            if not match:
                return None
            try:
                decoded_bytes = base64.b64decode(match.group('data'))
            except (TypeError, binascii.Error):
                return None
            mime_type = match.group('mime')
            extension = mimetypes.guess_extension(mime_type) or '.png'
            filename = f"{uuid.uuid4().hex}{extension}"
            return SimpleUploadedFile(
                name=filename,
                content=decoded_bytes,
                content_type=mime_type,
            )

        def get_value(mapping, *keys):
            if not isinstance(mapping, dict):
                return None
            for key in keys:
                if key in mapping and mapping[key] not in (None, ''):
                    return mapping[key]
            return None

        for image_field in ['avatar', 'cover']:
            uploaded_file = None
            if image_field in request.FILES:
                uploaded_file = request.FILES[image_field]
            elif isinstance(incoming.get(image_field), str):
                uploaded_file = decode_base64_image(incoming.get(image_field))

            if uploaded_file is not None:
                logger.info(f"[ProfileUpdate] received image for {image_field} user={request.user.pk} filename={getattr(uploaded_file, 'name', '<in-memory>')} content_type={getattr(uploaded_file, 'content_type', None)}")
                try:
                    image_url = upload_public_media(
                        uploaded_file,
                        folder=f"profiles/{request.user.pk}/{image_field}",
                    )
                except Exception:
                    logger.exception("[ProfileUpdate] image upload failed for user=%s", request.user.pk)
                    return Response(
                        {'detail': 'Unable to store the image. Please try again.'},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
                setattr(profile, image_field, image_url)
                incoming.pop(image_field, None)
                profile.save(update_fields=[image_field])
                logger.info(f"[ProfileUpdate] saved image for {image_field} user={request.user.pk} url={image_url}")

        if not incoming.get('resources') and isinstance(incoming.get('onboarding_data'), dict) and incoming['onboarding_data'].get('resources'):
            incoming['resources'] = incoming['onboarding_data'].get('resources')

        onboarding_data = incoming.get('onboarding_data') if isinstance(incoming.get('onboarding_data'), dict) else {}
        payload = {**(onboarding_data or {}), **incoming}

        if onboarding_data:
            # Merge into JSON blob for backward compatibility
            profile.onboarding_data = {**(profile.onboarding_data or {}), **onboarding_data}

        if payload:
            # Persist well-known onboarding keys into explicit DB columns
            fields_to_update = ['onboarding_data']

            niche = get_value(payload, 'niche', 'primary_niche')
            if niche:
                profile.primary_niche = niche
                fields_to_update.append('primary_niche')

            interests = get_value(payload, 'interests', 'content_interests')
            if isinstance(interests, (list, tuple)):
                profile.content_interests = list(interests)
                fields_to_update.append('content_interests')

            handles_in = get_value(payload, 'handles', 'platform_handles')
            if isinstance(handles_in, dict):
                profile.handles = {**(profile.handles or {}), **handles_in}
                fields_to_update.append('handles')

            portfolio = get_value(payload, 'portfolioUrl', 'portfolio_url')
            if portfolio:
                profile.portfolio_url = portfolio
                fields_to_update.append('portfolio_url')

            # Personal fields
            first_name = get_value(payload, 'first_name', 'firstName')
            if first_name:
                profile.first_name = first_name
                fields_to_update.append('first_name')
            last_name = get_value(payload, 'last_name', 'lastName')
            if last_name:
                profile.last_name = last_name
                fields_to_update.append('last_name')
            dob_value = get_value(payload, 'date_of_birth', 'dob', 'dateOfBirth')
            if dob_value:
                try:
                    profile.date_of_birth = dob_value
                    fields_to_update.append('date_of_birth')
                except Exception:
                    pass
            gender = get_value(payload, 'gender')
            if gender:
                profile.gender = gender
                fields_to_update.append('gender')
            contact = get_value(payload, 'contact_number', 'contactNumber', 'contact')
            if contact:
                profile.contact_number = contact
                fields_to_update.append('contact_number')
            username = get_value(payload, 'username')
            if username:
                profile.username = username
                fields_to_update.append('username')
            experience_level = get_value(payload, 'experience_level', 'experienceLevel', 'experience')
            if experience_level:
                profile.experience_level = experience_level
                fields_to_update.append('experience_level')
            experience_description = get_value(payload, 'experience_description', 'experienceDescription')
            if experience_description:
                profile.experience_description = experience_description
                fields_to_update.append('experience_description')
            editing_tools = payload.get('editingTools') if 'editingTools' in payload else None
            if isinstance(editing_tools, (list, tuple)):
                profile.editing_tools = list(editing_tools)
                fields_to_update.append('editing_tools')
            skills = payload.get('skills') if 'skills' in payload else None
            if isinstance(skills, (list, tuple)):
                profile.skills = list(skills)
                fields_to_update.append('skills')
            bio = get_value(payload, 'bio')
            if bio:
                profile.bio = bio
                fields_to_update.append('bio')
            languages = get_value(payload, 'languages')
            if isinstance(languages, (list, tuple)):
                profile.languages = list(languages)
                fields_to_update.append('languages')
            city = get_value(payload, 'city')
            if city:
                profile.city = city
                fields_to_update.append('city')
            state = get_value(payload, 'state')
            if state:
                profile.state = state
                fields_to_update.append('state')
            country = get_value(payload, 'country')
            if country:
                profile.country = country
                fields_to_update.append('country')
            payment_method = get_value(payload, 'payment_method', 'paymentMethod')
            if payment_method:
                profile.payment_method = payment_method
                fields_to_update.append('payment_method')
            upi_id = get_value(payload, 'upi_id', 'upiId')
            if upi_id:
                profile.upi_id = upi_id
                fields_to_update.append('upi_id')
            email_notifications = get_value(payload, 'email_notifications', 'emailNotifications')
            if email_notifications is not None:
                profile.email_notifications = bool(email_notifications)
                fields_to_update.append('email_notifications')
            bank_account_holder = get_value(payload, 'bankAccountHolder')
            if bank_account_holder:
                profile.bank_account_holder = bank_account_holder
                fields_to_update.append('bank_account_holder')
            bank_account_number = get_value(payload, 'bankAccountNumber')
            if bank_account_number:
                profile.bank_account_number = bank_account_number
                fields_to_update.append('bank_account_number')
            bank_ifsc = get_value(payload, 'bankIfsc')
            if bank_ifsc:
                profile.bank_ifsc = bank_ifsc
                fields_to_update.append('bank_ifsc')
            bank_name = get_value(payload, 'bankName')
            if bank_name:
                profile.bank_name = bank_name
                fields_to_update.append('bank_name')

            # Clipper-specific fields
            onboarding_updates = {}
            experience = get_value(payload, 'experience', 'experienceLevel')
            if experience:
                onboarding_updates['experience'] = experience
                onboarding_updates['experienceLevel'] = experience

            experience_description = get_value(payload, 'experienceDescription')
            if experience_description:
                onboarding_updates['experienceDescription'] = experience_description

            portfolio = get_value(payload, 'portfolioUrl', 'portfolio_url')
            if portfolio:
                profile.portfolio_url = portfolio
                fields_to_update.append('portfolio_url')
                onboarding_updates['portfolioUrl'] = portfolio

            if 'editingTools' in payload:
                onboarding_updates['editingTools'] = list(payload['editingTools'])
            if 'skills' in payload:
                onboarding_updates['skills'] = list(payload['skills'])
            if username:
                onboarding_updates['username'] = username
            if experience_level:
                onboarding_updates['experienceLevel'] = experience_level
            if experience_description:
                onboarding_updates['experienceDescription'] = experience_description
            if 'categories' in payload:
                onboarding_updates['categories'] = list(payload['categories'])
            if 'languages' in payload:
                onboarding_updates['languages'] = list(payload['languages'])
            if bank_account_holder:
                onboarding_updates['bankAccountHolder'] = bank_account_holder
            if bank_account_number:
                onboarding_updates['bankAccountNumber'] = bank_account_number
            if bank_ifsc:
                onboarding_updates['bankIfsc'] = bank_ifsc
            if bank_name:
                onboarding_updates['bankName'] = bank_name

            username = get_value(payload, 'username')
            if username:
                onboarding_updates['username'] = username

            if onboarding_updates:
                profile.onboarding_data = {**(profile.onboarding_data or {}), **onboarding_updates}
                fields_to_update.append('onboarding_data')

            profile.save(update_fields=list(dict.fromkeys(fields_to_update)))

        serializer = self.get_serializer(profile, data=incoming, partial=True)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # Lock the user row for update
                    # Update CustomUser fields if provided
                    user = CustomUser.objects.select_for_update().get(pk=request.user.pk)
                    email = request.data.get('email')
                    role = request.data.get('role') or request.data.get('type') or request.data.get('user_type')

                    if role:
                        normalized_role = str(role).strip().lower()
                        if normalized_role in dict(CustomUser.USER_TYPE_CHOICES):
                            user.type = normalized_role
                            user.save(update_fields=['type'])

                    if email and email.lower() != user.email.lower():
                        normalized_email = email.lower()
                        if CustomUser.objects.filter(email__iexact=normalized_email).exclude(pk=user.pk).exists():
                            return Response({'email': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

                        user.email = normalized_email
                        user.save()
                    
                    serializer.save()
                    logger.info(f"[ProfileUpdate] serializer.save complete for user={request.user.pk}; deleting cache {cache_key}")
                    cache.delete(cache_key)
                    logger.info(f"[ProfileUpdate] cache deleted {cache_key}")
                return Response(serializer.data)
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response(
                    {'error': 'An error occurred while updating your profile.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            except IntegrityError:
                return Response({'email': 'This email is already taken.'}, status=400)
        # Log serializer errors for easier debugging
        print(f"[ProfileUpdate] serializer_errors={serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def retrieve(self, request, *args, **kwargs):
        """
        Handles /api/auth/profile/<id>/ (Public View)
        Note: Sensitive fields are filtered out in the serializer for public views
        """
        # lookup_field 'user__id' ensures we find profile by the User ID
        return super().retrieve(request, *args, **kwargs)
  

class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if not username:
            return Response(
                {'detail': 'Username query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        username_lower = username.lower()
        usernames = Profile.objects.filter(username__iexact=username_lower)
        if request.user.is_authenticated:
            usernames = usernames.exclude(user=request.user)

        return Response({'available': not usernames.exists()})


def decode_jwt_payload(token):
    if not token:
        return None

    parts = token.split('.')
    if len(parts) < 2:
        return None

    payload = parts[1]
    payload += '=' * (-len(payload) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def verify_supabase_access_token(access_token):
    if not access_token:
        raise ValueError('Access token is required')

    # Try local JWT decode first (fast path)
    payload = decode_jwt_payload(access_token)
    if payload and payload.get('email'):
        return payload

    supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
    supabase_key = getattr(settings, 'SUPABASE_ANON_KEY', None) or getattr(settings, 'SUPABASE_KEY', None)

    if not supabase_url or not supabase_key:
        raise ValueError('Supabase credentials are not configured')

    token_prefix = str(access_token)[:16]
    print(f"[GoogleAuth] verify_supabase_access_token: token_prefix={token_prefix} len={len(str(access_token))}")

    response = requests.get(
        f'{supabase_url}/auth/v1/user',
        headers={
            'apikey': supabase_key,
            'Authorization': f'Bearer {access_token}',
        },
        timeout=10,
    )

    if not response.ok:
        try:
            body = response.json()
        except Exception:
            body = response.text
        print(f"[GoogleAuth] Supabase /auth/v1/user failed: status={response.status_code} body={body}")

    response.raise_for_status()
    return response.json()


def _build_user_auth_response(user):
    user_type = 'admin' if user.is_staff or user.is_superuser else user.type
    user_data = {
        'id': user.id,
        'email': user.email,
        'user_type': user_type,
        'user': {
            'id': user.id,
            'email': user.email,
            'user_type': user_type,
        },
    }

    try:
        profile = user.profile
        user_data['profile'] = {
            # Brand fields
            'company_name': profile.company_name,
            'brand_name': profile.brand_name,
            'manager_first_name': profile.manager_first_name,
            'manager_last_name': profile.manager_last_name,
            # Creator fields
            'primary_niche': profile.primary_niche,
            'content_interests': profile.content_interests,
            # Clipper fields
            'experience_level': profile.experience_level,
            'editing_tools': profile.editing_tools,
            'skills': profile.skills,
            # Common fields
            'handles': profile.handles,
            'onboarding_data': profile.onboarding_data or {},
        }
    except Profile.DoesNotExist:
        user_data['profile'] = None

    return user_data


@extend_schema(
    tags=['Authentication'],
    summary='Check authentication status',
    description='Useful for the new frontend to determine whether the user is already signed in before showing login or dashboard screens.',
    responses={
        200: OpenApiResponse(
            description='Authentication status returned successfully.',
        )
    },
)
class AuthStatusView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if request.user and request.user.is_authenticated:
            return Response({
                'authenticated': True,
                'user': {
                    'id': request.user.id,
                    'email': request.user.email,
                    'user_type': 'admin' if request.user.is_staff or request.user.is_superuser else getattr(request.user, 'type', 'creator'),
                },
            }, status=status.HTTP_200_OK)

        return Response({'authenticated': False}, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Authentication'],
    summary='Authenticate with Google',
    description='Exchanges a Google access token for the app JWT session. This endpoint is intended for the new frontend OAuth flow and creates the user if they do not already exist.',
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'access_token': {'type': 'string', 'description': 'Google access token received from the frontend after OAuth.'},
                'provider': {'type': 'string', 'default': 'google'},
                'type': {'type': 'string', 'default': 'creator'},
            },
            'required': ['access_token'],
        }
    },
    responses={
        200: OpenApiResponse(description='JWT access and refresh tokens returned for the authenticated user.'),
        400: OpenApiResponse(description='Missing access token or unsupported provider.'),
        401: OpenApiResponse(description='Google token could not be validated.'),
        500: OpenApiResponse(description='Server-side configuration issue during authentication.'),
    },
    examples=[
        OpenApiExample(
            'Google auth example',
            value={
                'access_token': 'google_access_token_here',
                'provider': 'google',
                'type': 'creator',
            },
            request_only=True,
        )
    ],
)
class SocialLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        print(f"[GoogleAuth] SocialLoginView reached. payload_keys={list(request.data.keys())}")

        provider = (request.data.get('provider') or 'google').lower()
        user_type = request.data.get('type') or 'creator'
        credential = request.data.get('id_token') or request.data.get('credential') or request.data.get('access_token')

        print(f"[GoogleAuth] provider={provider} user_type={user_type} credential_len={len(str(credential)) if credential else 0}")

        if provider != 'google':
            return Response({'detail': 'Only Google sign-in is supported.'}, status=status.HTTP_400_BAD_REQUEST)

        if not credential:
            return Response({'detail': 'Google credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_payload = verify_supabase_access_token(credential)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except requests.RequestException:
            fallback_payload = decode_jwt_payload(credential)
            if fallback_payload and fallback_payload.get('email'):
                user_payload = fallback_payload
            else:
                return Response({'detail': 'Unable to validate Google sign-in token.'}, status=status.HTTP_400_BAD_REQUEST)

        email = (user_payload.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'No email found in Google sign-in response.'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = CustomUser.objects.get_or_create(
            email__iexact=email,
            defaults={'email': email, 'type': user_type},
        )

        if created:
            user.set_unusable_password()
            user.save(update_fields=['password', 'type'])
        else:
            if user_type and user.type != user_type:
                user.type = user_type
                user.save(update_fields=['type'])

        refresh = RefreshToken.for_user(user)
        auth_response = _build_user_auth_response(user)
        auth_response.update({'refresh': str(refresh), 'access': str(refresh.access_token)})

        return Response(auth_response, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Authentication'],
    summary='Public frontend configuration',
    description='Returns minimal public configuration required by the frontend (anon keys, URLs).',
    responses={200: OpenApiResponse(description='Public config returned.')},
)
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        auth_response = _build_user_auth_response(user)
        auth_response.update({'refresh': str(refresh), 'access': str(refresh.access_token)})
        return Response(auth_response, status=status.HTTP_200_OK)


class PublicFrontendConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        # Only expose non-sensitive, client-side values (anon key is safe for clients)
        from django.conf import settings as dj_settings
        data = {
            'VITE_SUPABASE_URL': getattr(dj_settings, 'SUPABASE_URL', None) or None,
            'VITE_SUPABASE_ANON_KEY': getattr(dj_settings, 'SUPABASE_ANON_KEY', None) or getattr(dj_settings, 'SUPABASE_KEY', None) or None,
            'VITE_API_BASE_URL': getattr(dj_settings, 'VITE_API_BASE_URL', None) or None,
            'VITE_OAUTH_REDIRECT_URL': getattr(dj_settings, 'VITE_OAUTH_REDIRECT_URL', None) or None,
        }
        return Response(data)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.filter(email__iexact=email).first()
        if user is None:
            return Response({'detail': 'If an account exists for this email, a reset link has been sent.'}, status=status.HTTP_200_OK)

        token = default_token_generator.make_token(user)
        token_hash = sha256_hexdigest(token)
        expires_at = timezone.now() + timedelta(minutes=30)

        PasswordResetToken.objects.filter(user=user).delete()
        PasswordResetToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        subject = 'Reset your Clinq password'
        message = (
            f"Hello,\n\n"
            f"We received a request to reset your password. Use this link to continue:\n\n"
            f"{reset_url}\n\n"
            f"This link is valid for 30 minutes. If you did not request this, you can ignore this email.\n\n"
            f"Thanks,\nClinq Team"
        )

        try:
            send_mail(subject, message, getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@clinq.app', [user.email], fail_silently=False)
        except Exception:
            logging.exception('Failed to send reset password email')
            return Response({'detail': 'Unable to send reset email right now.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'detail': 'If an account exists for this email, a reset link has been sent.'}, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        password = request.data.get('password') or ''

        if not token:
            return Response({'detail': 'Reset token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

        token_hash = sha256_hexdigest(token)
        reset_token = PasswordResetToken.objects.filter(
            token_hash=token_hash,
            used_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).select_related('user').first()

        if reset_token is None:
            return Response({'detail': 'This reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'This reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=['password'])

        reset_token.used_at = timezone.now()
        reset_token.save(update_fields=['used_at', 'updated_at'])
        reset_token.delete()
        PasswordResetToken.objects.filter(user=user).delete()

        return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)


# register new user 
# Signup view 
class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer

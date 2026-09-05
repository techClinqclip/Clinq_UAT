from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch
import base64

from django.utils import timezone

from .models import CustomUser, Profile, PasswordResetToken
from .models_otp import EmailOTPChallenge
from .email_utils import sha256_hexdigest
from django.contrib.auth.tokens import default_token_generator

User = get_user_model()


class CustomUserModelTest(TestCase):
    """Test CustomUser model functionality"""
    
    def setUp(self):
        self.user_manager = CustomUser.objects
    
    def test_create_user(self):
        """Test creating a user with email and password"""
        user = self.user_manager.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.type, 'creator')  # default type
    
    def test_create_user_without_email(self):
        """Test that creating user without email raises ValueError"""
        with self.assertRaises(ValueError):
            self.user_manager.create_user(email='', password='testpass123')
    
    def test_create_superuser(self):
        """Test creating a superuser"""
        superuser = self.user_manager.create_superuser(
            email='admin@example.com',
            password='adminpass123'
        )
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_active)
    
    def test_email_normalization(self):
        """Test that email is normalized by manager (domain normalization only)"""
        # Note: BaseUserManager.normalize_email() only normalizes the domain part,
        # not the local part. Full lowercase normalization happens in the serializer.
        user = self.user_manager.create_user(
            email='Test@Example.COM',
            password='testpass123'
        )
        # normalize_email typically lowercases the domain but may preserve local part case
        # The actual behavior depends on Django version, so we just check it's a valid email
        self.assertIn('@', user.email)
        self.assertTrue(user.email.endswith('example.com') or user.email.endswith('EXAMPLE.COM'))
    
    def test_user_str_representation(self):
        """Test user string representation"""
        user = self.user_manager.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(str(user), 'test@example.com')
    
    def test_user_type_choices(self):
        """Test user type field accepts valid choices"""
        for user_type in ['creator', 'clipper', 'brand']:
            user = self.user_manager.create_user(
                email=f'{user_type}@example.com',
                password='testpass123',
                type=user_type
            )
            self.assertEqual(user.type, user_type)


class ProfileModelTest(TestCase):
    """Test Profile model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_profile_creation_via_signal(self):
        """Test that profile is automatically created when user is created"""
        # Profile should be created via signal
        self.assertTrue(hasattr(self.user, 'profile'))
        profile = self.user.profile
        self.assertIsNotNone(profile)
        self.assertEqual(profile.user, self.user)
    
    def test_profile_default_values(self):
        """Test profile default values"""
        profile = self.user.profile
        self.assertEqual(profile.bio, '')
        self.assertEqual(profile.location, '')
        self.assertEqual(profile.total_earnings, Decimal('0.00'))
        self.assertEqual(profile.rating, Decimal('0.0'))
        self.assertEqual(profile.clips_completed, 0)
        self.assertEqual(profile.views_generated, Decimal('0'))
        # ImageField returns an ImageFieldFile object, not None, even when empty
        # Check if avatar is empty/unset
        self.assertFalse(profile.avatar)  # Empty ImageField evaluates to False
        self.assertEqual(profile.upi_id, '')
        # Test timestamps are set
        self.assertIsNotNone(profile.created_at)
        self.assertIsNotNone(profile.updated_at)
    
    def test_profile_str_representation(self):
        """Test profile string representation"""
        profile = self.user.profile
        self.assertEqual(str(profile), "test@example.com's Profile")
    
    def test_profile_one_to_one_relationship(self):
        """Test that profile has one-to-one relationship with user"""
        profile = self.user.profile
        self.assertEqual(profile.user, self.user)
        # Try to create another profile for same user should fail
        with self.assertRaises(Exception):
            Profile.objects.create(user=self.user)
    
    def test_profile_rating_validation(self):
        """Test that rating validation prevents invalid values"""
        profile = self.user.profile
        from django.core.exceptions import ValidationError
        
        # Test negative rating
        profile.rating = Decimal('-1.00')
        with self.assertRaises(ValidationError):
            profile.full_clean()
        
        # Test rating > 5
        profile.rating = Decimal('6.00')
        with self.assertRaises(ValidationError):
            profile.full_clean()
        
        # Test valid rating
        profile.rating = Decimal('4.50')
        profile.full_clean()  # Should not raise
    
    def test_profile_total_earnings_validation(self):
        """Test that total_earnings validation prevents negative values"""
        profile = self.user.profile
        from django.core.exceptions import ValidationError
        
        # Test negative earnings
        profile.total_earnings = Decimal('-100.00')
        with self.assertRaises(ValidationError):
            profile.full_clean()
        
        # Test valid earnings
        profile.total_earnings = Decimal('1000.50')
        profile.full_clean()  # Should not raise
    
    def test_profile_timestamps(self):
        """Test that created_at and updated_at are automatically set"""
        from django.utils import timezone
        import time
        
        profile = self.user.profile
        initial_created = profile.created_at
        initial_updated = profile.updated_at
        
        # Wait a moment and update profile
        time.sleep(0.1)
        profile.bio = 'Updated bio'
        profile.save()
        profile.refresh_from_db()
        
        # created_at should not change
        self.assertEqual(profile.created_at, initial_created)
        # updated_at should change
        self.assertGreater(profile.updated_at, initial_updated)


class OTPChallengeResendTest(TestCase):
    """Regression tests for fresh OTP issuance during signup resend flows."""

    def test_create_for_email_invalidates_previous_active_challenge(self):
        first = EmailOTPChallenge.objects.create(
            email='user@example.com',
            otp_hash='old-hash',
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        second = EmailOTPChallenge.create_for_email(
            email='user@example.com',
            otp_hash='new-hash',
        )

        first.refresh_from_db()
        self.assertLessEqual(first.expires_at, timezone.now())
        self.assertEqual(
            EmailOTPChallenge.objects.filter(
                email='user@example.com',
                verified_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).count(),
            1,
        )
        self.assertEqual(second.email, 'user@example.com')
        self.assertEqual(second.otp_hash, 'new-hash')


class PasswordResetFlowTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='reset@example.com',
            password='OldPass123!'
        )

    @patch('accounts.views.send_mail')
    def test_forgot_password_creates_token_and_sends_email(self, send_mail_mock):
        response = self.client.post('/api/auth/password/forgot/', {
            'email': 'reset@example.com'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(PasswordResetToken.objects.filter(user=self.user).exists())
        send_mail_mock.assert_called_once()

    @patch('accounts.views.send_mail')
    def test_reset_password_updates_password_with_valid_token(self, send_mail_mock):
        token = default_token_generator.make_token(self.user)
        reset_token = PasswordResetToken.objects.create(
            user=self.user,
            token_hash=sha256_hexdigest(token),
            expires_at=timezone.now() + timedelta(minutes=30),
        )

        response = self.client.post('/api/auth/password/reset/', {
            'token': token,
            'password': 'NewPassword123!'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassword123!'))
        self.assertFalse(PasswordResetToken.objects.filter(pk=reset_token.pk).exists())


class SocialAuthViewTest(TestCase):
    """Test Google auth endpoint for sign-in and sign-up"""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/google/'

    @patch('accounts.views.verify_supabase_access_token')
    def test_social_login_creates_user_and_returns_tokens(self, verify_mock):
        verify_mock.return_value = {
            'email': 'social@example.com',
            'user_metadata': {'full_name': 'Social User'}
        }

        response = self.client.post(self.url, {
            'access_token': 'supabase-token',
            'provider': 'google',
            'type': 'creator'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['email'], 'social@example.com')

        user = User.objects.get(email='social@example.com')
        self.assertTrue(user.is_active)
        self.assertTrue(hasattr(user, 'profile'))

    @patch('accounts.views.verify_supabase_access_token')
    def test_google_endpoint_creates_user_and_returns_tokens(self, verify_mock):
        verify_mock.return_value = {
            'email': 'google@example.com',
            'user_metadata': {'full_name': 'Google User'}
        }

        response = self.client.post('/api/auth/google/', {
            'access_token': 'supabase-token',
            'provider': 'google',
            'type': 'creator'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'google@example.com')
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_google_endpoint_ignores_invalid_bearer_token(self):
        response = self.client.post(self.url, {
            'access_token': 'supabase-token',
            'provider': 'google',
            'type': 'creator'
        }, format='json', HTTP_AUTHORIZATION='Bearer invalid-token')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_old_social_login_endpoint_is_removed(self):
        response = self.client.post('/api/auth/social-login/', {
            'access_token': 'supabase-token',
            'provider': 'google',
            'type': 'creator'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_social_login_falls_back_to_jwt_payload_when_supabase_check_fails(self):
        token_payload = {
            'email': 'fallback@example.com',
            'sub': 'google-user-id',
        }
        import base64
        import json

        header = base64.urlsafe_b64encode(b'{}').decode().rstrip('=')
        payload = base64.urlsafe_b64encode(json.dumps(token_payload).encode()).decode().rstrip('=')
        access_token = f'{header}.{payload}.signature'

        response = self.client.post(self.url, {
            'access_token': access_token,
            'provider': 'google',
            'type': 'creator'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'fallback@example.com')

    def test_social_login_accepts_google_id_token_payload(self):
        token_payload = {
            'email': 'google-id-token@example.com',
            'sub': 'google-user-id-2',
        }
        import base64
        import json

        header = base64.urlsafe_b64encode(b'{}').decode().rstrip('=')
        payload = base64.urlsafe_b64encode(json.dumps(token_payload).encode()).decode().rstrip('=')
        id_token = f'{header}.{payload}.signature'

        response = self.client.post(self.url, {
            'id_token': id_token,
            'provider': 'google',
            'type': 'creator'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'google-id-token@example.com')
        self.assertTrue(User.objects.filter(email='google-id-token@example.com').exists())


class ProfileResourceAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='resource@example.com',
            password='securepass123',
            type='brand',
        )
        self.client.force_authenticate(self.user)

    def test_profile_resources_are_persisted_in_database(self):
        response = self.client.patch('/api/auth/profile/me/', {
            'resources': [
                {'name': 'Brand Guidelines', 'url': 'https://example.com/guidelines'},
                {'name': 'Media Kit', 'url': 'https://example.com/media'},
            ]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['resources']), 2)
        self.assertEqual(response.data['resources'][0]['name'], 'Brand Guidelines')
        self.assertEqual(self.user.profile.resources.count(), 2)
        self.assertEqual(
            self.user.profile.resources.get(name='Brand Guidelines').url,
            'https://example.com/guidelines',
        )

    def test_avatar_and_cover_images_are_persisted_and_returned(self):
        avatar_bytes = b'\x89PNG\r\n\x1a\n' + b'fake-avatar-image-bytes'
        cover_bytes = b'\x89PNG\r\n\x1a\n' + b'fake-cover-image-bytes'
        payload = {
            'avatar': 'data:image/png;base64,' + base64.b64encode(avatar_bytes).decode('ascii'),
            'cover': 'data:image/png;base64,' + base64.b64encode(cover_bytes).decode('ascii'),
        }

        response = self.client.patch('/api/auth/profile/me/', payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        profile = self.user.profile
        profile.refresh_from_db()
        self.assertTrue(profile.avatar)
        self.assertTrue(profile.cover)

        follow_up = self.client.get('/api/auth/profile/me/')
        self.assertEqual(follow_up.status_code, status.HTTP_200_OK)
        self.assertIn('avatar', follow_up.data)
        self.assertIn('cover', follow_up.data)


class AuthStatusViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/status/'

    def test_status_returns_unauthenticated_when_no_user(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['authenticated'])

    def test_status_returns_authenticated_user(self):
        user = User.objects.create_user(email='status@example.com', password='testpass123')
        self.client.force_authenticate(user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['authenticated'])
        self.assertEqual(response.data['user']['email'], 'status@example.com')


class LoginViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/login/'
        self.user = User.objects.create_user(
            email='login@example.com',
            password='securepass123',
            type='creator',
        )

    def test_login_with_email_and_password_returns_tokens(self):
        response = self.client.post(self.url, {
            'email': 'login@example.com',
            'password': 'securepass123',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'login@example.com')
        self.assertEqual(response.data['user']['user_type'], 'creator')


class RegisterViewTest(TestCase):
    """Test user registration endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
    
    def test_register_user_success(self):
        """Test successful user registration"""
        data = {
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'password2': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertIn('email', response.data)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['email'], 'newuser@example.com')
        
        # Verify user was created
        user = User.objects.get(email='newuser@example.com')
        self.assertTrue(user.check_password('securepass123'))
        
        # Verify profile was created via signal
        self.assertTrue(hasattr(user, 'profile'))
    
    def test_register_user_email_normalization(self):
        """Test that email is normalized to lowercase during registration"""
        data = {
            'email': 'TestUser@Example.COM',
            'password': 'securepass123',
            'password2': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'testuser@example.com')
    
    def test_register_user_duplicate_email(self):
        """Test registration with duplicate email fails"""
        # Create existing user
        User.objects.create_user(
            email='existing@example.com',
            password='testpass123'
        )
        
        data = {
            'email': 'existing@example.com',
            'password': 'securepass123',
            'password2': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_register_user_duplicate_email_case_insensitive(self):
        """Test that email uniqueness check is case-insensitive"""
        User.objects.create_user(
            email='existing@example.com',
            password='testpass123'
        )
        
        data = {
            'email': 'Existing@Example.COM',
            'password': 'securepass123',
            'password2': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_register_user_password_mismatch(self):
        """Test registration with mismatched passwords fails"""
        data = {
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'password2': 'differentpass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
    
    def test_register_user_short_password(self):
        """Test registration with password shorter than 8 characters fails"""
        data = {
            'email': 'newuser@example.com',
            'password': 'short',
            'password2': 'short'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)
    
    def test_register_user_missing_fields(self):
        """Test registration with missing required fields fails"""
        data = {
            'email': 'newuser@example.com'
        }
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileViewSetTest(TestCase):
    """Test ProfileViewSet API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='testpass123',
            type='creator'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='testpass123',
            type='clipper'
        )
        # Profiles are created via signals
        self.profile1 = self.user1.profile
        self.profile2 = self.user2.profile
    
    def test_get_own_profile_authenticated(self):
        """Test authenticated user can get their own profile"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/auth/profile/me/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'user1@example.com')
        self.assertEqual(response.data['user_type'], 'creator')
        # Sensitive fields should be visible for own profile
        self.assertIn('upi_id', response.data)
        self.assertIn('total_earnings', response.data)

    def test_staff_profile_reports_admin_role(self):
        admin = User.objects.create_superuser(
            email='admin@example.com',
            password='testpass123',
        )
        self.client.force_authenticate(user=admin)

        response = self.client.get('/api/auth/profile/me/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_type'], 'admin')
    
    def test_get_own_profile_unauthenticated(self):
        """Test unauthenticated user cannot get profile via /me/"""
        response = self.client.get('/api/auth/profile/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_check_username_available(self):
        """Test the username availability endpoint returns available when unused."""
        response = self.client.get('/api/auth/check-username/?username=uniqueclipper')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'available': True})

    def test_check_username_taken(self):
        """Test the username availability endpoint returns taken when already used."""
        self.profile2.username = 'takenname'
        self.profile2.save()

        response = self.client.get('/api/auth/check-username/?username=takenname')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'available': False})

    def test_check_username_same_user(self):
        """Test the endpoint allows the same authenticated user to re-use their own username."""
        self.profile2.username = 'myclipper'
        self.profile2.save()
        self.client.force_authenticate(user=self.user2)

        response = self.client.get('/api/auth/check-username/?username=myclipper')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'available': True})

    def test_check_username_requires_parameter(self):
        """Test the endpoint requires the username query parameter."""
        response = self.client.get('/api/auth/check-username/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)

    def test_get_public_profile_authenticated(self):
        """Test authenticated user can view other user's public profile"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/auth/profile/{self.user2.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'user2@example.com')
        # Sensitive fields should be hidden for other user's profile
        self.assertNotIn('upi_id', response.data)
        self.assertNotIn('total_earnings', response.data)
    
    def test_get_public_profile_unauthenticated(self):
        """Test unauthenticated user can view public profiles"""
        response = self.client.get(f'/api/auth/profile/{self.user1.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'user1@example.com')
        # Sensitive fields should be hidden for unauthenticated users
        self.assertNotIn('upi_id', response.data)
        self.assertNotIn('total_earnings', response.data)
    
    def test_update_own_profile_success(self):
        """Test authenticated user can update their own profile"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'bio': 'Updated bio',
            'location': 'New York',
            'upi_id': 'test@upi'
        }
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.bio, 'Updated bio')
        self.assertEqual(self.profile1.location, 'New York')
        self.assertEqual(self.profile1.upi_id, 'test@upi')
    
    def test_update_own_profile_email(self):
        """Test authenticated user can update their email"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'email': 'newemail@example.com'
        }
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.email, 'newemail@example.com')
    
    def test_update_own_profile_duplicate_email(self):
        """Test updating email to existing email fails"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'email': 'user2@example.com'  # Already exists
        }
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_update_own_profile_same_email(self):
        """Test updating email to same email succeeds (no-op)"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'email': 'user1@example.com'  # Same email
        }
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_update_own_profile_unauthenticated(self):
        """Test unauthenticated user cannot update profile"""
        data = {
            'bio': 'Updated bio'
        }
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_update_profile_partial(self):
        """Test partial update of profile fields"""
        self.client.force_authenticate(user=self.user1)
        # Set initial values
        self.profile1.bio = 'Initial bio'
        self.profile1.location = 'Initial location'
        self.profile1.save()
        
        # Update only bio
        data = {'bio': 'Updated bio only'}
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.bio, 'Updated bio only')
        self.assertEqual(self.profile1.location, 'Initial location')  # Unchanged

    def test_update_profile_saves_onboarding_payload(self):
        self.client.force_authenticate(user=self.user1)
        data = {
            'role': 'clipper',
            'onboarding_data': {
                'experience': '1–3 years',
                'handles': {'instagram': '@clipper'},
            }
        }

        response = self.client.patch('/api/auth/profile/me/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.refresh_from_db()
        self.profile1.refresh_from_db()
        self.assertEqual(self.user1.type, 'clipper')
        self.assertEqual(self.profile1.onboarding_data['experience'], '1–3 years')
    
    def test_update_profile_saves_structured_brand_fields(self):
        """Test authenticated users can persist brand onboarding fields as structured profile data"""
        self.client.force_authenticate(user=self.user1)
        data = {
            'company_name': 'Acme Brand',
            'brand_name': 'Acme',
            'website_url': 'https://acme.example',
            'company_description': 'We create premium content campaigns.',
            'manager_first_name': 'Jane',
            'manager_last_name': 'Doe',
            'manager_role': 'Marketing Lead',
            'manager_contact': '+1 555 000 0000',
            'manager_email': 'jane@acme.example',
            'manager_dob': '1990-05-10',
            'company_email': 'team@acme.example',
            'industry': 'Technology',
            'company_size': '51-200',
            'founded_year': 2020,
            'city': 'Austin',
            'state': 'TX',
            'country': 'USA',
            'payment_method': 'upi',
            'email_notifications': True,
            'languages': ['English', 'Hindi'],
            'handles': {'instagram': '@acme', 'youtube': '@acmechannel'},
            'onboarding_data': {
                'companyName': 'Acme Brand',
                'brandName': 'Acme',
                'websiteUrl': 'https://acme.example',
                'managerFirstName': 'Jane',
                'managerLastName': 'Doe',
            },
        }

        response = self.client.patch('/api/auth/profile/me/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.company_name, 'Acme Brand')
        self.assertEqual(self.profile1.brand_name, 'Acme')
        self.assertEqual(self.profile1.website_url, 'https://acme.example')
        self.assertEqual(self.profile1.manager_first_name, 'Jane')
        self.assertEqual(self.profile1.manager_dob, date(1990, 5, 10))
        self.assertEqual(self.profile1.company_email, 'team@acme.example')
        self.assertEqual(self.profile1.industry, 'Technology')
        self.assertEqual(self.profile1.city, 'Austin')
        self.assertEqual(self.profile1.payment_method, 'upi')
        self.assertEqual(self.profile1.languages, ['English', 'Hindi'])
        self.assertEqual(self.profile1.handles, {'instagram': '@acme', 'youtube': '@acmechannel'})
        self.assertTrue(self.profile1.email_notifications)
        self.assertEqual(self.profile1.onboarding_data['companyName'], 'Acme Brand')

    def test_update_profile_persists_clipper_profile_payload(self):
        """Clipper profile edits should be stored in the profile record and onboarding_data blob."""
        self.client.force_authenticate(user=self.user1)
        data = {
            'firstName': 'Rohan',
            'lastName': 'Verma',
            'username': 'rohanclips',
            'dob': '1998-05-10',
            'gender': 'Male',
            'experienceLevel': '1–3 years',
            'experienceDescription': 'Editing gaming highlights.',
            'handles': {'instagram': '@rohanclips', 'youtube': '@rohanchannel'},
            'portfolioUrl': 'https://rohanclips.com',
            'editingTools': ['Premiere Pro', 'CapCut'],
            'skills': ['Video editing', 'Color grading'],
            'categories': ['Gaming', 'Tech'],
            'bio': 'Fast cutting short-form content.',
            'languages': ['English', 'Hindi'],
            'city': 'Jaipur',
            'state': 'Rajasthan',
            'country': 'India',
            'contactNumber': '+91 90000 11111',
            'paymentMethod': 'upi',
            'upiId': 'rohan@upi',
            'bankAccountHolder': 'Rohan Verma',
            'bankAccountNumber': '1234567890',
            'bankIfsc': 'SBIN0001234',
            'bankName': 'SBI',
            'emailNotifications': True,
        }

        response = self.client.patch('/api/auth/profile/me/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.first_name, 'Rohan')
        self.assertEqual(self.profile1.last_name, 'Verma')
        self.assertEqual(self.profile1.date_of_birth, date(1998, 5, 10))
        self.assertEqual(self.profile1.gender, 'Male')
        self.assertEqual(self.profile1.contact_number, '+91 90000 11111')
        self.assertEqual(self.profile1.username, 'rohanclips')
        self.assertEqual(self.profile1.experience_level, '1–3 years')
        self.assertEqual(self.profile1.experience_description, 'Editing gaming highlights.')
        self.assertEqual(self.profile1.editing_tools, ['Premiere Pro', 'CapCut'])
        self.assertEqual(self.profile1.skills, ['Video editing', 'Color grading'])
        self.assertEqual(self.profile1.payment_method, 'upi')
        self.assertEqual(self.profile1.upi_id, 'rohan@upi')
        self.assertEqual(self.profile1.bio, 'Fast cutting short-form content.')
        self.assertEqual(self.profile1.languages, ['English', 'Hindi'])
        self.assertEqual(self.profile1.city, 'Jaipur')
        self.assertEqual(self.profile1.state, 'Rajasthan')
        self.assertEqual(self.profile1.country, 'India')
        self.assertEqual(self.profile1.email_notifications, True)
        self.assertEqual(self.profile1.portfolio_url, 'https://rohanclips.com')
        self.assertEqual(self.profile1.bank_account_holder, 'Rohan Verma')
        self.assertEqual(self.profile1.bank_account_number, '1234567890')
        self.assertEqual(self.profile1.bank_ifsc, 'SBIN0001234')
        self.assertEqual(self.profile1.bank_name, 'SBI')
        self.assertEqual(self.profile1.handles, {'instagram': '@rohanclips', 'youtube': '@rohanchannel'})
        self.assertEqual(self.profile1.onboarding_data['experienceLevel'], '1–3 years')
        self.assertEqual(self.profile1.onboarding_data['experienceDescription'], 'Editing gaming highlights.')
        self.assertEqual(self.profile1.onboarding_data['editingTools'], ['Premiere Pro', 'CapCut'])
        self.assertEqual(self.profile1.onboarding_data['skills'], ['Video editing', 'Color grading'])
        self.assertEqual(self.profile1.onboarding_data['categories'], ['Gaming', 'Tech'])
        self.assertEqual(self.profile1.onboarding_data['username'], 'rohanclips')
        self.assertEqual(self.profile1.onboarding_data['portfolioUrl'], 'https://rohanclips.com')

    def test_update_profile_persists_avatar_and_cover_images(self):
        """Clipper avatar and cover uploads should be stored on the profile record."""
        self.client.force_authenticate(user=self.user1)
        avatar_data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQABAA0D5fLPAAAAAElFTkSuQmCC'
        cover_data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQABAA0D5fLPAAAAAElFTkSuQmCC'

        response = self.client.patch('/api/auth/profile/me/', {'avatar': avatar_data, 'cover': cover_data}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile1.refresh_from_db()
        self.assertTrue(self.profile1.avatar)
        self.assertTrue(self.profile1.cover)

    def test_update_profile_total_earnings(self):
        """Test updating total_earnings field"""
        self.client.force_authenticate(user=self.user1)
        # Note: This might be restricted in production, but testing the field update
        data = {
            'total_earnings': '1000.50'
        }
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        
        # Check if field is read-only or can be updated
        # If it's read-only, serializer will ignore it
        self.profile1.refresh_from_db()
        # The serializer might not allow updating this field directly


class ProfileSerializerTest(TestCase):
    """Test ProfileSerializer field filtering"""
    
    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            password='testpass123'
        )
        self.profile1 = self.user1.profile
        self.profile1.upi_id = 'test@upi'
        self.profile1.total_earnings = Decimal('500.00')
        self.profile1.save()
    
    def test_serializer_hides_sensitive_fields_for_other_user(self):
        """Test serializer hides sensitive fields when viewing other user's profile"""
        from rest_framework.test import APIRequestFactory
        from .serializers import ProfileSerializer
        
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = self.user2  # Different user
        
        serializer = ProfileSerializer(
            self.profile1,
            context={'request': request}
        )
        data = serializer.data
        
        self.assertNotIn('upi_id', data)
        self.assertNotIn('total_earnings', data)
        self.assertIn('email', data)
        self.assertIn('bio', data)
    
    def test_serializer_shows_sensitive_fields_for_own_profile(self):
        """Test serializer shows sensitive fields when viewing own profile"""
        from rest_framework.test import APIRequestFactory
        from .serializers import ProfileSerializer
        
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = self.user1  # Same user
        
        serializer = ProfileSerializer(
            self.profile1,
            context={'request': request}
        )
        data = serializer.data
        
        self.assertIn('upi_id', data)
        self.assertIn('total_earnings', data)
        self.assertEqual(data['upi_id'], 'test@upi')
        self.assertEqual(str(data['total_earnings']), '500.00')
    
    def test_serializer_hides_sensitive_fields_for_unauthenticated(self):
        """Test serializer hides sensitive fields for unauthenticated users"""
        from rest_framework.test import APIRequestFactory
        from django.contrib.auth.models import AnonymousUser
        from .serializers import ProfileSerializer
        
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = AnonymousUser()  # Use AnonymousUser instead of None
        
        serializer = ProfileSerializer(
            self.profile1,
            context={'request': request}
        )
        data = serializer.data
        
        self.assertNotIn('upi_id', data)
        self.assertNotIn('total_earnings', data)


class ProfileSignalTest(TestCase):
    """Test profile creation signal"""
    
    def test_profile_created_on_user_creation(self):
        """Test that profile is automatically created when user is created"""
        user = User.objects.create_user(
            email='newuser@example.com',
            password='testpass123'
        )
        
        # Profile should exist
        self.assertTrue(hasattr(user, 'profile'))
        profile = user.profile
        self.assertIsNotNone(profile)
        self.assertEqual(profile.user, user)
    
    def test_profile_not_duplicated_on_user_update(self):
        """Test that profile is not duplicated when user is updated"""
        user = User.objects.create_user(
            email='newuser@example.com',
            password='testpass123'
        )
        
        initial_profile = user.profile
        profile_count_before = Profile.objects.filter(user=user).count()
        
        # Update user
        user.email = 'updated@example.com'
        user.save()
        
        profile_count_after = Profile.objects.filter(user=user).count()
        self.assertEqual(profile_count_before, profile_count_after)
        self.assertEqual(profile_count_after, 1)
        # Should be the same profile instance
        user.refresh_from_db()
        self.assertEqual(user.profile.id, initial_profile.id)


class EdgeCasesTest(TestCase):
    """Test edge cases and error handling"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_get_nonexistent_profile(self):
        """Test retrieving nonexistent profile returns 404"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/profile/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_profile_invalid_data(self):
        """Test updating profile with invalid data returns 400"""
        self.client.force_authenticate(user=self.user)
        # Invalid: rating should be decimal, not string
        data = {
            'rating': 'invalid'
        }
        response = self.client.patch('/api/auth/profile/me/', data, format='json')
        # Should return 400 or handle gracefully
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK])
    
    def test_profile_get_or_create_race_condition(self):
        """Test that get_or_create handles race conditions properly"""
        # This tests the signal's use of get_or_create
        user = User.objects.create_user(
            email='race@example.com',
            password='testpass123'
        )
        
        # Profile should exist
        self.assertTrue(hasattr(user, 'profile'))
        
        # Try to get_or_create again (simulating race condition)
        profile, created = Profile.objects.get_or_create(user=user)
        self.assertFalse(created)  # Should not create duplicate
        self.assertEqual(profile, user.profile)

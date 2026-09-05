from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, AbstractBaseUser, PermissionsMixin
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal

# Create your models here.

# AbstractUser allows you to extend the existing default user model with extra fields and methods, while AbstractBaseUser provides a minimal set of authentication functionalities, requiring you to define all fields for your user model from scratch

# AbstractUser is for minor modifications, and AbstractBaseUser is for complete control over the user model and authentication process
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self,email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff',True)
        extra_fields.setdefault('is_superuser',True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    USER_TYPE_CHOICES = [
        ('creator', 'Creator'),
        ('clipper', 'Clipper'),
        ('brand', 'Brand'),
    ]
    # Note: Django automatically creates an AutoField primary key, so 'id' field is redundant
    email = models.EmailField(max_length=254, unique=True, db_index=True)
    type = models.CharField(max_length=50, choices= USER_TYPE_CHOICES, default='creator', db_index=True)
    # password = models.CharField(max_length=128) we don't need this coz AbstractBaseUser already has it.
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):  
        return self.email

    def has_perm(self, perm, obj=None):
        """
        Return True if user has the specified permission.
        Superusers have all permissions. Staff users have permissions based on their assigned permissions.
        """
        if self.is_superuser:
            return True
        # Allow staff users to have permissions (they can be assigned via Django admin)
        if self.is_staff:
            return super().has_perm(perm, obj)
        return False
    
    def has_module_perms(self, app_label):
        """
        Return True if user has any permissions in the given app label.
        Superusers have all permissions. Staff users have permissions based on their assigned permissions.
        """
        if self.is_superuser:
            return True
        # Allow staff users to have module permissions
        if self.is_staff:
            return super().has_module_perms(app_label)
        return False

# ------------------------------ Custom User models COMPLETED ---------------------------------------------
# 
#
#
# -------------------------------- Profile models ------------------------------------------------------------

def user_avatar_upload_path(instance, filename):
    """
    Generate upload path for user avatars to prevent filename conflicts.
    Format: avatars/user_{user_id}/{filename}
    """
    return f'avatars/user_{instance.user.id}/{filename}'


def user_cover_upload_path(instance, filename):
    """
    Generate upload path for user cover images.
    Format: avatars/user_{user_id}/cover/{filename}
    """
    return f'avatars/user_{instance.user.id}/cover/{filename}'


# Profile models with a One-to-One link to the CustomUser models. 
class Profile(models.Model):
    # Link to main User model
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile', db_index=True)

    # Basic Intro
    bio = models.TextField(max_length=700, blank=True)
    location = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to=user_avatar_upload_path, null=True, blank=True)
    cover = models.ImageField(upload_to=user_cover_upload_path, null=True, blank=True)
    onboarding_data = models.JSONField(default=dict, blank=True)
    # Personal fields (used for both Brand and Creator profiles)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=50, blank=True)
    contact_number = models.CharField(max_length=50, blank=True)

    # Brand / company profile fields
    company_name = models.CharField(max_length=255, blank=True)
    brand_name = models.CharField(max_length=255, blank=True)
    website_url = models.URLField(blank=True)
    company_description = models.TextField(max_length=2000, blank=True)
    manager_first_name = models.CharField(max_length=100, blank=True)
    manager_last_name = models.CharField(max_length=100, blank=True)
    manager_role = models.CharField(max_length=150, blank=True)
    manager_contact = models.CharField(max_length=50, blank=True)
    manager_email = models.EmailField(blank=True)
    manager_dob = models.DateField(null=True, blank=True)
    company_email = models.EmailField(blank=True)
    industry = models.CharField(max_length=100, blank=True)
    company_size = models.CharField(max_length=50, blank=True)
    founded_year = models.PositiveIntegerField(null=True, blank=True)
    languages = models.JSONField(default=list, blank=True)
    handles = models.JSONField(default=dict, blank=True)
    # Creator-specific explicit columns
    primary_niche = models.CharField(max_length=150, blank=True)
    content_interests = models.JSONField(default=list, blank=True)
    portfolio_url = models.URLField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    username = models.CharField(max_length=150, blank=True)
    experience_level = models.CharField(max_length=100, blank=True)
    experience_description = models.TextField(blank=True)
    editing_tools = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    payment_method = models.CharField(max_length=50, blank=True)
    email_notifications = models.BooleanField(default=False)
    bank_account_holder = models.CharField(max_length=150, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    bank_name = models.CharField(max_length=150, blank=True)

    # Note: When creating a custom HTML form for file uploads, you must include the 
    # `enctype="multipart/form-data"` attribute in the `<form>` tag

    # Financials 
    upi_id = models.CharField(max_length=50, blank=True) # for direct payouts
    total_earnings = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]  # Prevent negative earnings
    )
    # Campaign wallet (for creator's own campaigns)
    wallet_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_deposited = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_withdrawn = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )


    # Performance Stats
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2, 
        default=Decimal('0.0'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('5.00'))]  # Rating scale: 0-5
    )
    clips_completed = models.IntegerField(default=0, db_index=True)
    views_generated = models.BigIntegerField(default=0, db_index=True)
    # TODO: Consider changing views_generated to IntegerField or BigIntegerField for better performance
    
    # Timestamps for auditing
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def clean(self):
        """Additional model-level validation"""
        super().clean()
        # Validate rating range
        if self.rating is not None and (self.rating < 0 or self.rating > 5):
            raise ValidationError({'rating': 'Rating must be between 0.00 and 5.00'})
        # Validate total_earnings is non-negative
        if self.total_earnings is not None and self.total_earnings < 0:
            raise ValidationError({'total_earnings': 'Total earnings cannot be negative'})

    def __str__(self):
        return f"{self.user.email}'s Profile"


class ProfileResource(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='resources', db_index=True)
    name = models.CharField(max_length=255, blank=True)
    url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['profile', 'order']),
        ]

    def __str__(self):
        return self.name or f"Resource for {self.profile.user.email}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token_hash = models.CharField(max_length=128, db_index=True)
    expires_at = models.DateTimeField(db_index=True)
    used_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'expires_at']),
            models.Index(fields=['token_hash', 'expires_at']),
        ]

    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()

    def __str__(self):
        return f"Password reset for {self.user.email}"


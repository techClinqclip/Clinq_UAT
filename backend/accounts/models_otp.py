from django.db import models
from django.utils import timezone
from datetime import timedelta

from .otp_backend import get_otp_expiry


class EmailOTPChallenge(models.Model):
    """Stores OTP challenges for email verification during signup."""

    email = models.EmailField(db_index=True)
    otp_hash = models.CharField(max_length=255)
    expires_at = models.DateTimeField(db_index=True)
    attempts = models.PositiveIntegerField(default=0)
    max_attempts = models.PositiveIntegerField(default=5)

    verified_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['email', 'expires_at']),
        ]
        constraints = []

    @classmethod
    def create_for_email(cls, *, email: str, otp_hash: str):
        expiry = get_otp_expiry()
        now = timezone.now()

        # Resending a code should invalidate any previously issued, unverified OTP
        # for the same email so stale codes cannot still be used.
        cls.objects.filter(
            email=email,
            verified_at__isnull=True,
            expires_at__gt=now,
        ).update(expires_at=now)

        return cls.objects.create(
            email=email,
            otp_hash=otp_hash,
            expires_at=now + expiry,
        )


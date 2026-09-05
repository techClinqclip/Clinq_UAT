import random
import string
from datetime import timedelta
from django.utils import timezone
from django.conf import settings


def generate_otp_code(length: int = 6) -> str:
    # 6-digit numeric code by default
    return ''.join(random.choices(string.digits, k=length))


def get_otp_expiry() -> timedelta:
    # Configurable OTP expiry in seconds (default: 10 minutes)
    seconds = int(getattr(settings, 'OTP_EXPIRES_IN_SECONDS', 10 * 60))
    return timedelta(seconds=seconds)


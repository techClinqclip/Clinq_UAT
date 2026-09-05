from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
import threading
import logging

logger = logging.getLogger(__name__)

from .otp_backend import generate_otp_code
from .email_utils import sha256_hexdigest
from .models_otp import EmailOTPChallenge


class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # generate otp
        otp_code = generate_otp_code(6)
        otp_hash = sha256_hexdigest(otp_code)

        # upsert strategy: invalidate old unexpired challenges by simply creating new row
        EmailOTPChallenge.create_for_email(email=email, otp_hash=otp_hash)


        # send email asynchronously so OTP issuance is not delayed by SMTP latency.
        # In development, you must set EMAIL_BACKEND and EMAIL_HOST details in env.
        def send_otp_message():
            try:
                subject = 'Your Clinq verification code'
                message = (
                    f"Hello,\n\n"
                    f"Use the following verification code to complete your Clinq signup: {otp_code}\n\n"
                    f"This code is valid for 10 minutes. Please do not share it with anyone.\n\n"
                    f"If you did not request this code, you can safely ignore this email.\n\n"
                    f"Thanks,\n"
                    f"The Clinq Team"
                )
                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'noreply@clinq.app'
                send_mail(subject, message, from_email, [email], fail_silently=False)
            except Exception:
                logger.exception('Failed to send OTP email')

        thread = threading.Thread(target=send_otp_message, daemon=True)
        thread.start()

        return Response({'detail': 'OTP sent successfully.'}, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        otp = (request.data.get('otp') or '').strip()

        if not email or not otp:
            return Response({'detail': 'Email and otp are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not otp.isdigit() or len(otp) != 6:
            return Response({'detail': 'OTP must be a 6-digit number.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_hash = sha256_hexdigest(otp)

        # find latest unverified challenge that matches
        challenge = (
            EmailOTPChallenge.objects.filter(email=email, verified_at__isnull=True)
            .filter(expires_at__gt=timezone.now())
            .order_by('-created_at')
            .first()
        )

        if not challenge:
            return Response({'detail': 'OTP expired or not found.'}, status=status.HTTP_400_BAD_REQUEST)

        # rate limiting by attempts
        if challenge.attempts >= challenge.max_attempts:
            return Response({'detail': 'Too many attempts. Request a new OTP.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # compare hashes
        if challenge.otp_hash != otp_hash:
            challenge.attempts += 1
            challenge.save(update_fields=['attempts', 'updated_at'])
            return Response({'detail': 'Invalid OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        challenge.verified_at = timezone.now()
        challenge.save(update_fields=['verified_at', 'updated_at'])

        return Response({'verified': True}, status=status.HTTP_200_OK)


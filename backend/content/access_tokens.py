"""Opaque, campaign-scoped URL tokens for participant management pages."""

import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def _fernet():
    # Derive a stable Fernet key from Django's deployment secret. Tokens are
    # encrypted and authenticated, and become invalid if that secret rotates.
    secret = str(settings.SECRET_KEY).encode("utf-8")
    key = base64.urlsafe_b64encode(hashlib.sha256(secret).digest())
    return Fernet(key)


def create_participant_access_token(campaign, clipper_id):
    """Return an opaque token bound to exactly one campaign participant."""
    payload = json.dumps(
        {
            "campaign": str(campaign.public_access_key),
            "clipper": int(clipper_id),
        },
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return _fernet().encrypt(payload).decode("ascii")


def resolve_participant_access_token(campaign, token):
    """Return the clipper ID for a valid token scoped to ``campaign``."""
    try:
        payload = json.loads(_fernet().decrypt(str(token).encode("ascii")).decode("utf-8"))
        if payload.get("campaign") != str(campaign.public_access_key):
            return None
        clipper_id = int(payload["clipper"])
        return clipper_id if clipper_id > 0 else None
    except (InvalidToken, KeyError, TypeError, ValueError, UnicodeError, json.JSONDecodeError):
        return None

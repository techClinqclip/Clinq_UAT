"""Persistent public media storage for production uploads."""

import logging
import os
import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import default_storage
from supabase import create_client

logger = logging.getLogger(__name__)


def upload_public_media(uploaded_file, *, folder, stored_filename=None, inline=False):
    """Upload a file to Supabase Storage and return a public URL.

    Render's filesystem is ephemeral and does not serve Django media in
    production, so production uploads must be stored in object storage.
    """
    if not uploaded_file:
        return None

    supabase_url = str(getattr(settings, "SUPABASE_URL", "") or "").rstrip("/")
    supabase_key = getattr(settings, "SUPABASE_KEY", None)
    bucket_name = os.getenv("SUPABASE_STORAGE_BUCKET", "ClinqBucket")
    original_name = Path(str(getattr(uploaded_file, "name", "upload"))).name
    suffix = Path(original_name).suffix.lower() or ".bin"
    if stored_filename:
        safe_name = Path(str(stored_filename)).name
        if not Path(safe_name).suffix:
            safe_name = f"{safe_name}{suffix}"
        object_path = f"{folder.rstrip('/')}/{safe_name}"
    else:
        object_path = f"{folder.rstrip('/')}/{uuid.uuid4().hex}{suffix}"
    content_type = (
        getattr(uploaded_file, "content_type", None)
        or "application/octet-stream"
    )

    if not supabase_url or not supabase_key:
        if settings.DEBUG:
            saved_path = default_storage.save(object_path, uploaded_file)
            return default_storage.url(saved_path)
        raise ImproperlyConfigured(
            "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_KEY."
        )

    content = uploaded_file.read()
    if hasattr(uploaded_file, "seek"):
        uploaded_file.seek(0)

    file_options = {
        "content-type": content_type,
        "upsert": "true",
    }
    if inline:
        display_name = Path(object_path).name
        file_options["content-disposition"] = f'inline; filename="{display_name}"'

    try:
        bucket = create_client(supabase_url, supabase_key).storage.from_(bucket_name)
        bucket.upload(
            object_path,
            content,
            file_options=file_options,
        )
        public_url = bucket.get_public_url(object_path)
    except Exception:
        logger.exception(
            "Supabase Storage upload failed bucket=%s path=%s content_type=%s",
            bucket_name,
            object_path,
            content_type,
        )
        raise

    if isinstance(public_url, dict):
        public_url = public_url.get("publicUrl") or public_url.get("public_url")
    if not public_url:
        raise RuntimeError("Supabase Storage did not return a public media URL.")
    return str(public_url)


def resolve_media_url(field_file):
    """Return public URLs directly while keeping older local paths compatible."""
    if not field_file:
        return None
    name = str(getattr(field_file, "name", field_file) or "")
    if name.startswith(("https://", "http://", "/")):
        return name
    try:
        return field_file.url
    except Exception:
        return name or None

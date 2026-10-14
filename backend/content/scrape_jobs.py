"""In-process scrape job progress store (no Redis required)."""

from __future__ import annotations

import threading
from copy import deepcopy
from datetime import datetime, timezone

_LOCK = threading.Lock()
_JOBS: dict[str, dict] = {}


def create_job(job_id: str, *, requested_by_user_id=None) -> dict:
    payload = {
        'taskId': job_id,
        'status': 'queued',
        'progress': 0,
        'message': 'Scraper queued.',
        'eligible': 0,
        'processed': 0,
        'updated': 0,
        'notified': 0,
        'failed': 0,
        'failed_urls': [],
        'batch_size': 20,
        'requestedByUserId': requested_by_user_id,
        'startedAt': None,
        'finishedAt': None,
        'error': None,
    }
    with _LOCK:
        _JOBS[job_id] = payload
        return deepcopy(payload)


def update_job(job_id: str, **fields) -> dict | None:
    with _LOCK:
        job = _JOBS.get(job_id)
        if not job:
            return None
        job.update(fields)
        return deepcopy(job)


def get_job(job_id: str) -> dict | None:
    with _LOCK:
        job = _JOBS.get(job_id)
        return deepcopy(job) if job else None


def mark_running(job_id: str, *, eligible: int, batch_size: int) -> None:
    update_job(
        job_id,
        status='running',
        progress=0 if eligible else 100,
        message='Scraper running...' if eligible else 'No eligible submissions found.',
        eligible=eligible,
        processed=0,
        updated=0,
        notified=0,
        failed=0,
        failed_urls=[],
        batch_size=batch_size,
        startedAt=datetime.now(timezone.utc).isoformat(),
        error=None,
    )


def mark_progress(
    job_id: str,
    *,
    eligible: int,
    processed: int,
    updated: int,
    failed: int,
    failed_urls: list[str] | None = None,
) -> None:
    progress = 100 if eligible <= 0 else min(99, int((processed / eligible) * 100))
    update_job(
        job_id,
        status='running',
        progress=progress,
        message=f'Processed {processed} of {eligible} submissions...',
        eligible=eligible,
        processed=processed,
        updated=updated,
        failed=failed,
        failed_urls=(failed_urls or [])[:20],
    )


def mark_completed(job_id: str, result: dict) -> None:
    update_job(
        job_id,
        status='completed',
        progress=100,
        message='Scraper completed.',
        eligible=result.get('eligible', 0),
        processed=result.get('processed', 0),
        updated=result.get('updated', 0),
        notified=result.get('notified', 0),
        failed=result.get('failed', 0),
        failed_urls=(result.get('failed_urls') or [])[:20],
        batch_size=result.get('batch_size', 20),
        finishedAt=datetime.now(timezone.utc).isoformat(),
        error=None,
    )


def mark_failed(job_id: str, error: str) -> None:
    update_job(
        job_id,
        status='failed',
        progress=100,
        message='Scraper failed.',
        finishedAt=datetime.now(timezone.utc).isoformat(),
        error=error,
    )

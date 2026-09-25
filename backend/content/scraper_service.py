from collections import defaultdict
from pathlib import Path
import logging
import sys
import uuid

from django.db import transaction

from .models import CampaignSubmission

logger = logging.getLogger(__name__)

BATCH_SIZE = 20


def _load_engine():
    # Prefer backend/ContentScrapper (included in the Render Docker image).
    # Also support the repo-root ContentScrapper used in local monorepo layouts.
    candidates = [
        Path(__file__).resolve().parents[1],  # backend/
        Path(__file__).resolve().parents[2],  # repo root
    ]
    for root in candidates:
        root_str = str(root)
        if (root / 'ContentScrapper' / 'insights_engine.py').exists() and root_str not in sys.path:
            sys.path.insert(0, root_str)
    from ContentScrapper.insights_engine import SocialInsightsEngine
    return SocialInsightsEngine()


def _url_key(url):
    value = str(url or '').strip().lower().rstrip('/')
    value = value.split('?', 1)[0].split('#', 1)[0]
    if 'youtu.be/' in value:
        return value.split('youtu.be/', 1)[1]
    if '/shorts/' in value:
        return value.split('/shorts/', 1)[1]
    if 'youtube.com/watch' in value and 'v=' in str(url):
        return str(url).split('v=', 1)[1].split('&', 1)[0]
    return value


def _notify_participants(updated_by_user, *, run_id):
    if not updated_by_user:
        return 0

    try:
        from notifications.helpers import notify_submission_views_updated
    except Exception:
        logger.exception('Notification helpers are unavailable; skipping scraper view notifications.')
        return 0

    notified = 0
    for user_id, items in updated_by_user.items():
        try:
            event_id = notify_submission_views_updated(
                user_id,
                updated_count=len(items),
                total_views=sum(item['views'] for item in items),
                campaign_names=[item['campaign_name'] for item in items],
                run_id=run_id,
            )
            if event_id:
                notified += 1
        except Exception:
            logger.exception('Failed to notify participant %s about updated submission views.', user_id)
    return notified


def scrape_active_campaign_submissions():
    queryset = CampaignSubmission.objects.filter(
        is_deleted=False,
        status__in=['pending', 'approved'],
        participant__campaign__status='active',
    ).exclude(content_url='').select_related(
        'participant__campaign',
        'participant__clipper',
    )

    submissions = list(queryset.order_by('id'))
    engine = _load_engine()
    processed = 0
    updated = 0
    failed_urls = []
    run_id = str(uuid.uuid4())
    updated_by_user = defaultdict(list)

    for start in range(0, len(submissions), BATCH_SIZE):
        chunk = submissions[start:start + BATCH_SIZE]
        urls = [submission.content_url for submission in chunk]
        processed += len(chunk)
        try:
            report = engine.get_metrics_report(urls)
        except Exception:
            failed_urls.extend(urls)
            continue

        metrics_by_url = {
            _url_key(item.get('url')): item
            for item in report
            if item.get('url')
        }
        for submission in chunk:
            metrics = metrics_by_url.get(_url_key(submission.content_url))
            if not metrics:
                failed_urls.append(submission.content_url)
                continue

            previous_views = int(submission.views or 0)
            previous_likes = int(submission.likes or 0)
            submission.views = int(metrics.get('views') or 0)
            submission.likes = int(metrics.get('likes') or 0)
            with transaction.atomic():
                submission.save(update_fields=['views', 'likes', 'updated_at'], skip_earning_update=True)
            updated += 1

            clipper_id = getattr(getattr(submission.participant, 'clipper', None), 'id', None)
            if clipper_id and (
                submission.views != previous_views or submission.likes != previous_likes
            ):
                campaign_name = ''
                campaign = getattr(submission.participant, 'campaign', None)
                if campaign is not None:
                    campaign_name = getattr(campaign, 'name', '') or ''
                updated_by_user[clipper_id].append({
                    'submission_id': submission.id,
                    'views': submission.views,
                    'likes': submission.likes,
                    'campaign_name': campaign_name,
                })

    notified = _notify_participants(updated_by_user, run_id=run_id)

    return {
        'eligible': len(submissions),
        'processed': processed,
        'updated': updated,
        'notified': notified,
        'failed': len(failed_urls),
        'failed_urls': failed_urls[:20],
        'batch_size': BATCH_SIZE,
    }

from pathlib import Path
import sys

from django.db import transaction

from .models import CampaignSubmission


BATCH_SIZE = 20


def _load_engine():
    project_root = Path(__file__).resolve().parents[2]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))
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


def scrape_active_campaign_submissions():
    queryset = CampaignSubmission.objects.filter(
        is_deleted=False,
        status__in=['pending', 'approved'],
        participant__campaign__status='active',
    ).exclude(content_url='').select_related('participant__campaign')

    submissions = list(queryset.order_by('id'))
    engine = _load_engine()
    processed = 0
    updated = 0
    failed_urls = []

    for start in range(0, len(submissions), BATCH_SIZE):
        chunk = submissions[start:start + BATCH_SIZE]
        urls = [submission.content_url for submission in chunk]
        processed += len(chunk)
        try:
            report = engine.get_metrics_report(urls)
        except Exception as error:
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
            submission.views = int(metrics.get('views') or 0)
            submission.likes = int(metrics.get('likes') or 0)
            with transaction.atomic():
                submission.save(update_fields=['views', 'likes', 'updated_at'], skip_earning_update=True)
            updated += 1

    return {
        'eligible': len(submissions),
        'processed': processed,
        'updated': updated,
        'failed': len(failed_urls),
        'failed_urls': failed_urls[:20],
        'batch_size': BATCH_SIZE,
    }
from celery import shared_task
from supabase import create_client

# FIX: renamed import alias to db_transaction to avoid clashing with the
# local variable named 'transaction' used inside process_payout
from django.db import transaction as db_transaction

from .models import ClipSubmission, Content, CampaignSubmission, sync_campaign_submissions_with_clip_submission
from earnings.models import Transaction as EarningsTransaction


@shared_task
def process_bot_metrics(submission_id, views, reach, meets_instructions):
    """
    Called by the bot after it checks a clip submission.
    Updates metrics and marks the submission as verified or rejected.
    """
    try:
        submission = ClipSubmission.objects.get(id=submission_id)
        # Perform the "heavy" logic here
        submission.views = views or 0
        submission.reach = reach or 0
        submission.meets_instructions = bool(meets_instructions)
        submission.is_moderated = True
        submission.status = 'verified' if meets_instructions else 'rejected'

        if not submission.meets_instructions:
            submission.moderation_notes = "Instructions not followed (e.g. missing hashtags)."

        submission.save()

        # Delegate sync to shared helper so all update paths behave the same.
        try:
            sync_campaign_submissions_with_clip_submission(submission)
        except Exception as e:
            print(f"Failed to sync CampaignSubmission for post {submission.post_url}: {e}")

    except ClipSubmission.DoesNotExist:
        print(f"ClipSubmission {submission_id} not found.")


@shared_task
def process_verification_and_payout(submission_id):
    # 1. Logic to call external APIs (Instagram/TikTok) to verify views
    # 2. Logic to update status
    # 3. Trigger Transaction logic
    print(f"Processing submission {submission_id} in background...")

def process_payout(content_id):
    """
    Automated payout logic once a submission is approved.
    """
    with transaction.atomic():
        content = Content.objects.select_for_update().get(id=content_id)

        if content.status == 'review':
            # 1. Update prfile Earnings
            profile = content.assigned_clipper.profile
            profile.total_earnings += content.budget
            profile.clips_completed += 1
            profile.save()

            # 2. Update Transaction record
            transaction = Transaction.objects.get(content=content, status='pending')
            transaction.status = 'completed'
            transaction.save()

            # 3. Mark project finished
            content.status = 'completed'
            content.save()
            return f"Paid {content.budget} to {content.assigned_clipper.email}"

@shared_task
def process_uploaded_video(content_id, file_path):
    # 1. Verify file exists in Supabase
    # 2. Trigger FFmpeg to generate a 720p preview
    # 3. Generate a thumbnail
    # 4. Mark Content as 'available'
    pass
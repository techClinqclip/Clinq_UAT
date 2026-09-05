import os
import ffmpeg
import tempfile
from django.conf import settings

from celery import shared_task
from .models import Lesson
from supabase import create_client

from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

supabase = create_client(supabase_url=SUPABASE_URL, supabase_key=SUPABASE_KEY)


@shared_task
def process_lesson_video(lesson_id):
    lesson = None
    try:
        lesson = Lesson.objects.get(id=lesson_id)
        lesson.status = 'processing'
        lesson.save()

        # 1. Get the official Public URL from Supabase
        res = supabase.storage.from_('ClinqBucket').create_signed_url(lesson.video_path)

        signed_url = res['signedURL'] or res.get('signed_url')

        # 2. STREAM metadata using ffprobe (No download required!)
        probe = ffmpeg.probe(signed_url)
        duration_seconds = float(probe['format']['duration'])

        # Format seconds to MM:SS or HH:MM:SS
        hours = int(duration_seconds // 3600)
        minutes = int(duration_seconds // 60)
        seconds = int(duration_seconds % 60)
        
        if hours > 0:
            lesson.duration = f"{hours}:{minutes:02d}:{seconds:02d}"
        else:
            lesson.duration = f"{minutes}:{seconds:02d}"

        # 3. Get the final Public URL for the Lesson record
        public_res = supabase.storage.from_('ClinqBucket').get_public_url(lesson.video_path)
        lesson.video_url = public_res.get('publicURL') or public_res.get('public_url')
        
        lesson.status = 'ready'
        lesson.save()

        # Update course-wide stats
        course = lesson.course
        course.lessons_count = course.lessons.filter(status='ready').count()
        course.save()

    except Lesson.DoesNotExist:
        print(f"Lesson {lesson_id} not found.")

    except Exception as e:
        if lesson:
            lesson.status = 'failed'
            lesson.save()
        print(f"Error Processing lesson {lesson_id}: {str(e)}")


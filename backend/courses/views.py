import os
import time

from rest_framework import viewsets, status, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated

from .models import Course, LearningPath, CourseEnroll, Lesson
from .serializers import (
    CourseEnrollSerializer, CourseSerializer,
    LearningPathSerializer, LessonSerializer
)

from supabase import create_client

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related('instructor').all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'level', 'is_featured']
    search_fields = ['title', 'description', 'instructor__email']
    ordering_fields = ['price', 'rating', 'created_at', 'students_count']
    ordering = ['-is_featured', '-created_at']

    @action(detail=True, methods=['post'], url_path='get-upload-url')
    def get_lesson_upload_url(self, request, pk=None):
        """Step 1: Instructor gets a signed URL to upload a lesson video to Supabase."""
        course = self.get_object()
        if course.instructor != request.user:
            return Response({'error': 'Forbidden'}, status=403)

        file_name = request.data.get('filename')
        if not file_name:
            return Response({'error': 'filename required'}, status=400)

        file_path = f"courses/{course.id}/{int(time.time())}-{file_name}"

        lesson = Lesson.objects.create(
            course=course,
            title=file_name.split('.')[0],
            video_path=file_path,
            status='pending',
            order=course.lessons.count() + 1
        )

        try:
            supabase = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_KEY", ""))
            bucket = supabase.storage.from_('ClinqBucket')
            res = bucket.create_signed_upload_url(file_path, 3600)
            return Response({
                "lesson_id": lesson.id,
                "upload_url": res.get('signedUrl') or res.get('signed_url') or res.get('url'),
                "file_path": file_path
            })
        except Exception as e:
            lesson.delete()
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='verify-upload')
    def verify_upload(self, request, pk=None):
        """Step 2: Frontend calls this once the upload to Supabase is done."""
        lesson_id = request.data.get('lesson_id')
        lesson = get_object_or_404(Lesson, id=lesson_id,course__instructor=request.user)

        from .tasks import process_lesson_video
        process_lesson_video.delay(lesson.id)

        return Response({"status": "Processing started..."})

    @action(detail=False, methods=['post'])
    def enroll(self, request):
        course_id = request.data.get('course_id')
        user = request.user

        if not course_id:
            return Response({'error': 'Course ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            course = Course.objects.get(pk=course_id)

            if CourseEnroll.objects.filter(user=user, course=course).exists():
                return Response({"error": "Already enrolled."}, status=status.HTTP_400_BAD_REQUEST)

            with db_transaction.atomic():
                enrollment = CourseEnroll.objects.create(user=user, course=course)
                course.students_count = (course.students_count or 0) + 1
                course.save()

                serializer = CourseEnrollSerializer(enrollment)
                return Response({
                    **serializer.data,
                    'message': 'Enrolled successfully! Access lessons in Clipper Hub.'
                }, status=status.HTTP_201_CREATED)

        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='my-courses')
    def my_courses(self, request):
        enrollments = CourseEnroll.objects.filter(user=request.user)
        serializer = CourseEnrollSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='course-content')
    def get_course_content(self, request, pk=None):
        course = self.get_object()
        user = request.user

        is_instructor = (course.instructor == user)
        is_enrolled = CourseEnroll.objects.filter(user=user, course=course).exists()

        if not (is_instructor or is_enrolled):
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        lessons = course.lessons.all().order_by('order')
        enrollment = CourseEnroll.objects.filter(user=user, course=course).first()
        serializer = LessonSerializer(lessons, many=True)

        return Response({
            "course_title": course.title,
            "is_instructor": is_instructor,
            "current_progress": enrollment.progress if enrollment else 0,
            "lessons": serializer.data
        })

    @action(detail=True, methods=['patch'], url_path='update-progress')
    def update_progress(self, request, pk=None):
        course = self.get_object()
        enrollment = get_object_or_404(CourseEnroll, user=request.user, course=course)
        new_progress = request.data.get('progress')

        if new_progress is not None:
            try:
                progress_val = int(new_progress)
                enrollment.progress = min(progress_val, 100)
                if enrollment.progress == 100:
                    enrollment.is_completed = True
                enrollment.save()
                return Response({"status": "Progress updated", "progress": enrollment.progress})
            except ValueError:
                return Response({"error": "Invalid progress value"}, status=400)

        return Response({"error": "Progress value required"}, status=400)


class LearningPathViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LearningPath.objects.all().order_by('id')
    serializer_class = LearningPathSerializer
    # FIX: was missing — anyone could access learning paths without auth
    permission_classes = [IsAuthenticated]
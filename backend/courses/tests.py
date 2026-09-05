from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from .models import Course, LearningPath, CourseEnroll, Lesson

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(email, password="testpass123", **kwargs):
    return User.objects.create_user(email=email, password=password, **kwargs)


def make_course(instructor, **kwargs):
    defaults = dict(
        title="Django for Beginners",
        description="Learn Django from scratch.",
        category="editing",
        price=Decimal("49.99"),
        original_price=Decimal("99.99"),
        duration="8.5 hours",
        lessons_count=12,
        level="Beginner",
        students_count=0,
    )
    defaults.update(kwargs)
    return Course.objects.create(instructor=instructor, **defaults)


def make_learning_path(**kwargs):
    defaults = dict(
        title="Full-Stack Path",
        description="End-to-end path.",
        courses_count=5,
        duration_str="40 hours",
        has_certificate=True,
    )
    defaults.update(kwargs)
    return LearningPath.objects.create(**defaults)


def make_enrollment(user, course, **kwargs):
    """
    Creates a CourseEnroll while suppressing the notification signal
    so tests don't depend on the notifications app being fully wired up.
    """
    with patch('courses.models.notify_course_enrollment'):
        return CourseEnroll.objects.create(user=user, course=course, **kwargs)


# ===========================================================================
# 1. MODEL TESTS
# ===========================================================================

class CourseModelTest(TestCase):

    def setUp(self):
        self.instructor = make_user("instructor@test.com")

    def test_course_creation(self):
        course = make_course(self.instructor)
        self.assertEqual(course.instructor, self.instructor)
        self.assertEqual(course.students_count, 0)
        self.assertFalse(course.is_featured)

    def test_course_str_representation(self):
        course = make_course(self.instructor, title="Advanced Editing")
        self.assertEqual(str(course), "Advanced Editing")

    def test_course_category_choices(self):
        for cat, _ in Course.CATEGORY_CHOICES:
            course = make_course(self.instructor, title=f"Course {cat}", category=cat)
            self.assertEqual(course.category, cat)

    def test_course_level_choices(self):
        for lvl, _ in Course.LEVEL_CHOICES:
            course = make_course(self.instructor, title=f"Course {lvl}", level=lvl)
            self.assertEqual(course.level, lvl)


class LearningPathModelTest(TestCase):

    def test_learning_path_creation(self):
        path = make_learning_path()
        self.assertEqual(path.courses_count, 5)
        self.assertTrue(path.has_certificate)

    def test_learning_path_str_representation(self):
        path = make_learning_path(title="Content Creator Path")
        self.assertEqual(str(path), "Content Creator Path")


class CourseEnrollModelTest(TestCase):

    def setUp(self):
        self.instructor = make_user("instructor@test.com")
        self.student = make_user("student@test.com")
        self.course = make_course(self.instructor)

    def test_enrollment_creation(self):
        enrollment = make_enrollment(self.student, self.course)
        self.assertEqual(enrollment.progress, 0)
        self.assertFalse(enrollment.is_completed)

    def test_enrollment_str_representation(self):
        enrollment = make_enrollment(self.student, self.course)
        self.assertIn(self.student.email, str(enrollment))
        self.assertIn(self.course.title, str(enrollment))

    def test_unique_together_prevents_duplicate_enrollment(self):
        from django.db import IntegrityError
        make_enrollment(self.student, self.course)
        with self.assertRaises(IntegrityError):
            # Bypass the helper so the signal mock doesn't swallow the error
            with patch('courses.models.notify_course_enrollment'):
                CourseEnroll.objects.create(user=self.student, course=self.course)


class LessonModelTest(TestCase):

    def setUp(self):
        self.instructor = make_user("instructor@test.com")
        self.course = make_course(self.instructor)

    def test_lesson_creation(self):
        lesson = Lesson.objects.create(course=self.course, title="Intro to Editing", order=1)
        self.assertEqual(lesson.course, self.course)
        self.assertEqual(lesson.order, 1)

    def test_lesson_str_representation(self):
        lesson = Lesson.objects.create(course=self.course, title="Colour Grading", order=2)
        self.assertIn(self.course.title, str(lesson))
        self.assertIn("Colour Grading", str(lesson))

    def test_lessons_ordered_by_order_field(self):
        Lesson.objects.create(course=self.course, title="Lesson 3", order=3)
        Lesson.objects.create(course=self.course, title="Lesson 1", order=1)
        Lesson.objects.create(course=self.course, title="Lesson 2", order=2)
        titles = list(self.course.lessons.values_list("title", flat=True))
        self.assertEqual(titles, ["Lesson 1", "Lesson 2", "Lesson 3"])


# ===========================================================================
# 2. SERIALIZER TESTS
# ===========================================================================

class CourseSerializerTest(TestCase):

    def setUp(self):
        self.instructor = make_user("instructor@test.com")

    def test_students_under_1000_formatted_as_string(self):
        from .serializers import CourseSerializer
        course = make_course(self.instructor, students_count=500)
        data = CourseSerializer(course).data
        self.assertEqual(data["students"], "500")

    def test_students_1000_or_more_formatted_as_k(self):
        from .serializers import CourseSerializer
        course = make_course(self.instructor, students_count=12500)
        data = CourseSerializer(course).data
        self.assertEqual(data["students"], "12.5K")

    def test_original_price_exposed_as_camel_case(self):
        from .serializers import CourseSerializer
        course = make_course(self.instructor, original_price=Decimal("99.99"))
        data = CourseSerializer(course).data
        self.assertIn("originalPrice", data)
        self.assertEqual(Decimal(data["originalPrice"]), Decimal("99.99"))

    def test_instructor_name_is_email(self):
        from .serializers import CourseSerializer
        course = make_course(self.instructor)
        data = CourseSerializer(course).data
        self.assertEqual(data["instructor_name"], self.instructor.email)


# ===========================================================================
# 3. API TESTS
# ===========================================================================

class CourseAPIBaseTest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.instructor = make_user("instructor@test.com")
        self.student = make_user("student@test.com")
        self.other_user = make_user("other@test.com")
        self.course = make_course(self.instructor)

    def _enroll_url(self):
        return reverse("course-enroll")

    def _my_courses_url(self):
        return reverse("course-my-courses")

    def _course_content_url(self, pk):
        # FIX: DRF builds the reverse name from the METHOD NAME (get_course_content),
        # not the url_path ('course-content'). Method name underscores → hyphens.
        return reverse("course-get-course-content", kwargs={"pk": pk})

    def _update_progress_url(self, pk):
        return reverse("course-update-progress", kwargs={"pk": pk})


class AuthenticationTest(CourseAPIBaseTest):

    def test_list_courses_requires_auth(self):
        url = reverse("course-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_enroll_requires_auth(self):
        response = self.client.post(self._enroll_url(), {"course_id": self.course.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_my_courses_requires_auth(self):
        response = self.client.get(self._my_courses_url())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_course_content_requires_auth(self):
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_progress_requires_auth(self):
        response = self.client.patch(self._update_progress_url(self.course.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class EnrollActionTest(CourseAPIBaseTest):

    def test_successful_enrollment(self):
        self.client.force_authenticate(user=self.student)
        with patch('courses.models.notify_course_enrollment'):
            response = self.client.post(self._enroll_url(), {"course_id": self.course.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            CourseEnroll.objects.filter(user=self.student, course=self.course).exists()
        )

    def test_enrollment_increments_students_count(self):
        self.client.force_authenticate(user=self.student)
        with patch('courses.models.notify_course_enrollment'):
            self.client.post(self._enroll_url(), {"course_id": self.course.id})
        self.course.refresh_from_db()
        self.assertEqual(self.course.students_count, 1)

    def test_enrollment_response_contains_success_message(self):
        self.client.force_authenticate(user=self.student)
        with patch('courses.models.notify_course_enrollment'):
            response = self.client.post(self._enroll_url(), {"course_id": self.course.id})
        self.assertIn("message", response.data)

    def test_cannot_enroll_twice_in_same_course(self):
        make_enrollment(self.student, self.course)
        self.client.force_authenticate(user=self.student)
        response = self.client.post(self._enroll_url(), {"course_id": self.course.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enroll_without_course_id_returns_400(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(self._enroll_url(), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enroll_nonexistent_course_returns_404(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(self._enroll_url(), {"course_id": 99999})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_multiple_students_can_enroll_in_same_course(self):
        student2 = make_user("student2@test.com")
        self.client.force_authenticate(user=self.student)
        with patch('courses.models.notify_course_enrollment'):
            self.client.post(self._enroll_url(), {"course_id": self.course.id})

        self.client.force_authenticate(user=student2)
        with patch('courses.models.notify_course_enrollment'):
            response = self.client.post(self._enroll_url(), {"course_id": self.course.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.course.refresh_from_db()
        self.assertEqual(self.course.students_count, 2)


class MyCoursesActionTest(CourseAPIBaseTest):

    def test_returns_empty_list_when_not_enrolled(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._my_courses_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_returns_enrolled_courses(self):
        make_enrollment(self.student, self.course)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._my_courses_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_only_returns_own_enrollments(self):
        other_student = make_user("other_student@test.com")
        make_enrollment(other_student, self.course)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._my_courses_url())
        self.assertEqual(len(response.data), 0)

    def test_returns_multiple_enrolled_courses(self):
        course2 = make_course(self.instructor, title="Advanced Course")
        make_enrollment(self.student, self.course)
        make_enrollment(self.student, course2)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._my_courses_url())
        self.assertEqual(len(response.data), 2)


class CourseContentActionTest(CourseAPIBaseTest):

    def _add_lesson(self, order=1):
        return Lesson.objects.create(
            course=self.course, title=f"Lesson {order}", order=order
        )

    def test_enrolled_student_can_access_content(self):
        make_enrollment(self.student, self.course)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_instructor_can_access_own_course_content(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_instructor"])

    def test_unenrolled_user_is_denied(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_response_contains_lessons(self):
        self._add_lesson(order=1)
        self._add_lesson(order=2)
        make_enrollment(self.student, self.course)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(len(response.data["lessons"]), 2)

    def test_lessons_are_ordered_correctly(self):
        self._add_lesson(order=2)
        self._add_lesson(order=1)
        make_enrollment(self.student, self.course)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._course_content_url(self.course.id))
        orders = [l["order"] for l in response.data["lessons"]]
        self.assertEqual(orders, sorted(orders))

    def test_response_contains_progress_for_enrolled_student(self):
        make_enrollment(self.student, self.course, progress=42)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(response.data["current_progress"], 42)

    def test_instructor_progress_defaults_to_zero(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(response.data["current_progress"], 0)

    def test_response_contains_course_title(self):
        make_enrollment(self.student, self.course)
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self._course_content_url(self.course.id))
        self.assertEqual(response.data["course_title"], self.course.title)


class UpdateProgressActionTest(CourseAPIBaseTest):

    def setUp(self):
        super().setUp()
        self.enrollment = make_enrollment(self.student, self.course, progress=0)

    def test_valid_progress_update(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            self._update_progress_url(self.course.id), {"progress": 60}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.progress, 60)

    def test_progress_capped_at_100(self):
        self.client.force_authenticate(user=self.student)
        self.client.patch(self._update_progress_url(self.course.id), {"progress": 150})
        self.enrollment.refresh_from_db()
        self.assertEqual(self.enrollment.progress, 100)

    def test_progress_100_marks_course_as_completed(self):
        self.client.force_authenticate(user=self.student)
        with patch('courses.models.notify_course_completion'):
            self.client.patch(self._update_progress_url(self.course.id), {"progress": 100})
        self.enrollment.refresh_from_db()
        self.assertTrue(self.enrollment.is_completed)

    def test_progress_below_100_does_not_mark_completed(self):
        self.client.force_authenticate(user=self.student)
        self.client.patch(self._update_progress_url(self.course.id), {"progress": 99})
        self.enrollment.refresh_from_db()
        self.assertFalse(self.enrollment.is_completed)

    def test_invalid_progress_value_returns_400(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(
            self._update_progress_url(self.course.id), {"progress": "not-a-number"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_progress_returns_400(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(self._update_progress_url(self.course.id), {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_enrolled_user_cannot_update_progress(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.patch(
            self._update_progress_url(self.course.id), {"progress": 50}
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class LearningPathAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = make_user("user@test.com")
        self.path = make_learning_path()

    def test_list_learning_paths_authenticated(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("learning-path-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # FIX: LearningPathViewSet now has pagination so results are under ['results']
        self.assertEqual(len(response.data['results']), 1)

    def test_list_learning_paths_requires_auth(self):
        # FIX: LearningPathViewSet now has permission_classes = [IsAuthenticated]
        url = reverse("learning-path-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_single_learning_path(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("learning-path-detail", kwargs={"pk": self.path.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], self.path.title)

    def test_learning_path_is_read_only(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("learning-path-list")
        response = self.client.post(url, {"title": "New Path"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
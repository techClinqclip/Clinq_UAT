from rest_framework import serializers
from .models import Course, LearningPath, CourseEnroll, Lesson
from drf_spectacular.utils import extend_schema_field

class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'description', 'video_url', 'duration', 'order', 'status']
        read_only_fields = ['status', 'video_url']

class CourseSerializer(serializers.ModelSerializer):
    originalPrice = serializers.DecimalField(source='original_price', max_digits=8, decimal_places=2, read_only=True)
    reviews = serializers.IntegerField(source='reviews_count', read_only=True)

    # Corrected field name to match model: lessons_count
    lessons = serializers.IntegerField(source='lessons_count', read_only=True)
    students = serializers.SerializerMethodField()

    # Return instructor email or name instead of ID
    instructor_name = serializers.CharField(source='instructor.email', read_only=True)
    category = serializers.ChoiceField(
        choices=Course.CATEGORY_CHOICES,
        help_text="Course category"
    )

    class Meta:
        model = Course
        fields='__all__'
        read_only_fields = ['instructor', 'student_count', 'lessons_count']

    @extend_schema_field(serializers.CharField)
    def get_students(self, obj):
        # Human-readable format (e.g., 1.2K)
        if obj.students_count >= 1000:
            return f"{obj.students_count/1000:.1f}K"
        return str(obj.students_count)

class CourseEnrollSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    # Instructor is now a User object
    instructor = serializers.CharField(source='course.instructor.email', read_only=True)

    class Meta:
        model = CourseEnroll
        fields = ['id', 'user', 'course', 'course_title', 'enrolled_at', 'instructor', 'progress', 'is_completed']

class LearningPathSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPath
        fields = '__all__'
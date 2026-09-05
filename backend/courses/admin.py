# Use to customize the admin panel.

from django.contrib import admin
from .models import Course, LearningPath, CourseEnroll, Lesson


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'category', 'price', 'rating', 'students_count', 'is_featured', 'created_at']
    list_filter = ['category', 'level', 'is_featured', 'created_at']
    search_fields = ['title', 'description', 'instructor__email']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'instructor', 'category', 'level')
        }),
        ('Pricing', {
            'fields': ('price', 'original_price')
        }),
        ('Statistics', {
            'fields': ('rating', 'reviews_count', 'students_count', 'duration', 'lessons_count')
        }),
        ('Featured', {
            'fields': ('is_featured',)
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )


@admin.register(LearningPath)
class LearningPathAdmin(admin.ModelAdmin):
    list_display = ['title', 'courses_count', 'duration_str', 'has_certificate']
    search_fields = ['title', 'description']
    list_filter = ['has_certificate']


@admin.register(CourseEnroll)
class CourseEnrollAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'progress', 'is_completed', 'enrolled_at']
    list_filter = ['is_completed', 'enrolled_at']
    search_fields = ['user__email', 'course__title']
    readonly_fields = ['enrolled_at']
    ordering = ['-enrolled_at']


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'duration', 'created_at']
    list_filter = ['course', 'created_at']
    search_fields = ['title', 'description', 'course__title']
    readonly_fields = ['created_at']
    ordering = ['course', 'order']
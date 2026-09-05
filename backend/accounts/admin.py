from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Profile

# Register your models here.

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'is_staff', 'is_superuser', 'is_active'] # Customize display fields
    list_filter = ("is_staff", "is_superuser", "is_active")
    search_fields = ("email", )
    ordering = ("email", )

    # fieldsets for django admin panel
    fieldsets = (
        (None,{"fields":("email", "password")}),
        ("Permissions", {"fields": ("is_staff", "is_active", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields":("last_login",)}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "is_staff", "is_active")
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'total_earnings', 'rating', 'clips_completed', 'created_at']
    list_filter = ['created_at', 'rating']
    search_fields = ['user__email', 'bio', 'location']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'bio', 'location', 'avatar')
        }),
        ('Financial Information', {
            'fields': ('upi_id', 'total_earnings')
        }),
        ('Performance Stats', {
            'fields': ('rating', 'clips_completed', 'views_generated')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
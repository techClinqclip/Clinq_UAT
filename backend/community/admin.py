from django.contrib import admin
from .models import Discussion, DiscussionReply, DiscussionLike, CommunityEvent


@admin.register(Discussion)
class DiscussionAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'views_count', 'likes_count', 'replies_count', 'is_pinned', 'created_at']
    list_filter = ['category', 'is_pinned', 'is_locked', 'category', 'created_at']
    search_fields = ['title', 'content', 'author__email']
    readonly_fields = ['views_count', 'likes_count', 'replies_count', 'created_at', 'updated_at']
    ordering = ['-is_pinned', '-created_at']


@admin.register(DiscussionReply)
class DiscussionReplyAdmin(admin.ModelAdmin):
    list_display = ['discussion', 'author', 'is_solution', 'likes_count', 'created_at']
    list_filter = ['is_solution', 'created_at']
    search_fields = ['content', 'author__email', 'discussion__title']
    readonly_fields = ['likes_count', 'created_at', 'updated_at']


@admin.register(DiscussionLike)
class DiscussionLikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'discussion', 'reply', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email']


@admin.register(CommunityEvent)
class CommunityEventAdmin(admin.ModelAdmin):
    list_display = ['title', 'organizer', 'event_type', 'start_date', 'participants_count', 'is_featured']
    list_filter = ['event_type', 'is_online', 'is_featured', 'start_date']
    search_fields = ['title', 'description', 'organizer__email']
    readonly_fields = ['participants_count', 'created_at', 'updated_at']

from django.contrib import admin
from .models import Content, Bid, ClipSubmission


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ['title', 'creator', 'category', 'status', 'budget', 'highlight_type', 'created_at']
    list_filter = ['category', 'status', 'highlight_type', 'is_biddable', 'is_paid_listing', 'created_at']
    search_fields = ['title', 'description', 'creator__email']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('creator', 'title', 'description', 'category')
        }),
        ('Media URLs', {
            'fields': ('raw_video_url', 'proxy_video_url', 'review_url', 'final_video_url', 'thumbnail_url')
        }),
        ('Pricing & Strategy', {
            'fields': ('is_biddable', 'budget', 'highlight_type', 'is_paid_listing')
        }),
        ('Status & Assignment', {
            'fields': ('status', 'assigned_clipper')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ['content', 'clipper', 'bid_amount', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['content__title', 'clipper__email', 'pitch']
    readonly_fields = ['created_at']
    ordering = ['-created_at']


@admin.register(ClipSubmission)
class ClipSubmissionAdmin(admin.ModelAdmin):
    list_display = ['project', 'clipper', 'platform', 'post_url', 'status', 'views', 'reach', 'created_at']
    list_filter = ['platform', 'status', 'is_moderated', 'meets_instructions', 'payout_triggered', 'created_at']
    search_fields = ['project__title', 'clipper__email', 'post_url']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Submission Information', {
            'fields': ('project', 'clipper', 'post_url', 'platform')
        }),
        ('Metrics', {
            'fields': ('views', 'reach', 'engagement_rate')
        }),
        ('Moderation', {
            'fields': ('is_moderated', 'meets_instructions', 'moderation_notes', 'status')
        }),
        ('Payout', {
            'fields': ('payout_triggered',)
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
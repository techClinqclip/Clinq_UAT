from django.contrib import admin
from .models import SupportTicket, FAQ, FAQFeedback


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_number', 'user', 'subject', 'category', 'priority', 'status', 'created_at']
    list_filter = ['status', 'category', 'priority', 'created_at']
    search_fields = ['ticket_number', 'subject', 'user__email', 'description']
    readonly_fields = ['ticket_number', 'user', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Ticket Information', {
            'fields': ('ticket_number', 'user', 'subject', 'description', 'category', 'priority', 'status')
        }),
        ('Response', {
            'fields': ('admin_response', 'resolved_by', 'resolved_at')
        }),
        ('Attachments', {
            'fields': ('attachment',)
        }),
    )


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'category', 'is_featured', 'is_published', 'views_count', 'helpful_count', 'order']
    list_filter = ['category', 'is_featured', 'is_published', 'created_at']
    search_fields = ['question', 'answer']
    readonly_fields = ['views_count', 'helpful_count', 'not_helpful_count', 'created_at', 'updated_at']
    ordering = ['order', '-is_featured', '-created_at']


@admin.register(FAQFeedback)
class FAQFeedbackAdmin(admin.ModelAdmin):
    list_display = ['faq', 'user', 'is_helpful', 'created_at']
    list_filter = ['is_helpful', 'created_at']
    search_fields = ['faq__question', 'user__email']
    readonly_fields = ['created_at']

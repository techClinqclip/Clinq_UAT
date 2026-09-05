from django.contrib import admin
from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'transaction_type', 'payment_method', 'status', 'content', 'submission', 'created_at']
    list_filter = ['transaction_type', 'payment_method', 'status', 'created_at']
    search_fields = ['user__email', 'external_ref', 'payment_details', 'bot_notes']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Transaction Information', {
            'fields': ('user', 'amount', 'transaction_type', 'payment_method', 'payment_details', 'status')
        }),
        ('Related Objects', {
            'fields': ('content', 'submission')
        }),
        ('External References', {
            'fields': ('external_ref', 'bot_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
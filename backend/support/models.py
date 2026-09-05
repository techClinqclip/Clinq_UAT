from django.db import models
from django.conf import settings


class SupportTicket(models.Model):
    """Support tickets from users"""
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    CATEGORY_CHOICES = [
        ('technical', 'Technical Issue'),
        ('billing', 'Billing & Payments'),
        ('account', 'Account Issue'),
        ('content', 'Content Related'),
        ('feature', 'Feature Request'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_tickets'
    )
    ticket_number = models.CharField(max_length=20, unique=True, db_index=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Attachments
    attachment = models.FileField(upload_to='support/tickets/', blank=True, null=True)
    
    # Admin response
    admin_response = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_tickets'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', 'priority', '-created_at']),
            models.Index(fields=['ticket_number']),
        ]

    def __str__(self):
        return f"#{self.ticket_number} - {self.subject}"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            # Generate unique ticket number
            import random
            import string
            while True:
                ticket_num = f"TKT-{''.join(random.choices(string.digits, k=8))}"
                if not SupportTicket.objects.filter(ticket_number=ticket_num).exists():
                    self.ticket_number = ticket_num
                    break
        super().save(*args, **kwargs)


class SupportTicketMessage(models.Model):
    """A persisted message exchanged inside a support ticket."""
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_messages',
    )
    body = models.TextField()
    attachment = models.FileField(upload_to='support/messages/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['ticket', 'created_at']),
        ]

    def __str__(self):
        return f'{self.ticket.ticket_number} message by {self.sender.email}'


class FAQ(models.Model):
    """Frequently Asked Questions"""
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('getting_started', 'Getting Started'),
        ('earnings', 'Earnings & Payouts'),
        ('content', 'Content & Clips'),
        ('account', 'Account & Profile'),
        ('technical', 'Technical Support'),
        ('billing', 'Billing & Payments'),
    ]

    question = models.CharField(max_length=500)
    answer = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='general')
    is_featured = models.BooleanField(default=False, help_text="Show in featured section")
    is_published = models.BooleanField(default=True)
    order = models.IntegerField(default=0, help_text="Display order")
    views_count = models.IntegerField(default=0)
    helpful_count = models.IntegerField(default=0)
    not_helpful_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-is_featured', '-created_at']
        indexes = [
            models.Index(fields=['category', 'is_published', 'order']),
        ]
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'

    def __str__(self):
        return self.question


class FAQFeedback(models.Model):
    """Track user feedback on FAQs"""
    faq = models.ForeignKey(
        FAQ,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='faq_feedback',
        null=True,
        blank=True
    )
    is_helpful = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['faq', 'user']
        indexes = [
            models.Index(fields=['faq', 'is_helpful']),
        ]

    def __str__(self):
        return f"{'Helpful' if self.is_helpful else 'Not Helpful'} - {self.faq.question[:50]}"

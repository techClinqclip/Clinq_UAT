from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Sum

# Import notifications helpers for integration
try:
    from notifications.helpers import (
        notify_earnings_payment_processed,
        notify_earnings_payout_status,
        notify_earnings_milestone
    )
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False
    notify_earnings_payment_processed = None
    notify_earnings_payout_status = None
    notify_earnings_milestone = None


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('earning', 'Viral Earning'),       # Clipper earned from reach
        ('withdrawal', 'Withdrawal'),       # Clipper taking money out
        ('commission', 'Platform Fee'),     # Your platform cut
        ('listing_fee', 'Premium Listing'), # Creator "Gig of the Day" payment
        ('bid_fee', 'Premium Bid Fee'),     # Clipper bidding fee
    ]

    PAYMENT_METHOD_CHOICES = [
        ('upi', 'UPI'),
        ('bank_transfer', 'Bank Transfer'),
        ('paypal', 'PayPal'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),             # Waiting for Bot/Manual approval
        ('completed', 'Successful'),        # Transaction finalized
        ('failed', 'Failed'),               # Transaction error
        ('rejected', 'Rejected'),           # Bot flagged non-compliance
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, db_index=True)
    payment_details = models.CharField(max_length=255, blank=True, help_text="UPI ID or bank transfer details")
    
    content = models.ForeignKey('content.Content', on_delete=models.SET_NULL, null=True, blank=True)
    submission = models.ForeignKey('content.ClipSubmission', on_delete=models.SET_NULL, null=True, blank=True)
    
    external_ref = models.CharField(max_length=100, blank=True, help_text="UPI Ref or Bank ID")
    bot_notes = models.TextField(blank=True, help_text="Notes on compliance/reach")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        method = f" ({self.payment_method.upper()})" if self.payment_method else ""
        return f"{self.user.email} - {self.transaction_type} - ₹{self.amount}{method}"


# Signal handlers for notifications
@receiver(post_save, sender=Transaction)
def transaction_notification_handler(sender, instance, created, **kwargs):
    """
    Send notifications when transactions are created or updated
    """
    if not NOTIFICATIONS_AVAILABLE or not notify_earnings_payment_processed:
        return

    from notifications.helpers import notify_user_event
    
    user_id = str(instance.user.id)
    
    # Notify when earning is completed
    if (instance.transaction_type == 'earning' and 
        instance.status == 'completed' and 
        created):
        method = instance.payment_method or 'manual'
        notify_earnings_payment_processed(
            user_id=user_id,
            amount=float(instance.amount),
            method=method,
            transaction_id=str(instance.id)
        )
        
        # Check for milestones
        total_earnings = Transaction.objects.filter(
            user=instance.user,
            transaction_type='earning',
            status='completed'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Notify milestones
        milestones = [1000, 5000, 10000, 25000, 50000, 100000]
        for milestone in milestones:
            if total_earnings >= milestone:
                # In a real app, you'd track which milestones were already notified
                # For now, just notify the most recent one crossed
                pass
    
    # Notify when withdrawal status changes
    if instance.transaction_type == 'withdrawal' and notify_earnings_payout_status:
        # Only notify on status changes, not creation
        if not created and kwargs.get('update_fields'):
            old_status = None
            # We can't easily get the old status without tracking it
            # In production, you'd use a library like django-model-utils or track manually
            
            notify_earnings_payout_status(
                user_id=user_id,
                payout_id=str(instance.id),
                status=instance.status,
                amount=float(instance.amount)
            )

    if created and instance.transaction_type == 'withdrawal':
        notify_user_event(
            user_id=instance.user_id,
            event_type='earnings.withdrawal_status',
            title='Withdrawal submitted',
            message=f'Your withdrawal of ₹{instance.amount} is pending.',
            category='earnings',
            entity_type='transaction',
            payload={'transaction_id': str(instance.id), 'amount': str(instance.amount), 'status': instance.status},
            email=True,
            idempotency_key=f'earnings.withdrawal_status:{instance.id}',
        )

    if created and instance.status == 'completed' and instance.transaction_type == 'earning':
        notify_user_event(
            user_id=instance.user_id,
            event_type='earnings.payment_received',
            title='Payment received',
            message=f'₹{instance.amount} has been added to your earnings.',
            category='earnings',
            entity_type='transaction',
            payload={'transaction_id': str(instance.id), 'amount': str(instance.amount)},
            email=False,
            idempotency_key=f'earnings.payment_received:{instance.id}',
        )

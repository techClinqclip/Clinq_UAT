from collections import defaultdict

from django.db import models
from django.conf import settings
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from decimal import Decimal
from uuid import UUID

# Import notifications helpers for integration
try:
    from notifications.helpers import (
        notify_leaderboard_rank_change,
        notify_leaderboard_top_10,
        notify_leaderboard_new_period
    )
    NOTIFICATIONS_AVAILABLE = True
except ImportError:
    NOTIFICATIONS_AVAILABLE = False


class LeaderboardEntry(models.Model):
    """
    Stores leaderboard rankings for different categories and periods
    This is a denormalized table that gets updated periodically
    """
    CATEGORY_CHOICES = [
        ('creators', 'Creators'),
        ('clippers', 'Clippers'),
        ('brands', 'Brands'),
        ('overall', 'Overall'),
    ]
    
    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('all_time', 'All Time'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leaderboard_entries'
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    period = models.CharField(max_length=20, choices=PERIOD_CHOICES)
    
    # Ranking metrics
    rank = models.IntegerField()
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    clips_completed = models.IntegerField(default=0)
    content_created = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal("0.00"))
    engagement_score = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    
    # Calculated score (weighted combination of metrics)
    score = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    
    # Timestamp for when this entry was calculated
    calculated_at = models.DateTimeField(auto_now=True)
    period_start = models.DateTimeField(help_text="Start of the ranking period")
    period_end = models.DateTimeField(help_text="End of the ranking period")

    class Meta:
        unique_together = ['user', 'category', 'period', 'period_start']
        indexes = [
            models.Index(fields=['category', 'period', '-score', 'rank']),
            models.Index(fields=['user', 'category', 'period']),
        ]
        ordering = ['category', 'period', 'rank']

    def __str__(self):
        return f"{self.user.email} - {self.get_category_display()} - {self.get_period_display()} - Rank #{self.rank}"

    @classmethod
    def calculate_rankings(cls, category='creators', period='monthly'):
        """
        Calculate and update leaderboard rankings for a category and period
        """
        now = timezone.now()
        
        # Determine date range based on period
        def get_period_range(period):
            if period == 'daily':
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                return start, start + timedelta(days=1)
            
            if period == 'weekly':
                start = (now - timedelta(days=now.weekday())).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                return start, start + timedelta(days=7)  
                 
            if period == 'monthly':
                start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

                if now.month == 12:
                    end = start.replace(year=start.year + 1, month=1)
                else:
                    end = start.replace(month=start.month + 1)
                return start, end 
            
            start = timezone.make_aware(timezone.datetime(year=2026, month=1, day=1))
            return start, now

        period_start, period_end = get_period_range(period)
        
        # Get users based on category - use lazy import to avoid circular dependencies
        from django.apps import apps
        User = apps.get_model(settings.AUTH_USER_MODEL)
        Transaction = apps.get_model('earnings', 'Transaction')
        Content = apps.get_model('content', 'Content')
        ClipSubmission = apps.get_model('content', 'ClipSubmission')

        EARNINGS_CONTRIBUTION_IN_ENGAGEMENT_SCORE = 0.4
        CLIPS_CONTRIBUTION_IN_ENGAGEMENT_SCORE = 10
        CONTENT_CONTRIBUTION_IN_ENGAGEMENT_SCORE_ = 5

        EARNINGS_CONTRIBUTION_IN_SCORE = 0.6
        ENGAGEMENT_SCORE_CONTRIBUTION_IN_SCORE = 0.4

        
        if category == 'creators':
            users = User.objects.filter(type='creator')
        elif category == 'clippers':
            users = User.objects.filter(type='clipper')
        elif category == 'brands':
            users = User.objects.filter(type='brand')
        else:
            users = User.objects.all()

        users = users.select_related("profile").filter(profile_isnull=False)
        
        user_ids = list(users.values_list("id", flat=True))

        # Earnings aggregation (1 query)
        earnings_map = {
            e["user"]: e["total"] or 0
            for e in Transaction.objects.filter(
                user_id__in=user_ids,
                transaction_type='earning',
                status='completed',
                created_at__gte=period_start,
                created_at__lt=period_end
            ).values("user").annotate(total=Sum("ammount"))
        }

        # Content / Clips aggregation (1 query)
        content_map = defaultdict(int)
        clips_map= defaultdict(int)

        if category == 'creators':
            for c in Content.objects.filter(
                creator_id__in=user_ids,
                created_at__gte=period_start,
                created_at_lt=period_end
            ).values("creator").annotate(count=Count("id")):
                content_map[c["creator"]] = c["count"]

        elif category == 'clippers':
            for c in ClipSubmission.objects.filter(
                clipper_id__in=user_ids,
                created_at__gte=period_start,
                created_at__lt=period_end
            ).values("clipper").annotate(count=Count("id")):
                clips_map[c["clipper"]] = c["count"]

        # Build rankings (No DB calls here)
        rankings = []

        for user in users:
            earnings = earnings_map.get(user.id, 0)
            content_created = content_map.get(user.id, 0)
            clips_completed = clips_map.get(user.id, 0)

            # Calculate engagement score (simplified)
            engagement_score = float(earnings) * EARNINGS_CONTRIBUTION_IN_ENGAGEMENT_SCORE + clips_completed * CLIPS_CONTRIBUTION_IN_ENGAGEMENT_SCORE + content_created * CONTENT_CONTRIBUTION_IN_ENGAGEMENT_SCORE_
            
            # Calculate overall score
            score = float(earnings) * EARNINGS_CONTRIBUTION_IN_SCORE + engagement_score * ENGAGEMENT_SCORE_CONTRIBUTION_IN_SCORE

            rankings.append({
                'user': user,
                'total_earnings': earnings,
                'clips_completed': clips_completed,
                'content_created': content_created,
                'average_rating': float(user.profile.rating or 0),
                'engagement_score': engagement_score,
                'score': score,
            })

            if not rankings:
                return []

        # Sort by score and assign ranks
        rankings.sort(key=lambda x: x['score'], reverse=True)
        
        # Delete old entries for this period
        cls.objects.filter(category=category, 
                           period=period, 
                           period_start=period_start
                           ).delete()
        
        # Get previous rankings for comparison
        previous_entries = {
            row["user_id"]: row["rank"]
            for row in cls.objects.filter(
                category=category,
                period=period,
                period_start__lt=period_start
            ).values("user_id", "rank")
        }

        # Build entries
        entries = []
        top_user_ids = []

        for rank, data in enumerate(rankings, start=1):
            user = data['user']
        
            entry = cls(
                user=user,
                category=category,
                period=period,
                rank=rank,
                total_earnings=data['total_earnings'],
                clips_completed=data['clips_completed'],
                content_created=data['content_created'],
                average_rating=data['average_rating'],
                engagement_score=data['engagement_score'],
                score=data['score'],
                period_start=period_start,
                period_end=period_end,
            )
            entries.append(entry)

            if rank <= 100:
                top_user_ids.append(UUID(str(user.id)))
            
            # Send notifications if enabled
            if NOTIFICATIONS_AVAILABLE:
                previous_rank = previous_entries.get(user.id)
                
                # Notify about rank change
                if previous_rank and previous_rank != rank:
                    notify_leaderboard_rank_change(
                        user_id=UUID(user.id),
                        old_rank=previous_rank,
                        new_rank=rank,
                        category=category,
                        period=period,
                    )
                
                # Notify about entering top 10
                if rank <= 10 and (previous_rank is None or previous_rank > 10):
                    notify_leaderboard_top_10(
                        user_id=UUID(user.id),
                        rank=rank,
                        category=category,
                    )
        # Bulk insert
        cls.objects.bulk_create(entries)
        
        # Batch notification
        if NOTIFICATIONS_AVAILABLE and top_user_ids:
            notify_leaderboard_new_period(
                user_ids=top_user_ids,
                category=category,
                period=period
            )
        
        return entries

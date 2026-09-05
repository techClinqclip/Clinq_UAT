from django.contrib import admin
from .models import LeaderboardEntry


@admin.register(LeaderboardEntry)
class LeaderboardEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'period', 'rank', 'score', 'total_earnings', 'calculated_at']
    list_filter = ['category', 'period', 'calculated_at']
    search_fields = ['user__email']
    readonly_fields = ['calculated_at', 'period_start', 'period_end']
    ordering = ['category', 'period', 'rank']

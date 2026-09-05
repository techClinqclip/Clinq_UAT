from celery import shared_task
from django.core.cache import cache
from .models import LeaderboardEntry

def calculate_and_cache_leaderboard(category="creators", period="monthly"):
    entries = LeaderboardEntry.calculate_rankings(category, period)

    # Cache top 100 (fast access)
    cache_key = f"leaderboard:{category}:{period}"

    data = [
        {
            "user_id":entry.user_id,
            "rank":entry.rank,
            "score": float(entry.score),
            "earnings": float(entry.total_earnings),
        }
        for entry in entries[:100]
    ]

    cache.set(cache_key, data, timeout=60 * 10) # for 10 min cache

    return len(entries)
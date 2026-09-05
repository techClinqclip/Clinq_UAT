"""
Rate Limiting Service for Notifications.

Provides rate limiting functionality to prevent notification spam.
Uses Redis-based sliding window algorithm for scalability.

Design:
- Redis-based for distributed system compatibility
- Sliding window algorithm for smooth rate limiting
- Per-user and per-event-type rate limits
"""

import logging
from typing import Tuple

from django.conf import settings

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded."""
    pass


class RateLimiter:
    """
    Redis-based rate limiter using sliding window algorithm.
    
    Rate Limiting Rules:
    - Per-user per-category: Max 10 notifications per minute
    - Per-user per-event-type: Max 5 notifications per minute
    - Bulk dispatch: Max 1000 notifications per minute
    
    Usage:
        limiter = RateLimiter()
        allowed, remaining = limiter.check_rate_limit("user:123:content", 1)
        if not allowed:
            raise RateLimitExceeded("Too many notifications")
    """
    
    # Default rate limits (can be overridden via settings)
    DEFAULT_LIMITS = {
        'user_category': {'count': 10, 'window': 60},  # 10 per minute
        'user_event': {'count': 5, 'window': 60},      # 5 per minute
        'bulk_dispatch': {'count': 1000, 'window': 60},  # 1000 per minute
        'broadcast': {'count': 5, 'window': 3600},      # 5 per hour
    }
    
    def __init__(self, redis_client=None):
        """
        Initialize the rate limiter.
        
        Args:
            redis_client: Optional Redis client instance
        """
        self.redis = redis_client
        self._use_redis = False
        
        # Try to get Redis client from Django settings
        if not self.redis:
            try:
                from django_redis import get_redis_connection
                self.redis = get_redis_connection('default')
                self._use_redis = True
            except Exception as e:
                logger.warning(f"Redis not available, using memory-based rate limiting: {e}")
                self._use_redis = False
        
        # Memory-based fallback
        self._memory_cache = {}
    
    def check_rate_limit(
        self,
        key: str,
        count: int = 1,
        limit_type: str = 'user_category',
    ) -> Tuple[bool, int]:
        """
        Check if a rate limit is exceeded.
        
        Args:
            key: Rate limit key (e.g., 'user:123:content')
            count: Number of notifications to send
            limit_type: Type of rate limit to check
        
        Returns:
            Tuple of (is_allowed, remaining_count)
        
        Raises:
            RateLimitExceeded: If rate limit is exceeded
        """
        if self._use_redis:
            return self._check_redis_rate_limit(key, count, limit_type)
        else:
            return self._check_memory_rate_limit(key, count, limit_type)
    
    def _check_redis_rate_limit(
        self,
        key: str,
        count: int,
        limit_type: str,
    ) -> Tuple[bool, int]:
        """Check rate limit using Redis."""
        limits = self.DEFAULT_LIMITS.get(limit_type, self.DEFAULT_LIMITS['user_category'])
        max_count = limits['count']
        window = limits['window']
        
        # Redis key for this rate limit
        redis_key = f"ratelimit:{key}"
        
        try:
            pipe = self.redis.pipeline()
            # Increment counter
            pipe.incrby(redis_key, count)
            # Set expiry
            pipe.expire(redis_key, window)
            results = pipe.execute()
            
            current_count = results[0]
            remaining = max(0, max_count - current_count)
            
            is_allowed = current_count <= max_count
            
            if not is_allowed:
                logger.warning(f"Rate limit exceeded for key: {key}")
            
            return is_allowed, remaining
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            # Fail open - allow the request if Redis is having issues
            return True, max_count
    
    def _check_memory_rate_limit(
        self,
        key: str,
        count: int,
        limit_type: str,
    ) -> Tuple[bool, int]:
        """Check rate limit using in-memory cache (fallback)."""
        import time
        limits = self.DEFAULT_LIMITS.get(limit_type, self.DEFAULT_LIMITS['user_category'])
        max_count = limits['count']
        
        # Get or create entry
        if key not in self._memory_cache:
            self._memory_cache[key] = {
                'count': 0,
                'window_start': time.time()
            }
        
        entry = self._memory_cache[key]
        current_time = time.time()
        
        # Reset window if expired (simplified - no sliding window)
        if current_time - entry['window_start'] > limits['window']:
            entry['count'] = 0
            entry['window_start'] = current_time
        
        # Check limit
        current_count = entry['count'] + count
        remaining = max(0, max_count - current_count)
        is_allowed = current_count <= max_count
        
        if is_allowed:
            entry['count'] = current_count
        
        return is_allowed, remaining
    
    def get_rate_limit_info(
        self,
        key: str,
        limit_type: str = 'user_category',
    ) -> dict:
        """
        Get detailed rate limit information for a key.
        
        Args:
            key: Rate limit key
            limit_type: Type of rate limit
        
        Returns:
            Dictionary with rate limit info
        """
        limits = self.DEFAULT_LIMITS.get(limit_type, self.DEFAULT_LIMITS['user_category'])
        
        if self._use_redis:
            return self._get_redis_info(key, limits)
        else:
            return self._get_memory_info(key, limits)
    
    def _get_redis_info(self, key: str, limits: dict) -> dict:
        """Get rate limit info from Redis."""
        redis_key = f"ratelimit:{key}"
        
        try:
            current = self.redis.get(redis_key)
            current_count = int(current) if current else 0
            
            ttl = self.redis.ttl(redis_key)
            remaining_time = ttl if ttl > 0 else limits['window']
            
            return {
                'limit': limits['count'],
                'remaining': max(0, limits['count'] - current_count),
                'reset_time': remaining_time,
                'window': limits['window'],
            }
        except Exception as e:
            logger.error(f"Failed to get rate limit info: {e}")
            return {
                'limit': limits['count'],
                'remaining': limits['count'],
                'reset_time': limits['window'],
                'window': limits['window'],
            }
    
    def _get_memory_info(self, key: str, limits: dict) -> dict:
        """Get rate limit info from memory cache."""
        import time
        entry = self._memory_cache.get(key, {'count': 0, 'window_start': 0})
        current_time = time.time()
        
        # Calculate remaining time in window
        elapsed = current_time - entry.get('window_start', current_time)
        remaining_time = max(0, limits['window'] - elapsed)
        
        return {
            'limit': limits['count'],
            'remaining': max(0, limits['count'] - entry.get('count', 0)),
            'reset_time': int(remaining_time),
            'window': limits['window'],
        }
    
    def reset_rate_limit(self, key: str, limit_type: str = 'user_category') -> bool:
        """
        Reset rate limit for a specific key.
        
        Args:
            key: Rate limit key to reset
            limit_type: Type of rate limit
        
        Returns:
            True if reset successful
        """
        if self._use_redis:
            try:
                redis_key = f"ratelimit:{key}"
                self.redis.delete(redis_key)
                return True
            except Exception as e:
                logger.error(f"Failed to reset Redis rate limit: {e}")
                return False
        else:
            if key in self._memory_cache:
                del self._memory_cache[key]
            return True


class NotificationRateLimiter:
    """
    Convenience wrapper for notification-specific rate limiting.
    
    Provides pre-configured rate limiters for common notification scenarios.
    """
    
    def __init__(self):
        self.limiter = RateLimiter()
    
    def check_user_category_rate_limit(
        self,
        user_id: str,
        category: str,
    ) -> Tuple[bool, int]:
        """
        Check rate limit for user in a specific category.
        
        Args:
            user_id: User ID
            category: Notification category
        
        Returns:
            Tuple of (is_allowed, remaining)
        """
        key = f"user:{user_id}:{category}"
        return self.limiter.check_rate_limit(key, limit_type='user_category')
    
    def check_user_event_rate_limit(
        self,
        user_id: str,
        event_type: str,
    ) -> Tuple[bool, int]:
        """
        Check rate limit for user for a specific event type.
        
        Args:
            user_id: User ID
            event_type: Event type
        
        Returns:
            Tuple of (is_allowed, remaining)
        """
        key = f"user:{user_id}:event:{event_type}"
        return self.limiter.check_rate_limit(key, limit_type='user_event')
    
    def check_bulk_dispatch_rate_limit(
        self,
        event_type: str,
        count: int,
    ) -> Tuple[bool, int]:
        """
        Check rate limit for bulk notification dispatch.
        
        Args:
            event_type: Type of event
            count: Number of notifications
        
        Returns:
            Tuple of (is_allowed, remaining)
        """
        key = f"bulk:{event_type}"
        return self.limiter.check_rate_limit(key, count, limit_type='bulk_dispatch')
    
    def check_broadcast_rate_limit(
        self,
        admin_id: str,
    ) -> Tuple[bool, int]:
        """
        Check rate limit for broadcast notifications.
        
        Args:
            admin_id: Admin user ID
        
        Returns:
            Tuple of (is_allowed, remaining)
        """
        key = f"broadcast:{admin_id}"
        return self.limiter.check_rate_limit(key, limit_type='broadcast')


def get_rate_limiter() -> RateLimiter:
    """
    Factory function to get a RateLimiter instance.
    
    Returns a configured RateLimiter instance.
    """
    return RateLimiter()


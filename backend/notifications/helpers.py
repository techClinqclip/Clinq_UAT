"""
Notification Helper Functions for App Integrations.

Provides easy-to-use notification functions for all apps:
- Leaderboard notifications
- Earnings notifications
- Referral notifications
- Community notifications
- Content notifications
- Course notifications

Design:
- Error handling with graceful fallbacks
- Idempotency keys for duplicate prevention
- Category-based notification preferences support
- Ready for WebSocket/Django Channels extension

Usage:
    from notifications.helpers import notify_leaderboard_rank_change
    
    notify_leaderboard_rank_change(
        user_id=user_id,
        old_rank=5,
        new_rank=3,
        category='creators'
    )
"""

import logging
import uuid
from typing import Optional, Dict, Any, List
from decimal import Decimal
from django.core.mail import send_mail

from django.conf import settings

logger = logging.getLogger(__name__)

# Flag to check if notifications app is available
NOTIFICATIONS_AVAILABLE = True


def notify_user_event(
    user_id,
    event_type: str,
    title: str,
    message: str,
    category: str,
    entity_type: str = '',
    entity_id=None,
    payload: Optional[Dict[str, Any]] = None,
    priority: str = 'normal',
    email: bool = False,
    idempotency_key: Optional[str] = None,
) -> Optional[uuid.UUID]:
    """Create one idempotent in-app event and optionally email its recipient."""
    if not _check_availability():
        return None
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category=category,
            entity_type=entity_type,
            entity_id=entity_id if isinstance(entity_id, uuid.UUID) else None,
            payload=payload or {},
            priority=priority,
            idempotency_key=idempotency_key or f'{event_type}:{entity_type}:{entity_id}:{user_id}',
        )
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        if email and notification:
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.filter(pk=user_id).only('email').first()
            if user and user.email:
                send_mail(title, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        return event.id if notification else None
    except Exception as exc:
        logger.error('Failed to send notification %s: %s', event_type, exc)
        return None


def notify_users_event(user_ids, **kwargs) -> Optional[uuid.UUID]:
    """Create one event and fan it out to multiple recipients."""
    if not _check_availability() or not user_ids:
        return None
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    try:
        event = dispatcher.create_event(
            idempotency_key=kwargs.pop('idempotency_key', None),
            **kwargs,
        )
        dispatcher.dispatch_to_users(event, list(user_ids))
        return event.id
    except Exception as exc:
        logger.error('Failed to fan out notification: %s', exc)
        return None


def notify_admins_event(**kwargs) -> Optional[uuid.UUID]:
    """Send an in-app notification to every active staff administrator."""
    from django.contrib.auth import get_user_model

    admin_ids = get_user_model().objects.filter(
        is_active=True,
        is_staff=True,
    ).values_list('id', flat=True)
    return notify_users_event(list(admin_ids), **kwargs)


def _get_dispatcher():
    """Get the notification dispatcher, handling import errors."""
    try:
        from notifications.services.dispatcher import NotificationDispatcher
        return NotificationDispatcher()
    except ImportError as e:
        logger.warning(f"Notifications app not available: {e}")
        global NOTIFICATIONS_AVAILABLE
        NOTIFICATIONS_AVAILABLE = False
        return None


def _check_availability():
    """Check if notifications are available."""
    if not NOTIFICATIONS_AVAILABLE:
        logger.debug("Notifications app is not available")
        return False
    return True


# ==================== LEADERBOARD NOTIFICATIONS ====================

def notify_leaderboard_rank_change(
    user_id: uuid.UUID,
    old_rank: int,
    new_rank: int,
    category: str = 'creators',
    period: str = 'monthly',
) -> Optional[uuid.UUID]:
    """
    Notify user of rank change on leaderboard.
    
    Args:
        user_id: User ID
        old_rank: Previous rank
        new_rank: New rank
        category: Leaderboard category
        period: Time period
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    # Determine change type
    if new_rank < old_rank:
        title = "🎉 Rank Up!"
        message = f"You've moved up from rank #{old_rank} to rank #{new_rank} in the {category} leaderboard!"
        event_type = 'leaderboard.rank_up'
    elif new_rank > old_rank:
        title = "📉 Rank Down"
        message = f"You've moved down from rank #{old_rank} to rank #{new_rank} in the {category} leaderboard."
        event_type = 'leaderboard.rank_down'
    else:
        return None  # No change
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='leaderboard',
            actor_id=None,
            entity_type='leaderboard_entry',
            entity_id=None,
            payload={
                'old_rank': old_rank,
                'new_rank': new_rank,
                'category': category,
                'period': period,
            },
            priority='normal',
            rate_limit_key=f'leaderboard:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send leaderboard rank notification: {e}")
        return None


def notify_leaderboard_top_10(
    user_id: uuid.UUID,
    rank: int,
    category: str = 'creators',
) -> Optional[uuid.UUID]:
    """
    Notify user they made it to top 10.
    
    Args:
        user_id: User ID
        rank: User's rank
        category: Leaderboard category
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "🌟 Top 10 Achievement!"
    message = f"Congratulations! You've reached rank #{rank} in the {category} leaderboard!"
    event_type = 'leaderboard.top_10'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='leaderboard',
            actor_id=None,
            entity_type='leaderboard_entry',
            payload={
                'rank': rank,
                'category': category,
            },
            priority='high',
            rate_limit_key=f'leaderboard_top10:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send top 10 notification: {e}")
        return None


def notify_leaderboard_new_period(
    user_ids: List[uuid.UUID],
    category: str,
    period: str,
) -> int:
    """
    Notify users about new leaderboard period.
    
    Args:
        user_ids: List of user IDs
        category: Leaderboard category
        period: Time period
    
    Returns:
        Number of notifications sent
    """
    if not _check_availability():
        return 0
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return 0
    
    title = "🏆 New Leaderboard Period"
    message = f"A new {period} {category} leaderboard period has begun! Start climbing the ranks!"
    event_type = 'leaderboard.new_period'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='leaderboard',
            actor_id=None,
            entity_type='leaderboard',
            payload={
                'category': category,
                'period': period,
            },
            priority='normal',
        )
        
        notifications = dispatcher.dispatch_to_users(event, user_ids)
        return len(notifications)
        
    except Exception as e:
        logger.error(f"Failed to send new period notification: {e}")
        return 0


# ==================== EARNINGS NOTIFICATIONS ====================

def notify_earnings_payment_processed(
    user_id: uuid.UUID,
    amount: Decimal,
    method: str,
    transaction_id: str,
) -> Optional[uuid.UUID]:
    """
    Notify user of payment/payout processed.
    
    Args:
        user_id: User ID
        amount: Payment amount
        method: Payment method (upi, bank_transfer, paypal)
        transaction_id: Transaction reference
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "💰 Payment Processed"
    message = f"Your payment of ${amount} via {method} has been processed. Transaction: {transaction_id}"
    event_type = 'earnings.payment_processed'
    
    try:
        try:
            entity_id = uuid.UUID(str(transaction_id)) if transaction_id else None
        except (TypeError, ValueError, AttributeError):
            entity_id = None

        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='earnings',
            actor_id=None,
            entity_type='payment',
            entity_id=entity_id,
            payload={
                'amount': str(amount),
                'method': method,
                'transaction_id': transaction_id,
            },
            priority='high',
            rate_limit_key=f'earnings:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send payment notification: {e}")
        return None


def notify_earnings_milestone(
    user_id: uuid.UUID,
    milestone_type: str,
    current_amount: Decimal,
) -> Optional[uuid.UUID]:
    """
    Notify user of earnings milestone.
    
    Args:
        user_id: User ID
        milestone_type: Type of milestone (e.g., '1000', 'first_payout')
        current_amount: Current earnings amount
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    milestones = {
        '100': ('💵 First $100', 'You\'ve earned your first $100!'),
        '500': ('💵 $500 Earned', 'You\'ve reached $500 in earnings!'),
        '1000': ('💵 $1,000 Club', 'Congratulations on earning $1,000!'),
        '5000': ('💵 $5,000 Milestone', 'You\'ve earned $5,000! Amazing work!'),
        '10000': ('💵 $10,000 Champion', 'You\'ve reached $10,000 in total earnings!'),
        'first_payout': ('🎉 First Payout', 'Your first payout has been processed!'),
    }
    
    title, default_message = milestones.get(milestone_type, (f'💵 Milestone Reached', f'You\'ve reached a new earnings milestone!'))
    message = default_message
    
    event_type = f'earnings.milestone.{milestone_type}'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='earnings',
            actor_id=None,
            entity_type='earnings',
            payload={
                'milestone_type': milestone_type,
                'current_amount': str(current_amount),
            },
            priority='high',
            rate_limit_key=f'earnings_milestone:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send milestone notification: {e}")
        return None


def notify_earnings_payout_status(
    user_id: uuid.UUID,
    amount: Decimal,
    status: str,
    payout_id: uuid.UUID,
) -> Optional[uuid.UUID]:
    """
    Notify user of payout status change.
    
    Args:
        user_id: User ID
        amount: Payout amount
        status: Status (pending, processing, completed, failed)
        payout_id: Payout ID
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    status_messages = {
        'pending': ('⏳ Payout Pending', f'Your payout of ${amount} is pending.'),
        'processing': ('🔄 Payout Processing', f'Your payout of ${amount} is being processed.'),
        'completed': ('✅ Payout Complete', f'Your payout of ${amount} has been completed.'),
        'failed': ('❌ Payout Failed', f'Your payout of ${amount} failed. Please contact support.'),
    }
    
    title, message = status_messages.get(status, ('💰 Payout Update', f'Payout update: {status}'))
    event_type = f'earnings.payout_{status}'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='earnings',
            actor_id=None,
            entity_type='payout',
            entity_id=payout_id,
            payload={
                'amount': str(amount),
                'status': status,
            },
            priority='high' if status == 'failed' else 'normal',
            rate_limit_key=f'earnings_payout:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send payout status notification: {e}")
        return None


# ==================== REFERRAL NOTIFICATIONS ====================

def notify_referral_signup(
    user_id: uuid.UUID,
    referee_id: uuid.UUID,
    referee_name: str,
) -> Optional[uuid.UUID]:
    """
    Notify user that their referral signed up.
    
    Args:
        user_id: Referring user ID
        referee_id: New user ID
        referee_name: Name of new user
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "🎁 New Referral!"
    message = f"{referee_name} has joined using your referral link!"
    event_type = 'referral.signup'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='referral',
            actor_id=referee_id,
            entity_type='referral',
            entity_id=referee_id,
            payload={
                'referee_id': str(referee_id),
                'referee_name': referee_name,
            },
            priority='normal',
            rate_limit_key=f'referral:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send referral signup notification: {e}")
        return None


def notify_referral_reward(
    user_id: uuid.UUID,
    amount: Decimal,
    reason: str,
) -> Optional[uuid.UUID]:
    """
    Notify user of referral reward earned.
    
    Args:
        user_id: User ID
        amount: Reward amount
        reason: Reason for reward
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "🎉 Referral Reward!"
    message = f"You've earned ${amount} from your referral ({reason})!"
    event_type = 'referral.reward'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='referral',
            actor_id=None,
            entity_type='referral_reward',
            payload={
                'amount': str(amount),
                'reason': reason,
            },
            priority='high',
            rate_limit_key=f'referral_reward:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send referral reward notification: {e}")
        return None


def notify_referral_milestone(
    user_id: uuid.UUID,
    referral_count: int,
    next_milestone: Optional[int] = None,
) -> Optional[uuid.UUID]:
    """
    Notify user of referral milestone.
    
    Args:
        user_id: User ID
        referral_count: Number of successful referrals
        next_milestone: Next milestone target
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "🌟 Referral Milestone!"
    message = f"Congratulations! You've reached {referral_count} successful referrals!"
    
    if next_milestone:
        message += f" Only {next_milestone - referral_count} more to reach your next reward!"
    
    event_type = 'referral.milestone'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='referral',
            actor_id=None,
            entity_type='referral',
            payload={
                'referral_count': referral_count,
                'next_milestone': next_milestone,
            },
            priority='high',
            rate_limit_key=f'referral_milestone:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send referral milestone notification: {e}")
        return None


# ==================== COMMUNITY NOTIFICATIONS ====================

def notify_community_reply(
    user_id: uuid.UUID,
    author_id: uuid.UUID,
    author_name: str,
    discussion_title: str,
    reply_id: uuid.UUID,
) -> Optional[uuid.UUID]:
    """
    Notify user of reply to their discussion.
    
    Args:
        user_id: Original post author ID
        author_id: Reply author ID
        author_name: Name of reply author
        discussion_title: Title of discussion
        reply_id: Reply ID
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "💬 New Reply"
    message = f"{author_name} replied to your discussion: {discussion_title}"
    event_type = 'community.reply'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='community',
            actor_id=author_id,
            entity_type='reply',
            entity_id=reply_id,
            payload={
                'discussion_title': discussion_title,
                'author_name': author_name,
            },
            priority='normal',
            rate_limit_key=f'community:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send community reply notification: {e}")
        return None


def notify_community_featured(
    user_id: uuid.UUID,
    content_type: str,
    title: str,
) -> Optional[uuid.UUID]:
    """
    Notify user their content was featured.
    
    Args:
        user_id: User ID
        content_type: Type of content (discussion, post, etc.)
        title: Content title
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title_notif = "⭐ Featured Content!"
    message = f"Your {content_type} \"{title}\" has been featured in the community!"
    event_type = 'community.featured'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title_notif,
            message=message,
            category='community',
            actor_id=None,
            entity_type='featured_content',
            payload={
                'content_type': content_type,
                'title': title,
            },
            priority='high',
            rate_limit_key=f'community_featured:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send featured notification: {e}")
        return None


def notify_community_event(
    user_ids: List[uuid.UUID],
    event_title: str,
    event_description: str,
    event_date: str,
) -> int:
    """
    Notify users of community event.
    
    Args:
        user_ids: List of user IDs
        event_title: Event title
        event_description: Event description
        event_date: Event date/time
    
    Returns:
        Number of notifications sent
    """
    if not _check_availability():
        return 0
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return 0
    
    title = "📅 Community Event"
    message = f"{event_title}: {event_description} on {event_date}"
    event_type = 'community.event'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='community',
            actor_id=None,
            entity_type='community_event',
            payload={
                'event_title': event_title,
                'event_description': event_description,
                'event_date': event_date,
            },
            priority='normal',
        )
        
        notifications = dispatcher.dispatch_to_users(event, user_ids)
        return len(notifications)
        
    except Exception as e:
        logger.error(f"Failed to send community event notification: {e}")
        return 0


# ==================== CONTENT NOTIFICATIONS ====================

def notify_content_clipped(
    user_id: uuid.UUID,
    clipper_id: uuid.UUID,
    clipper_name: str,
    content_id: uuid.UUID,
    content_title: str,
) -> Optional[uuid.UUID]:
    """
    Notify creator their content was clipped.
    
    Args:
        user_id: Content creator ID
        clipper_id: Clipper ID
        clipper_name: Clipper name
        content_id: Content ID
        content_title: Content title
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "✂️ Content Clipped"
    message = f"{clipper_name} clipped your content: {content_title}"
    event_type = 'content.clipped'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='content',
            actor_id=clipper_id,
            entity_type='content',
            entity_id=content_id,
            payload={
                'clipper_name': clipper_name,
                'content_title': content_title,
            },
            priority='normal',
            rate_limit_key=f'content:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send content clipped notification: {e}")
        return None


def notify_content_engagement(
    user_id: uuid.UUID,
    content_id: uuid.UUID,
    content_title: str,
    engagement_type: str,
    count: int,
) -> Optional[uuid.UUID]:
    """
    Notify user of content engagement milestone.
    
    Args:
        user_id: User ID
        content_id: Content ID
        content_title: Content title
        engagement_type: Type (views, likes, shares)
        count: Engagement count
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = f"🔥 {engagement_type.title()} Milestone!"
    message = f"Your content \"{content_title}\" has reached {count} {engagement_type}!"
    event_type = f'content.engagement_{engagement_type}'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='content',
            actor_id=None,
            entity_type='content',
            entity_id=content_id,
            payload={
                'engagement_type': engagement_type,
                'count': count,
                'content_title': content_title,
            },
            priority='normal',
            rate_limit_key=f'content_engagement:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send engagement notification: {e}")
        return None


def notify_content_viral(
    user_id: uuid.UUID,
    content_id: uuid.UUID,
    content_title: str,
    views: int,
) -> Optional[uuid.UUID]:
    """
    Notify user their content went viral.
    
    Args:
        user_id: User ID
        content_id: Content ID
        content_title: Content title
        views: View count
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "🚀 Going Viral!"
    message = f"Your content \"{content_title}\" is going viral with {views:,} views!"
    event_type = 'content.viral'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='content',
            actor_id=None,
            entity_type='content',
            entity_id=content_id,
            payload={
                'views': views,
                'content_title': content_title,
            },
            priority='high',
            rate_limit_key=f'content_viral:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send viral notification: {e}")
        return None


# ==================== COURSES NOTIFICATIONS ====================

def notify_course_enrollment(
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    course_title: str,
    instructor_name: str,
) -> Optional[uuid.UUID]:
    """
    Notify user of course enrollment confirmation.
    
    Args:
        user_id: User ID
        course_id: Course ID
        course_title: Course title
        instructor_name: Instructor name
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "📚 Enrolled in Course"
    message = f"You're enrolled in \"{course_title}\" by {instructor_name}. Start learning now!"
    event_type = 'course.enrollment'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='course',
            actor_id=None,
            entity_type='course',
            entity_id=course_id,
            payload={
                'course_title': course_title,
                'instructor_name': instructor_name,
            },
            priority='normal',
            rate_limit_key=f'course:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send course enrollment notification: {e}")
        return None


def notify_course_completion(
    user_id: uuid.UUID,
    course_id: uuid.UUID,
    course_title: str,
    certificate_id: Optional[str] = None,
) -> Optional[uuid.UUID]:
    """
    Notify user of course completion.
    
    Args:
        user_id: User ID
        course_id: Course ID
        course_title: Course title
        certificate_id: Optional certificate ID
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "🎓 Course Completed!"
    message = f"Congratulations! You've completed \"{course_title}\"!"
    
    if certificate_id:
        message += " Your certificate is ready to download."
    
    event_type = 'course.completion'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='course',
            actor_id=None,
            entity_type='course_completion',
            entity_id=course_id,
            payload={
                'course_title': course_title,
                'certificate_id': certificate_id,
            },
            priority='high',
            rate_limit_key=f'course_completion:{user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send course completion notification: {e}")
        return None


def notify_course_new(
    user_ids: List[uuid.UUID],
    course_id: uuid.UUID,
    course_title: str,
    instructor_name: str,
) -> int:
    """
    Notify users of new course available.
    
    Args:
        user_ids: List of user IDs
        course_id: Course ID
        course_title: Course title
        instructor_name: Instructor name
    
    Returns:
        Number of notifications sent
    """
    if not _check_availability():
        return 0
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return 0
    
    title = "✨ New Course Available"
    message = f"New course alert: \"{course_title}\" by {instructor_name}"
    event_type = 'course.new'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='course',
            actor_id=None,
            entity_type='course',
            entity_id=course_id,
            payload={
                'course_title': course_title,
                'instructor_name': instructor_name,
            },
            priority='normal',
        )
        
        notifications = dispatcher.dispatch_to_users(event, user_ids)
        return len(notifications)
        
    except Exception as e:
        logger.error(f"Failed to send new course notification: {e}")
        return 0


# ==================== SYSTEM NOTIFICATIONS ====================

def notify_system_announcement(
    user_ids: List[uuid.UUID],
    title: str,
    message: str,
    priority: str = 'normal',
) -> int:
    """
    Send system announcement to users.
    
    Args:
        user_ids: List of user IDs
        title: Announcement title
        message: Announcement message
        priority: Priority level
    
    Returns:
        Number of notifications sent
    """
    if not _check_availability():
        return 0
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return 0
    
    try:
        event = dispatcher.create_event(
            event_type='system.announcement',
            title=title,
            message=message,
            category='system',
            actor_id=None,
            entity_type='announcement',
            payload={},
            priority=priority,
        )
        
        notifications = dispatcher.dispatch_to_users(event, user_ids)
        return len(notifications)
        
    except Exception as e:
        logger.error(f"Failed to send system announcement: {e}")
        return 0


def notify_user_mention(
    mentioned_user_id: uuid.UUID,
    mentioning_user_id: uuid.UUID,
    mentioning_user_name: str,
    context: str,
    entity_type: str,
    entity_id: uuid.UUID,
) -> Optional[uuid.UUID]:
    """
    Notify user they were mentioned.
    
    Args:
        mentioned_user_id: User being mentioned
        mentioning_user_id: User who mentioned
        mentioning_user_name: Name of mentioning user
        context: Text where mention occurred
        entity_type: Type of entity (post, comment, etc.)
        entity_id: ID of entity
    
    Returns:
        Event ID if successful, None otherwise
    """
    if not _check_availability():
        return None
    
    dispatcher = _get_dispatcher()
    if not dispatcher:
        return None
    
    title = "👋 You were mentioned"
    message = f"{mentioning_user_name} mentioned you: \"{context[:100]}...\""
    event_type = 'system.mention'
    
    try:
        event = dispatcher.create_event(
            event_type=event_type,
            title=title,
            message=message,
            category='system',
            actor_id=mentioning_user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            payload={
                'mentioning_user_name': mentioning_user_name,
                'context': context,
            },
            priority='normal',
            rate_limit_key=f'mention:{mentioned_user_id}',
        )
        
        notification = dispatcher.dispatch_to_single_user(event, mentioned_user_id)
        return event.id if notification else None
        
    except Exception as e:
        logger.error(f"Failed to send mention notification: {e}")
        return None


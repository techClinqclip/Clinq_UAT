# Notifications App Integration Plan

## Overview
The notifications app needs to be integrated with other apps to provide timely notifications to users about important events across the platform.

## Integration Checklist

### 1. Leaderboard App Integration
- [x] Import notifications module in leaderboard views
- [x] Create helper function for leaderboard notifications
- [x] Add notification triggers when user rankings change
- [x] Add notification triggers when user enters top 10
- [x] Add notification triggers for new leaderboard periods
- [ ] Add tests for leaderboard notifications

### 2. Earnings App Integration
- [x] Import notifications module in earnings views
- [x] Create helper function for earnings notifications
- [x] Add notification triggers when payments are processed
- [x] Add notification triggers for earnings milestones
- [x] Add notification triggers for payout status changes
- [ ] Add tests for earnings notifications

### 3. Referral App Integration
- [x] Import notifications module in referral views
- [x] Create helper function for referral notifications
- [x] Add notification triggers when referrals sign up
- [x] Add notification triggers for referral rewards
- [x] Add notification triggers for referral milestones
- [ ] Add tests for referral notifications

### 4. Community App Integration
- [x] Import notifications module in community views
- [x] Create helper function for community notifications
- [x] Add notification triggers for replies to user posts
- [x] Add notification triggers for featured posts
- [x] Add notification triggers for community events
- [ ] Add tests for community notifications

### 5. Content App Integration
- [x] Import notifications module in content views
- [x] Create helper function for content notifications
- [x] Add notification triggers when content is clipped
- [x] Add notification triggers for views/likes
- [x] Add notification triggers for viral content
- [ ] Add tests for content notifications

### 6. Courses App Integration
- [x] Import notifications module in courses views
- [x] Create helper function for course notifications
- [x] Add notification triggers for course enrollment
- [x] Add notification triggers for course completion
- [x] Add notification triggers for new courses
- [ ] Add tests for course notifications

## Implementation Pattern

Each integration should follow this pattern:

```python
from notifications.domain.events import NotificationEvent
from notifications.services.emitter import NotificationEmitter

def notify_user_event(user_id: str, event_type: str, payload: dict, entity_type: str, entity_id: str = None, actor_id: str = None):
    """Helper function to send notifications"""
    event = NotificationEvent(
        event_type=event_type,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        payload=payload,
        idempotency_key=f"{event_type}_{user_id}_{entity_id}"
    )
    NotificationEmitter.emit(event, [user_id])
```

## Event Types

### Leaderboard Events
- `leaderboard_rank_change` - User's rank changed
- `leaderboard_top_10` - User entered top 10
- `leaderboard_new_period` - New leaderboard period started

### Earnings Events
- `earnings_payment_processed` - Payment was processed
- `earnings_milestone` - Earnings milestone reached
- `earnings_payout_status` - Payout status changed

### Referral Events
- `referral_signup` - Referred user signed up
- `referral_reward` - Referral reward granted
- `referral_milestone` - Referral milestone reached

### Community Events
- `community_reply` - Someone replied to user's post
- `community_featured` - User's post was featured
- `community_event` - Community event started

### Content Events
- `content_clipped` - Content was clipped
- `content_engagement` - Content got views/likes
- `content_viral` - Content went viral

### Course Events
- `course_enrollment` - User enrolled in course
- `course_completion` - User completed course
- `course_new` - New course available

## Priority
1. Leaderboard (High user engagement)
2. Earnings (High user value)
3. Referral (User acquisition)
4. Community (User engagement)
5. Content (Core feature)
6. Courses (User education)

## Notes
- All integrations should include proper error handling
- Idempotency keys should be unique per event
- Notifications should respect user preferences
- Consider adding notification batching for high-volume events


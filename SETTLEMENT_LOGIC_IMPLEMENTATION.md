# Settlement Logic Implementation - Brand Campaigns & Creator Gigs

## Overview
Settlement logic has been unified for both brand campaigns and creator gigs using the shared `Campaign` model. When a campaign/gig closes due to **deadline** (with remaining budget), the owner must settle the remaining funds by either:
1. Extending the deadline to continue the campaign
2. Transferring remaining funds back to their wallet

## Key Principles

### When Settlement is Required
Settlement is ONLY required when:
- Campaign/gig status is `closed`
- Closure reason is `deadline` (NOT `budget`)
- Remaining budget exists (budget > paid_out)
- Remaining funds have NOT been settled (remaining_funds_settled = False)

### When Settlement is NOT Required
- If budget is exhausted (closure_reason = `budget`), no settlement is needed
- If remaining funds have already been settled (remaining_funds_settled = True), no further settlement is needed
- If there is no remaining budget, no settlement is needed

## Implementation Details

### Backend Changes

#### 1. **CampaignSerializer.get_needsRemainingSettlement()** 
[backend/content/serializers.py - Line 252-263]

```python
def get_needsRemainingSettlement(self, obj):
    """Settlement is required only when:
    1. Campaign/gig is closed due to deadline (not budget exhaustion)
    2. Remaining funds have not been settled
    3. There is remaining budget to settle
    """
    return (
        obj.status == 'closed' 
        and obj.closure_reason == 'deadline'  # Only for deadline closures, not budget exhaustion
        and not obj.remaining_funds_settled 
        and self.get_remainingBudget(obj) > 0
    )
```

#### 2. **CampaignViewSet.extend_deadline()** 
[backend/content/views.py - Line 180-219]

Validates that:
- Campaign is closed (status == 'closed')
- Closure reason is 'deadline' (not 'budget')
- Remaining funds not already settled
- Remaining budget > 0
- New deadline is in the future

If valid, reopens campaign with new deadline.

#### 3. **CampaignViewSet.transfer_remaining_funds()** 
[backend/content/views.py - Line 221-251]

Validates that:
- Campaign is closed (status == 'closed')
- Closure reason is 'deadline' (not 'budget')
- Remaining funds not already settled
- Remaining budget > 0

If valid, transfers remaining funds to creator's wallet and marks as settled.

### Frontend Changes

#### 1. **CampaignDetails.jsx**
[frontend/src/pages/Brand/CampaignDetails.jsx - Line 360-367]

Updated settlement computation to check closure_reason:
```javascript
const needsRemainingSettlement = Boolean(
  currentCampaign.needsRemainingSettlement ??
    (String(currentCampaign.status || "").toLowerCase() === "closed" &&
      remainingBudget > 0 &&
      !hasSettledRemainingFunds &&
      (closureReason === 'deadline'))  // Only for deadline closures
);
```

#### 2. **Campaigns.jsx**
[frontend/src/pages/Brand/Campaigns.jsx - Line 102-109]

Updated settlement computation to check closure_reason.

#### 3. **CreatorGigDetails.jsx**
[frontend/src/pages/Creator/CreatorGigDetails.jsx - Line 216-220]

Updated settlement computation for creator gigs to check closure_reason.

#### 4. **CreatorGigs.jsx**
[frontend/src/pages/Creator/CreatorGigs.jsx - Line 71-73]

Updated settlement computation for creator gig list view.

## Test Results

All validation tests pass:

✓ Budget-exhausted campaigns/gigs cannot request settlement
✓ Deadline-closed campaigns/gigs WITH remaining budget can request settlement
✓ Already-settled campaigns/gigs cannot request more settlement
✓ Both brand campaigns and creator gigs follow the same logic
✓ Settlement options only appear for deadline closures with remaining budget

## API Behavior

### Extend Deadline
- **Endpoint**: `POST /api/content/campaigns/{id}/extend-deadline/`
- **Requirements**: Must be closed due to deadline with remaining budget
- **Action**: Reopens campaign as 'active' with new deadline
- **Error**: Returns 400 if closed due to budget exhaustion

### Transfer Remaining Funds
- **Endpoint**: `POST /api/content/campaigns/{id}/transfer-remaining-funds/`
- **Requirements**: Must be closed due to deadline with remaining budget
- **Action**: Transfers remaining budget to creator wallet and marks as settled
- **Error**: Returns 400 if closed due to budget exhaustion

## Summary

Both brand campaigns and creator gigs now support:
1. Automatic closure when deadline is reached (with settlement required if budget remains)
2. Automatic closure when budget is exhausted (no settlement required)
3. Clear settlement options: extend deadline OR transfer funds
4. Prevention of resettlement once funds are transferred
5. Unified UI and API behavior across both campaign types

The implementation ensures that:
- Owners of deadline-closed events must actively settle remaining funds
- Budget-exhausted events require no action (auto-closed permanently)
- Once settled, events cannot be reopened or modified
- Both brand and creator workflows follow identical logic

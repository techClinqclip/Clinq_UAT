# Campaign/Gig Submission & Cooling Period Implementation Guide

## Overview
This document describes the complete implementation of the campaign/gig submission workflow with 24-hour cooling period logic and submission state management (pending, approved, rejected).

## Key Features Implemented

### 1. Submit Clip Dialog - `SubmitClipDialog.jsx`
**Location:** `frontend/src/pages/Creator/SubmitClipDialog.jsx`

#### Features:
- **Campaign Name Display**: Shows the campaign/gig name at the top of the form
- **Allowed Platforms Filter**: Only shows platforms allowed by the campaign
- **Cooling Period Alert**: 
  - Shows when user is in 24-hour cooldown after a submission
  - Displays hours remaining until next submission is allowed
  - Shows status of last submission (pending/approved)
  - Provides tips:
    - **Pending submissions**: Can be deleted to reset cooling period
    - **Approved submissions**: Cannot be deleted, cooling period must be served

#### Implementation Details:
```javascript
// Loads submission info including:
- campaignName: The name of the campaign/gig
- allowedPlatforms: List of allowed platforms for submission
- cooldown: Object with:
  - is_in_cooldown: Boolean
  - cooldown_ends_at: ISO timestamp
  - hours_remaining: Number of hours until submission allowed
  - last_submission_status: "pending" or "approved"
```

#### Platform Validation:
- Frontend filters platforms based on campaign configuration
- Only shows platforms allowed by the campaign creator
- URL validation ensures the post URL matches the selected platform

#### Cooling Period Logic:
- **Applies to All Submissions**: 24-hour period starts from submission creation, not approval
- **Deletion Behavior**:
  - Pending submissions: Can be deleted to immediately resubmit
  - Approved submissions: Cannot be deleted (prevents circumventing cooling period)

### 2. Clipper Gig Details - `ClipperGigDetails.jsx`
**Location:** `frontend/src/pages/clipper/ClipperGigDetails.jsx`

#### Features:
- **Submissions Table**: Displays all submissions for the campaign with:
  - Campaign name
  - Platform and username
  - Submission views
  - Status (Pending/Approved/Rejected)
  - Earned/Pending Payout
  - Action buttons (View Post, Delete)

#### Delete Submission Logic:
```javascript
// Status-based deletion rules:
- Pending: Allowed - shows confirmation modal
  - Message: "You can submit a new clip immediately after deletion"
  - Cooling period resets upon deletion
  
- Approved: Blocked
  - Delete button is disabled (opacity 50%, cursor-not-allowed)
  - Tooltip: "Cannot delete approved submissions - cooling period must be served"
  - Modal explanation: Approved submissions must stay to maintain cooling period integrity
  - Shows that cooling period must complete before next submission
  
- Rejected: Allowed - shows confirmation modal
```

#### Status Display:
- **Approved**: Green badge with solid status indicator
- **Pending**: Yellow badge with solid status indicator  
- **Rejected**: Red badge with solid status indicator

### 3. Backend Submission Management - `content/views.py`

#### CampaignSubmission Model States:
```python
STATUS_CHOICES = [
    ("pending", "Pending"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
]
```

#### Cooling Period Implementation - `CampaignParticipant.get_cooldown_info()`
```python
def get_cooldown_info(self):
    """Return cooldown status and time remaining."""
    # Gets the most recent submission (any status)
    last_submission = self.get_last_submission()
    
    # 24-hour cooldown from submission creation time
    cooldown_hours = 24
    time_since_submission = timezone.now() - last_submission.created_at
    is_in_cooldown = time_since_submission < timedelta(hours=cooldown_hours)
    
    if is_in_cooldown:
        cooldown_end = last_submission.created_at + timedelta(hours=cooldown_hours)
        hours_remaining = (cooldown_end - timezone.now()).total_seconds() / 3600
        
        return {
            'is_in_cooldown': True,
            'cooldown_ends_at': cooldown_end.isoformat(),
            'hours_remaining': max(0, hours_remaining),
            'last_submission_status': last_submission.status,
        }
    
    return {
        'is_in_cooldown': False,
        'cooldown_ends_at': None,
        'hours_remaining': 0,
    }
```

#### Submit Clip Endpoint - `submit-clip/`
**Method**: POST  
**Path**: `/api/content/campaigns/{id}/submit-clip/`

**Validation Order**:
1. User must be a campaign participant (joined first)
2. Platform must be valid and allowed for campaign
3. Cooling period must not be active
4. Username and URL must be provided
5. URL must be valid
6. Cannot submit same URL twice

**Response**:
```javascript
{
    "status": "success",
    "message": "Clip submitted successfully.",
    "submission": {
        "id": submission.id,
        "campaign": campaign.name,  // Campaign/Gig name
        "platform": submission.get_platform_display(),
        "platformUsername": submission.platform_username,
        "contentUrl": submission.content_url,
        "status": "Pending",
        "views": 0,
        "earning": 0,
        "pendingEarning": 0,
    }
}
```

#### Delete Submission Endpoint
**Method**: DELETE  
**Path**: `/api/content/clipper-submissions/{id}/`

**New Validation** (Updated):
```python
def destroy(self, request, pk=None, *args, **kwargs):
    submission = get_object_or_404(
        CampaignSubmission.objects.filter(participant__clipper=request.user),
        pk=pk,
    )
    
    # Prevent deletion of approved submissions
    if submission.status == 'approved':
        return Response({
            'status': 'error',
            'error': 'Cannot delete approved submissions. You must wait out the 24-hour cooling period after approval.',
            'canDelete': False,
            'submissionStatus': submission.status,
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Allow deletion of pending or rejected
    submission.delete()
    return Response({
        'status': 'success',
        'message': 'Submission deleted successfully. You can submit a new clip immediately.',
        'canDelete': True,
    }, status=status.HTTP_200_OK)
```

#### Get Submission Info Endpoint
**Method**: GET  
**Path**: `/api/content/campaigns/{id}/submission-info/`

**Response Includes**:
```javascript
{
    "campaignId": campaign.id,
    "campaignName": campaign.name,        // ← Campaign/Gig Name
    "campaignType": campaign.type,        // "campaign" or "gig"
    "allowedPlatforms": ["Instagram", "YouTube"],  // ← Allowed Platforms
    "joined": true,
    "cooldown": {                         // ← Cooling Period Info
        "is_in_cooldown": false,
        "cooldown_ends_at": null,
        "hours_remaining": 0,
        "last_submission_status": "pending"
    }
}
```

## Workflow Diagram

### First-Time Submission
```
1. User clicks "Submit Clip"
   ↓
2. Dialog opens, loads campaign info
   - Shows campaign name
   - Shows allowed platforms
   - No cooling period (first submission)
   ↓
3. User selects platform, enters username & URL
   ↓
4. Submit - Creates submission with status="pending"
   ↓
5. Cooling period starts (24 hours from submission time)
```

### Pending Submission - User Wants to Replace
```
1. User sees pending submission in table
   ↓
2. User clicks Delete button (enabled for pending)
   ↓
3. Confirmation modal shows:
   "You can submit a new clip immediately after deletion"
   ↓
4. User confirms delete
   ↓
5. Submission deleted
   - Cooling period RESETS
   - User can submit immediately
   ↓
6. User submits new clip
   - New cooling period starts
```

### Approved Submission - User Wants to Replace
```
1. User sees approved submission in table
   - Delete button is DISABLED (opacity 50%)
   - Tooltip: "Cannot delete approved submissions..."
   ↓
2. User tries to click delete or waits
   ↓
3. Cooling period is 24 hours from original submission time
   ↓
4. After cooling period expires:
   - User can submit new clip
   - Old approved submission remains (not deleted)
   ↓
5. User submits new clip
   - New cooling period starts
```

### Cooling Period States - Visual Indicators

#### In Cooling Period (Is In Cooldown = true)
```
Alert Box: Yellow background
├─ Icon: AlertCircle (yellow)
├─ Title: "Cooling Period Active"
└─ Message: "Your last submission (Pending/Approved) is still in cooling period.
   You can submit again in X hours.
   
   [Status-based tip]:
   - If Pending: "💡 Tip: If you want to replace your pending submission, 
                 you can delete it and resubmit immediately."
   - If Approved: "ℹ️ Note: Approved submissions cannot be deleted. 
                  The cooling period must be served."
```

#### Not In Cooling Period
```
Info Box: Blue background
├─ Icon: AlertCircle (blue)
├─ Title: "About 24-Hour Cooling Period"
└─ Rules:
   • After each submission, wait 24 hours before submitting next clip
   • This cooling period applies whether submission is pending or approved
   • If submission is pending and you delete it, cooling period resets
   • If submission is approved, it cannot be deleted and cooling must be served
```

## Database Constraints

### CampaignSubmission Model
```python
class CampaignSubmission(models.Model):
    participant = ForeignKey(CampaignParticipant, on_delete=CASCADE)
    platform = CharField()          # instagram, youtube, facebook, x
    platform_username = CharField()
    content_url = URLField()
    earning = DecimalField()
    pending_earning = DecimalField()
    status = CharField()            # pending, approved, rejected
    created_at = DateTimeField(auto_now_add=True)  # Used for cooling period
    updated_at = DateTimeField(auto_now=True)      # Used only for display
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["participant", "status"]),
        ]
```

### Important: Cooling Period Timer
- **Start Time**: `submission.created_at` (immutable)
- **Duration**: 24 hours (COOLING_HOURS = 24)
- **Applies To**: ALL submissions (pending, approved, rejected)
- **Resets When**: Submission in "pending" status is deleted

## Key Implementation Points

### 1. Campaign Name Display ✅
- Shown in SubmitClipDialog
- Fetched from `submission_info/` endpoint
- Backend: `campaign.name` field

### 2. Platform Filtering ✅
- `campaign.platforms` is JSONField (list of platform strings)
- Frontend filters `allPlatforms` array based on `campaign.platforms`
- Backend validates platform against `campaign.platforms` on submit

### 3. Cooling Period - Always Active ✅
- Applies from submission creation (not approval)
- Based on `submission.created_at`
- Checks against most recent submission: `participant.get_last_submission()`
- Cooldown includes pending, approved, and rejected submissions

### 4. Deletion Restrictions ✅
- **Pending**: Allowed, resets cooling period
- **Approved**: Blocked (403 Forbidden)
- **Rejected**: Allowed (same as pending)

### 5. User Experience ✅
- Disabled button with tooltip for approved submissions
- Modal explains "cannot delete" reason for approved
- Modal explains "can resubmit immediately" for pending
- Clear cooling period countdown
- Tips about pending vs approved behavior

### 6. Status Transitions ✅
- Admin approves pending → submission.status = "approved"
- Cooling period STILL APPLIES after approval
- User cannot circumvent cooling period by deleting approved submission
- Maintains platform submission history integrity

## Testing Checklist

- [ ] Submit clip while not in cooldown
- [ ] See cooling period active after submission
- [ ] Try to submit while in cooldown (blocked)
- [ ] Delete pending submission and resubmit immediately
- [ ] See approved submission in table
- [ ] Try to delete approved submission (blocked)
- [ ] See delete button disabled for approved with tooltip
- [ ] See modal explaining cannot delete approved
- [ ] See modal explaining can delete pending
- [ ] Verify platform filtering works correctly
- [ ] Verify campaign name displays correctly
- [ ] Test with different submission statuses

## API Endpoints Used

1. **GET** `/api/content/campaigns/{id}/submission-info/`
   - Gets campaign info, allowed platforms, cooling period status

2. **POST** `/api/content/campaigns/{id}/submit-clip/`
   - Submits a new clip, validates platform and cooling period

3. **DELETE** `/api/content/clipper-submissions/{id}/`
   - Deletes submission (blocked for approved)

4. **GET** `/api/content/clipper-submissions/`
   - Lists all submissions for authenticated user

## Files Modified

1. **Backend**:
   - `backend/content/views.py` - Updated `ClipperSubmissionsViewSet.destroy()`

2. **Frontend**:
   - `frontend/src/pages/Creator/SubmitClipDialog.jsx` - Enhanced cooling period info
   - `frontend/src/pages/clipper/ClipperGigDetails.jsx` - Updated delete logic and modal

## Error Handling

### Submission Errors
```
- Missing platform: "Invalid platform 'empty'. Must be one of: ..."
- Platform not allowed: "Platform 'X' is not allowed for this campaign."
- In cooldown: "You must wait before submitting your next clip. 
              Cooling period active for X hours."
- Not a participant: "You must join this campaign before submitting a clip."
- Duplicate URL: "This clip has already been submitted for this campaign."
```

### Deletion Errors
```
- Approved submission: "Cannot delete approved submissions. 
                      You must wait out the 24-hour cooling period after approval."
- Not authorized: "You don't have permission to delete this submission."
- Not found: "Submission not found."
```

## Future Enhancements

1. **Submission History**: Show previous submissions and their statuses
2. **Bulk Upload**: Allow uploading multiple submissions at once
3. **Submission Templates**: Save common submission details
4. **Performance Metrics**: Show views/engagement trends per submission
5. **Resubmit Button**: Quick button to resubmit similar content after cooling
6. **Submission Drafts**: Save submission details without publishing

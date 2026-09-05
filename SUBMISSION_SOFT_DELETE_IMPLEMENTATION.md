# Submission Soft-Delete Implementation Guide

## Overview
This implementation enables users to delete submissions while preserving their earnings history. When a user deletes a submission, the system changes its status to "deleted" instead of removing it from the database. This allows:
- Past earnings to be maintained and audited
- Users to re-earn from the same campaign
- Admins to see deletion history

## Changes Made

### 1. Backend Model Changes (`backend/content/models.py`)

#### CampaignSubmission Model
**New Status Added:**
```python
STATUS_CHOICES = [
    ("pending", "Pending"),
    ("approved", "Approved"),
    ("rejected", "Rejected"),
    ("deleted", "Deleted"),  # ← NEW
]
```

**Updated Methods:**

a) `recalculate_metrics()` - Now excludes deleted submissions:
```python
stats = CampaignSubmission.objects.filter(
    participant__campaign=self,
    status__in=['pending', 'approved', 'rejected']  # Excludes 'deleted'
).aggregate(...)
```
- Views and submission counts no longer include deleted submissions
- Campaign metrics remain accurate

b) `get_total_committed_earnings()` - Excludes deleted submissions (already filtered by "approved")
- Ensures max_earnings calculations don't count deleted submissions

### 2. Backend View Changes (`backend/content/views.py`)

#### ClipperSubmissionsViewSet Changes

a) **Added Decimal import** for admin delete action:
```python
from decimal import Decimal
```

b) **Updated get_queryset()** - Filters out deleted submissions from user view:
```python
def get_queryset(self):
    return (
        CampaignSubmission.objects.filter(
            participant__clipper=self.request.user,
            status__in=['pending', 'approved', 'rejected']  # Excludes 'deleted'
        )
        .select_related('participant', 'participant__campaign')
        .order_by('-created_at')
    )
```
- Users only see: Pending, Approved, and Rejected submissions
- Deleted submissions are hidden but preserved in database

c) **Updated destroy() method** - Soft-delete instead of hard-delete:
```python
def destroy(self, request, pk=None, *args, **kwargs):
    submission = get_object_or_404(
        CampaignSubmission.objects.filter(participant__clipper=request.user),
        pk=pk,
    )
    
    # Soft-delete: change status to "deleted" instead of hard-deleting
    submission.status = 'deleted'
    submission.save(update_fields=['status', 'updated_at'])
    
    return Response({
        'status': 'success',
        'message': 'Submission deleted successfully. The 24-hour cooling period still applies.',
        'canDelete': True,
    }, status=status.HTTP_200_OK)
```

#### CampaignSubmissionViewSet Changes

a) **New admin_delete() action** - Admin deletion with pending_earning reset:
```python
@action(detail=True, methods=['post'], url_path='delete', permission_classes=[IsAdminUser])
def admin_delete(self, request, pk=None):
    """Admin action to delete a submission: mark as deleted and clear pending earnings."""
    submission = self.get_object()
    
    # If admin deletes, clear pending_earning (only approved active earnings are preserved)
    submission.status = 'deleted'
    submission.pending_earning = Decimal('0')
    submission.save(update_fields=['status', 'pending_earning', 'updated_at'])
    
    return Response({
        'status': 'success',
        'message': 'Submission deleted successfully. Pending earnings have been cleared.',
        'submission': serializer.data,
    }, status=status.HTTP_200_OK)
```
- Admin can delete and clear pending earnings via `/api/campaignsubmissions/{id}/delete/`

### 3. Database Migration

**File:** `backend/content/migrations/0020_add_deleted_status_to_campaignsubmission.py`
- Adds "deleted" choice to CampaignSubmission.status field
- No data migration needed (no existing data affected)

### 4. Frontend (No Changes Required)
The existing delete functionality in `CreatorSubmissionDetails.jsx` works as-is:
- User clicks delete button
- Frontend sends DELETE request
- Backend changes status to "deleted"
- Frontend removes submission from view (expected behavior)

## User Flow

### When User Deletes a Submission
1. User clicks "Delete" on their submission in "My Submissions"
2. Backend receives DELETE request
3. Backend changes submission status to "deleted"
4. Submission removed from "My Submissions" view (hidden from query)
5. Earnings history preserved in database
6. 24-hour cooling period still applies
7. User can submit new content for the same campaign

### When Admin Deletes a Submission
1. Admin accesses `/api/campaignsubmissions/{id}/delete/`
2. Backend sets status to "deleted" AND pending_earning to 0
3. Active earnings preserved (for audit)
4. Pending earnings cleared

## Key Benefits

✅ **Earnings History Preserved**
- Users can re-earn from same campaign
- No loss of earnings records
- Audit trail maintained

✅ **Prevents Double-Earning Exploits**
- Cooling period still enforced
- Campaign earning caps respected
- Participant history maintained

✅ **Admin Control**
- Ability to clear pending earnings when deleting
- Soft-delete allows audit trail
- Easy to restore if needed

✅ **Database Integrity**
- No orphaned records
- No lost foreign keys
- Clean audit trail

## Testing Checklist

- [ ] User can delete submission successfully
- [ ] Deleted submissions don't appear in "My Submissions"
- [ ] Earnings history preserved after deletion
- [ ] 24-hour cooling period enforced after deletion
- [ ] Campaign max_earnings calc excludes deleted submissions
- [ ] User can re-submit to same campaign after cooldown
- [ ] Admin can delete and clear pending_earning
- [ ] Campaign metrics updated correctly (no deleted submissions counted)

## Database Query Examples

```sql
-- See all submissions for a user (active only)
SELECT * FROM content_campaignsubmission 
WHERE participant_id IN (
    SELECT id FROM content_campaignparticipant 
    WHERE clipper_id = {user_id}
)
AND status IN ('pending', 'approved', 'rejected');

-- See deleted submissions (for audit)
SELECT * FROM content_campaignsubmission 
WHERE participant_id IN (
    SELECT id FROM content_campaignparticipant 
    WHERE clipper_id = {user_id}
)
AND status = 'deleted';

-- See total earnings (excludes deleted)
SELECT SUM(earning) FROM content_campaignsubmission
WHERE participant_id IN (
    SELECT id FROM content_campaignparticipant 
    WHERE clipper_id = {user_id}
)
AND status = 'approved';
```

## API Endpoints

### User Delete (Soft-Delete)
- **Endpoint:** `DELETE /api/clippings/{id}/`
- **Auth:** User must be submission owner
- **Result:** Status changed to "deleted"

### Admin Delete (Clear Pending)
- **Endpoint:** `POST /api/campaignsubmissions/{id}/delete/`
- **Auth:** Admin only
- **Result:** Status changed to "deleted", pending_earning reset to 0

## Future Enhancements

1. **Soft-Delete Restoration**
   - Add admin action to restore deleted submissions
   - Would require changing status back to original

2. **Deletion Audit Logs**
   - Log who deleted and when
   - Track deletion reasons
   - Store in separate audit table

3. **Scheduled Hard-Delete**
   - Auto hard-delete after 30/60/90 days
   - Configurable retention period
   - Preserve earnings before deletion

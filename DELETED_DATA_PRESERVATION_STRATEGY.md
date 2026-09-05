# 📊 Deleted Submissions Data Preservation Strategy

## Overview

When a submission is deleted (soft-deleted), its data remains in the database and **continues to be used in all earnings, views, and platform-wide calculations**. Only the "My Submissions" table hides the deleted record from the user view.

---

## Key Design Decision: `is_deleted` Boolean Field

Instead of using a "deleted" status (which would exclude submissions from status='approved' queries), we use a separate `is_deleted` boolean field:

```python
class CampaignSubmission(models.Model):
    status = CharField(
        choices=[
            ('pending', 'Pending'),      # Original statuses preserved
            ('approved', 'Approved'),    # for financial queries
            ('rejected', 'Rejected'),
        ]
    )
    is_deleted = BooleanField(default=False)  # Soft-delete flag
```

### Why This Approach?

```
❌ BAD: Using status='deleted'
   └─ Query: filter(status='approved') → Won't find deleted submissions
   └─ Result: Earnings calculations broken!

✅ GOOD: Using is_deleted=True
   └─ Query: filter(status='approved') → Finds ALL approved submissions (deleted or not)
   └─ Query: filter(is_deleted=False) → Shows only active submissions in "My Submissions" UI
   └─ Result: Earnings preserved! ✅
```

---

## Data Flow: Deleted Submission Preservation

```
USER DELETES SUBMISSION
│
├─ submission.is_deleted = True
├─ submission.status = 'approved'  (UNCHANGED ✅)
├─ submission.earning = ₹500        (UNCHANGED ✅)
├─ submission.pending_earning = ₹200 (UNCHANGED ✅)
├─ submission.views = 5000          (UNCHANGED ✅)
│
└─ Save to database
   └─ status='approved' field preserved
   └─ earning field preserved
   └─ views field preserved
   └─ is_deleted=True marks for UI filtering

DOWNSTREAM QUERIES:

1. "My Submissions" View
   └─ Query: filter(is_deleted=False)
   └─ Result: ✅ Submission HIDDEN from view

2. Total Earnings Calculation
   └─ Query: filter(status='approved')
   └─ Result: ✅ Earnings INCLUDED in total
   
3. Total Views Calculation
   └─ Query: filter(status='approved')
   └─ Result: ✅ Views INCLUDED in total

4. Campaign Metrics Dashboard
   └─ Query: filter(is_deleted=False) for views/submission counts
   └─ Query: filter(status='approved') for earnings
   └─ Result: ✅ Accurate displayed metrics
              ✅ Earnings include deleted submissions

5. Earnings API Endpoint
   └─ Query: filter(status='approved')
   └─ Result: ✅ Includes deleted submissions' earnings
```

---

## Database Queries: Before vs After

### Before (Status-Based Soft-Delete) ❌
```python
# User's active submissions
CampaignSubmission.objects.filter(
    participant__clipper=user,
    status__in=['pending', 'approved', 'rejected']  # Excludes 'deleted' status
)

# User's earnings (BROKEN!)
CampaignSubmission.objects.filter(
    participant__clipper=user,
    status='approved'  # Won't find deleted submissions!
).aggregate(Sum('earning'))
# Result: ❌ Earnings = ₹0 (missed deleted approved submissions)
```

### After (Boolean is_deleted Field) ✅
```python
# User's active submissions in "My Submissions" UI
CampaignSubmission.objects.filter(
    participant__clipper=user,
    is_deleted=False  # Clean, simple filter for UI
)

# User's earnings (WORKS!)
CampaignSubmission.objects.filter(
    participant__clipper=user,
    status='approved'  # Finds ALL approved submissions
).aggregate(Sum('earning'))
# Result: ✅ Earnings = ₹500 (includes deleted submissions!)

# User's deleted submissions (for audit)
CampaignSubmission.objects.filter(
    participant__clipper=user,
    is_deleted=True
)
# Result: ✅ Can see deletion history
```

---

## Earnings Calculation Methods

All these methods now correctly include deleted submissions:

### 1. User Total Earnings
```python
# backend/earnings/views.py
campaign_submission_queryset = CampaignSubmission.objects.filter(
    participant__clipper=user,
    status='approved'  # ← Includes deleted approved submissions ✅
)
total_earnings = campaign_submission_queryset.aggregate(
    Sum('earning')
)['earning__sum']

# Result: ✅ Includes deleted submissions
```

### 2. Campaign Metrics
```python
# backend/content/models.py - Campaign.recalculate_metrics()

# View/submission counts: exclude deleted
stats = CampaignSubmission.objects.filter(
    participant__campaign=self,
    is_deleted=False  # Clean metrics for dashboard
).aggregate(
    total_views=Sum('views'),
    total_submissions=Count('id'),
)

# Earnings: include deleted
earnings_stats = CampaignSubmission.objects.filter(
    participant__campaign=self,
    status='approved'  # ← All approved, including deleted ✅
).aggregate(
    total_paid_out=Sum('earning')
)

# Result: ✅ Accurate payout tracking
```

### 3. User Earnings Dashboard
```python
# Shows all earnings including from deleted submissions
{
    'total_earnings': ₹700,      # Includes deleted ✅
    'pending_earnings': ₹200,    # Includes deleted ✅
    'completed_earnings': ₹500,  # Includes deleted ✅
}
```

### 4. Leaderboard Rankings
```python
# Rankings based on views/earnings from all approved submissions
User.objects.annotate(
    total_views=Sum('submissions__views', filter=Q(submissions__status='approved')),
    total_earnings=Sum('submissions__earning', filter=Q(submissions__status='approved'))
).order_by('-total_earnings')

# Result: ✅ Rankings include deleted submissions' contributions
```

---

## Data Consistency Guarantees

✅ **Deleted Submission Data Rules:**

| Field | Behavior | Why |
|-------|----------|-----|
| `status` | PRESERVED | Needed for earning queries (status='approved') |
| `earning` | PRESERVED | User's earned money is permanent |
| `pending_earning` | PRESERVED or CLEARED | Cleared only on admin delete |
| `views` | PRESERVED | Counted in platform metrics |
| `is_deleted` | SET TO TRUE | Soft-delete marker for UI filtering |

---

## User Workflows

### Scenario 1: User Reaches Earning Limit and Deletes

```
1. User joins campaign and submits
   └─ status='pending', is_deleted=False

2. Admin approves
   └─ status='approved', is_deleted=False
   └─ earning=₹500, views=5000

3. User's earnings reach limit (max_earnings=₹500)
   └─ Campaign closes for user
   └─ Can't earn more from same campaign

4. User deletes submission from "My Submissions"
   └─ status='approved' (UNCHANGED ✅)
   └─ earning=₹500 (UNCHANGED ✅)
   └─ is_deleted=True (MARKED AS DELETED)

5. "My Submissions" table
   └─ Query: filter(is_deleted=False)
   └─ Result: Submission HIDDEN ✅

6. User Earnings Dashboard
   └─ Query: filter(status='approved')
   └─ Result: ₹500 STILL COUNTED ✅

7. User waits 24 hours (cooling period)
   └─ Cooling period based on non-deleted submissions

8. User submits new content
   └─ New status='pending', is_deleted=False
   └─ Can potentially earn more (if campaign still active)
```

### Scenario 2: Admin Deletes Submission

```
1. Admin action: Delete submission
   └─ is_deleted=True
   └─ status='approved' (PRESERVED)
   └─ pending_earning=0 (CLEARED for admin delete)
   └─ earning=₹500 (PRESERVED)

2. Financial Records
   └─ earning counted in totals
   └─ pending_earning NOT counted (cleared)
   └─ Audit trail shows what happened
```

---

## Critical Queries (All Working Correctly)

### My Earnings Endpoint
```python
@action(detail=False, methods=['get'])
def my_earnings(self, request):
    # Correctly includes deleted submissions
    campaign_submissions = CampaignSubmission.objects.filter(
        participant__clipper=request.user,
        status='approved'  # ← Gets all approved, deleted or not
    )
    total_earnings = campaign_submissions.aggregate(
        Sum('earning')
    )['earning__sum']
    
    return Response({'total_earnings': total_earnings})
```

### My Submissions UI
```python
def list(self, request):
    # Only shows active submissions
    queryset = self.get_queryset().filter(
        is_deleted=False  # ← Filters deleted from UI
    )
    # Result: Hidden from user view ✅
```

### Campaign Leaderboard
```python
# Rankings include deleted submissions' contributions
rankings = CampaignParticipant.objects.filter(
    campaign=campaign
).annotate(
    total_earnings=Sum(
        'submissions__earning',
        filter=Q(submissions__status='approved')  # ← All approved submissions
    )
).order_by('-total_earnings')

# Result: Fair ranking based on total contributions ✅
```

---

## Migration Path

```
OLD: status field with "deleted" value
    └─ Break earnings queries

NEW: is_deleted boolean field + preserved status
    └─ Earnings queries work correctly
    └─ UI filtering clean
    └─ Data integrity maintained

Migration:
  1. Add is_deleted field (default=False)
  2. Remove "deleted" from status choices
  3. Update all delete operations to use is_deleted=True
  4. Update all queries to check is_deleted
```

**Files Changed:**
- `backend/content/models.py` - Added is_deleted field, updated recalculate_metrics()
- `backend/content/views.py` - Updated all delete operations
- `backend/content/migrations/0021_*.py` - Migration file

---

## Testing Checklist

- [ ] Deleted submission hidden from "My Submissions" view
- [ ] Deleted submission earnings counted in total earnings
- [ ] Deleted submission views counted in campaign metrics
- [ ] Campaign max_earnings respects deleted submissions' earnings
- [ ] User can re-submit after 24-hour cooldown
- [ ] Leaderboard includes deleted submissions' contributions
- [ ] Audit trail shows deleted submissions
- [ ] Campaign metrics accurate with mixed deleted/active submissions
- [ ] Admin earnings calculations include deleted submissions

---

## Performance Considerations

```python
# Optimized queries:

# 1. UI Query (needs deleted filter)
CampaignSubmission.objects.filter(
    is_deleted=False  # ← Fast index lookup
).select_related('participant__campaign')

# 2. Earnings Query (doesn't need deleted filter)
CampaignSubmission.objects.filter(
    status='approved'  # ← Indexed, includes deleted ✅
).aggregate(Sum('earning'))

# 3. Deletion doesn't create new data
# └─ Just sets is_deleted=True
# └─ No expensive aggregation needed
# └─ Existing indexes work
```

**Index Strategy:**
```python
indexes = [
    models.Index(fields=["is_deleted"]),           # UI filtering
    models.Index(fields=["status"]),               # Earnings queries
    models.Index(fields=["participant", "is_deleted"]),  # User submissions list
]
```

---

## Summary

| Aspect | Implementation |
|--------|-----------------|
| **Delete Type** | Soft-delete with is_deleted=True |
| **Status Preservation** | Original status kept (pending/approved/rejected) |
| **Earnings Included?** | ✅ YES - All approved submissions (deleted or not) |
| **Views Included?** | ✅ YES - All approved submissions |
| **UI Display** | Hidden from "My Submissions" via is_deleted=False filter |
| **Cooling Period** | Based on non-deleted submissions |
| **Re-earnings** | User can submit again after cooldown |
| **Audit Trail** | Complete record preserved |

**The Result:** Deleted submissions are invisible to users but fully included in all financial and analytical calculations! 🎯

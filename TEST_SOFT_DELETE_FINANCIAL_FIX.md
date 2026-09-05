# 🧪 Test Plan: Soft Delete - Financial Calculations Fix

## ✅ Status: READY TO TEST
All code changes have been applied successfully. No syntax errors.

---

## 📋 Test Checklist

### Test 1: Delete Submission with Earnings & Verify Calculations
**Purpose**: Ensure deleted submissions are included in financial totals

**Setup**:
1. Login to creator dashboard
2. Go to Creator Submissions: `http://localhost:5173/creator/submissions/campaign-8`
3. Find a submission with:
   - Status: Approved
   - Earning > 0 (e.g., ₹500)
   - Views > 0 (e.g., 10,000)

**Step-by-step**:

1. **Note the baseline totals**:
   - Open Browser DevTools (F12) → Network tab
   - Refresh page
   - Write down:
     - Campaign.views (from API response)
     - Campaign.paid_out (from API response)
     - Participant.total_reward (displayed)
     - Participant.total_views (displayed)

2. **Delete the submission**:
   - Click delete button on submission
   - Confirm deletion
   - Wait for success message

3. **Verify UI changes**:
   - ✅ Submission removed from "Published Content" table
   - ✅ submitted_submissions count decreased by 1
   - ✅ pending_earning shown as ₹0

4. **Verify financial data in database**:
   ```sql
   -- Check that is_deleted=True and data preserved
   SELECT id, is_deleted, earning, pending_earning, views, status
   FROM content_campaignsubmission
   WHERE id = [submission_id];
   
   -- Should show: is_deleted=True, earning=₹500, views=10000, status=approved
   ```

5. **Verify financial calculations**:
   - Refresh the page (F5)
   - Open DevTools → Network tab
   - Check API response:
     - **Campaign.views** = should STILL include deleted submission's 10,000 views ✅
     - **Campaign.paid_out** = should STILL include deleted submission's ₹500 earnings ✅
   - Check displayed totals:
     - **Participant.total_reward** = should STILL include ₹500 ✅
     - **Participant.total_views** = should STILL include 10,000 ✅

**Expected Results**:
```
BEFORE DELETE:
Campaign.views = 20,000 (includes this submission's 10,000)
Campaign.paid_out = ₹1000 (includes this submission's ₹500)

AFTER DELETE:
Campaign.views = 20,000 ✅ (still includes 10,000 from deleted)
Campaign.paid_out = ₹1000 ✅ (still includes ₹500 from deleted)
Published Content = 1 submission (was 2, deleted 1) ✅
```

---

### Test 2: Dashboard Shows Correct Totals
**Purpose**: Verify dashboard metrics include deleted submissions in earnings

**Setup**:
1. Navigate to: `http://localhost:5173/creator/dashboard`

**Step-by-step**:

1. **Note baseline dashboard stats**:
   - total_submissions (should exclude deleted)
   - total_earnings (should INCLUDE deleted)
   - total_views (should INCLUDE deleted)

2. **Go back to submissions and delete a submission**:
   - Navigate to Campaign 8 submissions
   - Delete a submission with earnings

3. **Return to dashboard**:
   - Navigate back to: `http://localhost:5173/creator/dashboard`
   - Refresh (F5)

4. **Verify dashboard totals**:
   - ✅ total_submissions decreased by 1
   - ✅ total_earnings unchanged (includes deleted)
   - ✅ total_views unchanged (includes deleted)

**Expected Results**:
```
BEFORE DELETE:
Dashboard Submissions: 5
Dashboard Earnings: ₹2000
Dashboard Views: 50,000

AFTER DELETE:
Dashboard Submissions: 4 ✅ (decreased by 1)
Dashboard Earnings: ₹2000 ✅ (unchanged - includes deleted)
Dashboard Views: 50,000 ✅ (unchanged - includes deleted)
```

---

### Test 3: Participant Earnings Preserved
**Purpose**: Ensure CampaignParticipant.get_total_earnings() includes deleted

**Setup**:
1. API access or database check
2. Note a participant with deleted submissions

**Query to verify**:
```sql
-- Get participant's approved submissions (including deleted)
SELECT SUM(earning) as total
FROM content_campaignsubmission
WHERE participant_id = [participant_id]
AND status = 'approved'
AND is_deleted = TRUE;  -- This should have values

-- Get participant's total (should include deleted)
SELECT SUM(earning) as total
FROM content_campaignsubmission
WHERE participant_id = [participant_id]
AND status = 'approved';  -- Should be higher than display count
```

**Expected**:
- Sum with `is_deleted=TRUE` shows deleted earnings
- Sum without is_deleted filter shows all earnings (display + deleted)

---

### Test 4: Display Queries Filter Deleted
**Purpose**: Ensure UI doesn't show deleted submissions

**Setup**:
1. Navigate to all submission lists
2. Verify no deleted submissions appear

**Locations to check**:
- ✅ Creator dashboard → Submissions tab
- ✅ Campaign detail → Participants → Submissions
- ✅ Admin panel → Submissions list

**Expected**:
- All lists show only `is_deleted=False` submissions
- No deleted submissions visible in UI

---

### Test 5: Re-submission of Deleted Content
**Purpose**: Verify user can resubmit same URL after deletion

**Setup**:
1. Delete a submission with URL: `https://youtube.com/watch?v=test123`
2. Try to submit same URL again

**Expected**:
- ✅ New submission accepted (duplicate check filters `is_deleted=False`)
- ✅ Old deleted submission remains in database with `is_deleted=True`
- ✅ New submission is separate record

---

### Test 6: Transaction Record Created
**Purpose**: Verify Transaction records preserve audit trail

**Setup**:
1. Delete a submission
2. Check Transaction table

**Query**:
```sql
SELECT id, from_user_id, to_user_id, amount, transaction_type, bot_notes, created_at
FROM creator_transaction
WHERE submission_id = [submission_id]
ORDER BY created_at DESC;
```

**Expected**:
- Transaction record created with type='soft_delete'
- bot_notes contains preserved earnings info
- amount field shows preserved amount

---

## 🔍 Debugging if Tests Fail

### If Earnings NOT Preserved After Delete:

**Check 1: Database is_deleted flag**
```sql
SELECT id, is_deleted, earning, pending_earning
FROM content_campaignsubmission
WHERE id = [submission_id];
```
- If `is_deleted=FALSE`: Hard delete bug, not soft delete
- If `is_deleted=TRUE`: Soft delete working, check calculation

**Check 2: Financial queries have is_deleted filter**
```python
# File: backend/creator/views.py line 163
total_reward = float(sum((submission.earning or 0) + (submission.pending_earning or 0) 
                         for submission in all_submissions if submission.status == 'approved'))
                         # ✅ No is_deleted filter here!

# Should be: for all_submissions (not display_submissions)
# Should NOT have: filter(is_deleted=False)
```

**Check 3: Campaign.recalculate_metrics() includes deleted**
```python
# File: backend/content/models.py line 371-376
financial_stats = CampaignSubmission.objects.filter(
    participant__campaign=self,
    status='approved'  # No is_deleted filter!
).aggregate(
    total_views=Sum('views'),
    total_paid_out=Sum('earning'),
)
```

### If Submissions Still Show in Published Content:

**Check 1: Display query filters is_deleted**
```python
# File: backend/creator/views.py line 121
display_submissions = participant.submissions.filter(is_deleted=False)
# ✅ Should have is_deleted=False filter
```

**Check 2: API response filters deleted**
```sql
SELECT COUNT(*) FROM content_campaignsubmission
WHERE campaign_participant_id = [id]
AND is_deleted = FALSE;
```

---

## 📊 Expected SQL State After Test 1

```sql
-- Submission after delete
SELECT id, is_deleted, earning, pending_earning, views, status
FROM content_campaignsubmission
WHERE id = [deleted_submission_id];

Result:
| id  | is_deleted | earning | pending_earning | views | status   |
|-----|------------|---------|-----------------|-------|----------|
| 123 | TRUE       | 500.00  | 0.00            | 10000 | approved |

-- Financial totals still include it
SELECT SUM(earning) FROM content_campaignsubmission
WHERE campaign_id = [id] AND status='approved' AND is_deleted=TRUE;
Result: 500.00 ✅

-- Display count excludes it
SELECT COUNT(*) FROM content_campaignsubmission
WHERE campaign_id = [id] AND is_deleted=FALSE;
Result: [n-1] ✅
```

---

## 🚀 Commands to Run if Backend Needs Restart

```bash
cd backend

# Restart Django
python manage.py runserver 0.0.0.0:8000

# Or if using separate terminal:
# Ctrl+C to stop, then re-run above
```

---

## 📝 Test Results Template

```
TEST RUN: [Date/Time]
Tester: [Name]

✅ Test 1: Delete Submission with Earnings
  - UI Changes: PASS / FAIL
  - Database is_deleted flag: PASS / FAIL
  - Campaign.views includes deleted: PASS / FAIL
  - Campaign.paid_out includes deleted: PASS / FAIL
  - Participant.total_reward includes deleted: PASS / FAIL

✅ Test 2: Dashboard Totals
  - Submissions decreased: PASS / FAIL
  - Earnings unchanged: PASS / FAIL
  - Views unchanged: PASS / FAIL

✅ Test 3: Participant Earnings
  - get_total_earnings() includes deleted: PASS / FAIL

✅ Test 4: Display Filters Deleted
  - No deleted in Published Content: PASS / FAIL
  - No deleted in Dashboard: PASS / FAIL

✅ Test 5: Re-submission Works
  - Can resubmit same URL: PASS / FAIL

✅ Test 6: Transaction Record
  - Transaction created: PASS / FAIL
  - bot_notes has earnings info: PASS / FAIL

Overall: ✅ ALL PASS / ❌ SOME FAILURES
```

---

## 🎯 Key Success Criteria

1. ✅ Deleted submissions appear in database with `is_deleted=TRUE`
2. ✅ Deleted submissions do NOT appear in UI ("Published Content")
3. ✅ Deleted submissions ARE counted in financial totals (earnings, views)
4. ✅ Campaign metrics show correct display counts and financial totals
5. ✅ Dashboard shows accurate earnings (includes deleted)
6. ✅ Users can resubmit deleted content
7. ✅ Transaction records created for audit trail

---

## 📞 Support Info

If tests fail:
1. Check error logs: `backend/logs/`
2. Verify database connection
3. Run migrations if needed: `python manage.py migrate`
4. Clear Django cache: `python manage.py clear_cache`
5. Restart Django server

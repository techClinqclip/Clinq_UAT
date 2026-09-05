# Soft Delete Testing Guide - Creator Submissions

## ✅ Implementation Complete

All soft delete logic has been implemented for both:
1. **Campaign Submissions** (CampaignSubmission) - `backend/content/views.py`
2. **Creator Submissions** (CreatorSubmission) - `backend/creator/views.py` & `backend/creator/models.py`

---

## 🧪 Test Flow in Browser

### Step 1: Open the Application
- Navigate to: `http://localhost:5173/creator/submissions/campaign-8`
- You should see the "Cricket match" campaign submission page
- Status: Backend ✅ Running (port 8000) | Frontend ✅ Running (port 5173)

### Step 2: View Existing Submissions
- You should see the "Published Content" section
- **Expected**: Shows submissions with `is_deleted=False` only

### Step 3: Delete a Submission
1. Click the delete icon on any submission
2. You'll see a modal asking for a delete reason
3. Enter a reason and click "Submit"

### Step 4: Verify Soft Delete
After deletion, verify:

**In Frontend:**
- ✅ Submission disappears from "Published Content" table
- ✅ No hard deletion error in console
- ✅ Success message appears

**In Backend Database:**
```sql
-- Check that submission still exists but is marked as deleted
SELECT id, status, is_deleted FROM creator_creatorsubmission 
WHERE id = {submission_id};

-- Expected Result:
-- id | status   | is_deleted
-- ---|----------|----------
-- 123| approved | true
```

**Earnings Preserved:**
- ✅ Submission data still counted in earnings calculations
- ✅ Transaction record created in earnings history
- ✅ User's total earnings not affected

---

## 📊 Expected Behavior After Soft Delete

| Field | Before Delete | After Delete | Stored In DB |
|-------|---------------|--------------|--------------|
| `is_deleted` | FALSE | TRUE | ✅ YES |
| `status` | approved | approved | ✅ YES (preserved) |
| `earning` | 500 | 500 | ✅ YES (preserved) |
| `pending_earning` | 250 | 0 | ✅ UPDATED to 0 |
| Visible in UI | YES | NO | N/A |
| Used in earnings calc | YES | YES | ✅ (financial accuracy) |

---

## 🔍 Debugging: Check Console

### Frontend Console (Browser)
1. Open DevTools: `F12`
2. Go to "Network" tab
3. Delete a submission
4. Look for DELETE request to `/api/content/campaigns/{id}/clippers/{clipper_id}/submissions/{submission_id}/`
5. Should return: `200 OK` with success message

### Backend Console
1. Check terminal running Django server
2. Should see logs like:
```
🔴 DELETE endpoint called:
  pk=8, clipper_id=..., submission_id=...
  💰 Preserving earnings: ₹...
  ✅ Transaction created to preserve...
  ✅ Submission marked as deleted (soft-delete)
```

---

## 📝 API Endpoints to Test

### 1. Get Campaign Submissions (Published Content)
```bash
GET /api/content/campaigns/8/clippers/{participantId}/submissions/
```
**Expected**: Only non-deleted submissions returned

### 2. Delete Submission
```bash
DELETE /api/content/campaigns/8/clippers/{participantId}/submissions/{submissionId}/
```
**Expected**: 
- Sets `is_deleted=True`
- Sets `pending_earning=0`
- Creates Transaction record
- Returns 200 OK

### 3. Get Dashboard Stats
```bash
GET /api/creator/dashboard/
```
**Expected**: Submission counts exclude soft-deleted submissions

---

## ✨ Key Changes Summary

### Backend Files Modified
1. **creator/models.py** - Added `is_deleted` field to CreatorSubmission
2. **creator/views.py** - Implemented soft delete logic and filtering
3. **content/views.py** - Already had soft delete (updated)
4. **Migration** - `creator/migrations/0002_creatorsubmission_is_deleted.py` ✅ Applied

### Database Changes
- Created `is_deleted` column on `creator_creatorsubmission` table
- Indexed for performance (db_index=True)
- Default value: FALSE (for existing submissions)

---

## 🧪 Manual Test Checklist

- [ ] Delete submission → disappears from UI
- [ ] Reload page → submission still gone (is_deleted=True in DB)
- [ ] Check earnings still preserved → User earnings not lost
- [ ] Submit same clip again → Allowed (duplicate check filters is_deleted=False)
- [ ] Check dashboard counts → Don't include deleted submissions
- [ ] Check transaction record → Created with proper notes
- [ ] Try to manually query deleted → Can still access for admin/analytics

---

## 🚨 If Soft Delete Not Working

If you still see hard deletion, check:

1. **Clear Browser Cache**
   ```bash
   Ctrl+Shift+Delete → Clear all cache
   ```

2. **Restart Django Server**
   ```bash
   Ctrl+C in terminal
   python manage.py runserver
   ```

3. **Verify Migration Applied**
   ```bash
   python manage.py migrate creator
   ```

4. **Check is_deleted Field Exists**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'creator_creatorsubmission' 
   AND column_name = 'is_deleted';
   ```

5. **Check View Code**
   - Ensure `is_deleted=True` in delete method
   - Ensure `.filter(is_deleted=False)` in list queries

---

## 📈 Expected Test Result Flow

```
1. User sees: Cricket match campaign with 2 submissions
                ↓
2. User clicks Delete on Submission #1
                ↓
3. Modal appears asking for reason
                ↓
4. User enters reason & clicks Submit
                ↓
5. Backend processes:
   - Creates Transaction record
   - Updates profile.total_earnings
   - Sets submission.is_deleted = True
   - Clears pending_earning
                ↓
6. Frontend:
   - Submission #1 disappears from Published Content
   - Success notification shown
   - Dashboard refreshes
                ↓
7. Result: Only Submission #2 visible in UI
           Both still in database for calculations
```

---

## 📞 Support

If tests fail, provide:
1. Browser console errors
2. Backend server logs
3. Network tab screenshot (DELETE request)
4. Database query results showing is_deleted value

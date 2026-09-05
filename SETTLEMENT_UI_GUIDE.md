# Remaining Money Settlement - UI Implementation Guide

## Overview
When a campaign closes (due to deadline or budget exhaustion) with remaining unspent budget, the owner must settle those funds before the event is considered fully resolved. This guide explains how the settlement flow should work on the UI.

---

## Data Flow: Backend → Frontend

### 1. Campaign Data Response
When the frontend fetches campaign details, the API returns:

```json
{
  "id": 1,
  "name": "My Campaign",
  "status": "closed",
  "budget": 10000,
  "paidOut": 7000,
  "remainingBudget": 3000,
  "needsRemainingSettlement": true,
  "closureReason": "deadline",
  "remainingFundSettled": false,
  "remainingFundSettledAmount": 0
}
```

**Key Fields:**
- `status`: "closed" when campaign has ended
- `remainingBudget`: Amount still unspent (`budget - paidOut`)
- `needsRemainingSettlement`: **true** when:
  - `status == "closed"`
  - `remaining_funds_settled == false`
  - `remainingBudget > 0`
- `closureReason`: Why campaign closed ("deadline", "budget", or "manual")

---

## UI Components & Flow

### Component 1: Settlement Alert Banner

**Location:** Campaign Details page (Brand Dashboard)  
**Trigger:** When `needsRemainingSettlement === true`

```jsx
{campaign.needsRemainingSettlement && (
  <AlertBanner
    type="warning"
    title="Remaining Budget Settlement Required"
    message={`You have ₹${campaign.remainingBudget.toLocaleString()} remaining in this campaign. 
             Please settle this amount by extending the deadline or transferring funds to your wallet.`}
    icon={AlertTriangle}
  />
)}
```

**Visual Design:**
- Red/orange warning banner with alert icon
- Prominent placement (top of campaign details, below header)
- Shows remaining amount in bold
- Non-dismissible (stays until settled)

---

### Component 2: Settlement Modal/Dialog

**Trigger:** Clicking settlement alert or opening the campaign

**Title:** "Settle Remaining Campaign Budget"

**Content:**
```
Campaign: "My Campaign"
Remaining Budget: ₹3,000
Closure Reason: Deadline Reached

Choose one of the following options:
```

**Option 1: Extend Deadline**
```
┌─────────────────────────────────┐
│ 📅 Extend Campaign Deadline     │
├─────────────────────────────────┤
│ Give participants more time to  │
│ submit and you more time to     │
│ spend remaining budget.         │
│                                 │
│ New Deadline: [date picker]     │
│                                 │
│ [Extend Deadline] button        │
└─────────────────────────────────┘
```

**Option 2: Transfer to Wallet**
```
┌─────────────────────────────────┐
│ 💳 Transfer to Wallet           │
├─────────────────────────────────┤
│ Move remaining funds to your    │
│ brand wallet. No payment        │
│ gateway involved.               │
│                                 │
│ Amount to Transfer: ₹3,000      │
│                                 │
│ [Transfer Now] button           │
└─────────────────────────────────┘
```

---

## User Actions & API Calls

### Action 1: Extend Deadline

**UI Flow:**
1. User selects "Extend Deadline" option
2. Date picker opens
3. User selects new date (must be future date)
4. Clicks "Extend Deadline" button
5. Loading state shown
6. API call: `PATCH /api/content/campaigns/{id}/`
   ```json
   {
     "endDate": "2026-12-31"
   }
   ```

**Response Handling:**
- ✅ Success: Campaign status changes to "active"
- Participants can now submit again
- Settlement alert disappears
- Toast: "Campaign deadline extended. Participants can submit again."

- ❌ Error: Show error message
- Allows user to retry with different date

---

### Action 2: Transfer Remaining Funds

**UI Flow:**
1. User selects "Transfer to Wallet" option
2. Shows amount to transfer: ₹3,000
3. Shows confirmation: "This action cannot be undone"
4. User clicks "Transfer Now"
5. Loading state shown
6. API call: `POST /api/content/campaigns/{id}/transfer-remaining-funds/`
   ```json
   {
     "amount": 3000
   }
   ```

**Response Handling:**
- ✅ Success:
  - Funds added to brand wallet
  - `remaining_funds_settled` set to true
  - Settlement alert disappears
  - Campaign remains closed
  - Toast: "₹3,000 transferred to your wallet"
  - Wallet balance updated

- ❌ Error: 
  - Show error message
  - Allow user to retry

---

## States & Visual Indicators

### Campaign Status Indicators

| Status | Label | Color | Settlement Required? |
|--------|-------|-------|----------------------|
| active | Active | 🟢 Green | No |
| closed | Closed | 🔴 Red | Only if remaining budget |
| paused | Paused | 🟡 Yellow | No |

### Settlement State

```
Unsettled (needsRemainingSettlement = true)
├─ Show red banner
├─ Disable participant submissions
├─ Show settlement dialog on page open
└─ Remind owner on every visit

Settled (remaining_funds_settled = true)
├─ Hide banner
├─ Campaign stays closed (no new submissions)
├─ Show "Settlement Complete" confirmation
└─ Funds visible in wallet
```

---

## Submission Blocking

### When Submissions Are Blocked

**Participants see error when trying to submit:**

```
❌ Error Message

"This campaign has been closed. No new submissions 
are being accepted."

Closure Reason: [Deadline Reached / Budget Exhausted]
```

**Participants cannot join:**

```
❌ "This campaign/gig has reached its [deadline/budget] 
and is no longer accepting participants."
```

---

## Complete UI Implementation Example

### Settlement Modal Component

```jsx
export function RemainingBudgetSettlementModal({ 
  campaign, 
  isOpen, 
  onClose, 
  onSettled 
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [newDeadline, setNewDeadline] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleExtendDeadline = async () => {
    if (!newDeadline) {
      showToast({ type: 'error', message: 'Please select a date' });
      return;
    }

    setIsLoading(true);
    try {
      await api(`/api/content/campaigns/${campaign.id}/`, {
        method: 'PATCH',
        body: { endDate: newDeadline }
      });
      
      showToast({ 
        type: 'success', 
        message: 'Campaign deadline extended successfully' 
      });
      onSettled();
      onClose();
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferFunds = async () => {
    setIsLoading(true);
    try {
      await api(
        `/api/content/campaigns/${campaign.id}/transfer-remaining-funds/`,
        { method: 'POST' }
      );
      
      showToast({ 
        type: 'success', 
        message: `₹${campaign.remainingBudget} transferred to wallet` 
      });
      onSettled();
      onClose();
    } catch (error) {
      showToast({ 
        type: 'error', 
        message: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Settle Remaining Campaign Budget</DialogTitle>
          <DialogDescription>
            {campaign.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Remaining Budget Info */}
          <div className="rounded-lg bg-yellow-500/10 p-4 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">Remaining Budget</p>
            <p className="text-2xl font-bold text-white">
              ₹{campaign.remainingBudget.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-yellow-400/60 mt-1">
              Closure Reason: {campaign.closureReason}
            </p>
          </div>

          {/* Option Selection */}
          <div className="space-y-3">
            {/* Option 1 */}
            <button
              onClick={() => setSelectedOption('extend')}
              className={`w-full p-4 rounded-lg border-2 text-left transition ${
                selectedOption === 'extend'
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <p className="font-semibold text-white">📅 Extend Deadline</p>
              <p className="text-sm text-zinc-400">
                Give participants more time to submit
              </p>
            </button>

            {selectedOption === 'extend' && (
              <div className="space-y-2">
                <label className="block text-sm text-zinc-400">New Deadline</label>
                <input
                  type="date"
                  value={newDeadline || ''}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            {/* Option 2 */}
            <button
              onClick={() => setSelectedOption('transfer')}
              className={`w-full p-4 rounded-lg border-2 text-left transition ${
                selectedOption === 'transfer'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <p className="font-semibold text-white">💳 Transfer to Wallet</p>
              <p className="text-sm text-zinc-400">
                Move funds to your brand wallet instantly
              </p>
            </button>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={
              selectedOption === 'extend'
                ? handleExtendDeadline
                : handleTransferFunds
            }
            disabled={isLoading || !selectedOption}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Key User Experiences

### Scenario 1: Campaign Closes Due to Deadline
1. Campaign deadline reached
2. Status changes to "closed"
3. `closureReason = "deadline"`
4. Remaining budget: ₹3,000
5. Owner sees red banner: "Remaining Budget Settlement Required"
6. Participants see: "This campaign has ended. No new submissions accepted"
7. Owner must choose:
   - Extend deadline to continue accepting submissions
   - Transfer remaining funds to wallet

### Scenario 2: Campaign Closes Due to Budget Exhaustion
1. Budget fully spent
2. Status changes to "closed"
3. `closureReason = "budget"`
4. Remaining budget: ₹0 (no settlement needed)
5. No settlement alert shown
6. Campaign stays closed

### Scenario 3: Manual Campaign Close with Remaining Budget
1. Owner manually closes campaign
2. Status changes to "closed"
3. `closureReason = "manual"`
4. Remaining budget: ₹2,500
5. Settlement alert shown
6. Same settlement flow as scenario 1

---

## Edge Cases Handled

### ✅ Prevent Auto-Reopen
- Closed campaigns with remaining budget stay closed even if deadline is extended to future
- Owner must explicitly extend deadline via settlement modal

### ✅ Settlement Persistence
- Settlement alert shown on every page visit until resolved
- Cannot dismiss the alert - must settle or extend

### ✅ No Submissions After Close
- Submissions blocked for all participants
- Clear error message explaining why

### ✅ Wallet Integration
- Transferred funds immediately appear in brand wallet
- Can be used for new campaigns

---

## Testing Checklist

- [ ] Settlement alert shown when `needsRemainingSettlement = true`
- [ ] Extend deadline updates campaign status to "active"
- [ ] Transferred funds appear in wallet balance
- [ ] Participants blocked from submitting after close
- [ ] Participants blocked from joining after close
- [ ] Settlement modal shown on page load if needed
- [ ] Error messages displayed for API failures
- [ ] Toast notifications show success/failure
- [ ] Closed status displays correctly
- [ ] Closure reason visible in campaign details

# Settlement Alert Implementation - CampaignDetails.jsx

## Location
File: `frontend/src/pages/Brand/CampaignDetails.jsx`

## Changes Required

### 1. Add New Import for Settlement Modal
Add to the imports section (after line 20):

```jsx
import { AlertTriangle } from 'lucide-react';
// Add this import if not already present
```

### 2. Add State for Settlement Modal
Add to the state declarations in `CampaignDetails` component (after line 130):

```jsx
const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
const [settlementOption, setSettlementOption] = useState(null);
const [newSettlementDeadline, setNewSettlementDeadline] = useState(null);
const [isSettlingFunds, setIsSettlingFunds] = useState(false);
```

### 3. Add Settlement Handlers
Add these functions after the existing handlers (after `handleExport` function):

```jsx
const handleExtendDeadlineSettlement = async () => {
  if (!newSettlementDeadline) {
    alert("Please select a new deadline date.");
    return;
  }

  setIsSettlingFunds(true);
  try {
    await api(`/api/content/campaigns/${id}/`, {
      method: "PATCH",
      body: { endDate: newSettlementDeadline },
    });

    // Reload campaign to get updated status
    const updatedCampaign = await api(`/api/content/campaigns/${id}/`);
    setCampaign(updatedCampaign);

    setIsSettlementModalOpen(false);
    alert("Campaign deadline extended successfully. Participants can now submit again.");
  } catch (error) {
    console.error("Failed to extend deadline", error);
    alert(error.message || "Unable to extend deadline. Please try again.");
  } finally {
    setIsSettlingFunds(false);
  }
};

const handleTransferRemainingFunds = async () => {
  if (!window.confirm(
    `Transfer ₹${campaign?.remainingBudget?.toLocaleString('en-IN') || 0} to your wallet? This action cannot be undone.`
  )) {
    return;
  }

  setIsSettlingFunds(true);
  try {
    await api(`/api/content/campaigns/${id}/transfer-remaining-funds/`, {
      method: "POST",
    });

    // Reload campaign to get updated settlement status
    const updatedCampaign = await api(`/api/content/campaigns/${id}/`);
    setCampaign(updatedCampaign);

    setIsSettlementModalOpen(false);
    alert(
      `₹${campaign?.remainingBudget?.toLocaleString('en-IN') || 0} transferred to your wallet.`
    );
  } catch (error) {
    console.error("Failed to transfer funds", error);
    alert(error.message || "Unable to transfer funds. Please try again.");
  } finally {
    setIsSettlingFunds(false);
  }
};
```

### 4. Add Settlement Alert Banner (After Hero Section)
Add this BEFORE the "Overview" section (around line 360, right after the hero section):

```jsx
      {/* Settlement Alert Banner - Show when campaign is closed with remaining budget */}
      {campaign?.needsRemainingSettlement && (
        <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start justify-between gap-4 md:flex-row flex-col">
            <div className="flex items-start gap-4">
              <AlertTriangle size={24} className="mt-1 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-white">Remaining Budget Settlement Required</h3>
                <p className="mt-1 text-sm text-red-300">
                  You have <span className="font-bold">₹{campaign.remainingBudget?.toLocaleString('en-IN') || 0}</span> remaining
                  in this campaign. This amount must be settled before any new activity can occur.
                </p>
                <p className="mt-2 text-xs text-red-300/80">
                  Reason: Campaign closed due to {
                    campaign.closureReason === 'deadline'
                      ? 'deadline reached'
                      : campaign.closureReason === 'budget'
                      ? 'budget exhausted'
                      : 'manual closure'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSettlementOption(null);
                setNewSettlementDeadline(null);
                setIsSettlementModalOpen(true);
              }}
              className="flex-shrink-0 rounded-lg bg-red-500/20 px-4 py-2 text-red-400 hover:bg-red-500/30 transition font-medium"
            >
              Settle Now
            </button>
          </div>
        </section>
      )}
```

### 5. Add Settlement Modal (Before the Final Closing Tag)
Add this modal before the final closing `</div>` tag (around the end of the component):

```jsx
      {/* Settlement Modal Dialog */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#11111A] p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Settle Remaining Budget</h2>
                <p className="mt-1 text-sm text-zinc-400">{campaign?.name}</p>
              </div>
              <button
                onClick={() => setIsSettlementModalOpen(false)}
                disabled={isSettlingFunds}
                className="text-zinc-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Remaining Budget Info */}
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 mb-6">
              <p className="text-sm text-yellow-400">Remaining Budget</p>
              <p className="text-3xl font-bold text-white mt-1">
                ₹{campaign?.remainingBudget?.toLocaleString('en-IN') || 0}
              </p>
              <p className="text-xs text-yellow-400/60 mt-2 capitalize">
                Closure reason: {campaign?.closureReason || 'N/A'}
              </p>
            </div>

            {/* Settlement Options */}
            <div className="space-y-3 mb-6">
              {/* Option 1: Extend Deadline */}
              <button
                onClick={() => setSettlementOption('extend')}
                disabled={isSettlingFunds}
                className={`w-full p-4 rounded-xl border-2 text-left transition ${
                  settlementOption === 'extend'
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <p className="font-semibold text-white flex items-center gap-2">
                  📅 Extend Campaign Deadline
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Give participants more time to submit and you more time to spend the budget
                </p>
              </button>

              {/* Date Picker for Extend Option */}
              {settlementOption === 'extend' && (
                <div className="space-y-2 pl-4">
                  <label className="block text-sm font-medium text-zinc-300">New Deadline</label>
                  <input
                    type="date"
                    value={newSettlementDeadline || ''}
                    onChange={(e) => setNewSettlementDeadline(e.target.value)}
                    disabled={isSettlingFunds}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-zinc-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              {/* Option 2: Transfer to Wallet */}
              <button
                onClick={() => setSettlementOption('transfer')}
                disabled={isSettlingFunds}
                className={`w-full p-4 rounded-xl border-2 text-left transition ${
                  settlementOption === 'transfer'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <p className="font-semibold text-white flex items-center gap-2">
                  💳 Transfer to Wallet
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  Move this amount to your brand wallet instantly
                </p>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsSettlementModalOpen(false)}
                disabled={isSettlingFunds}
                className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/5 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={
                  settlementOption === 'extend'
                    ? handleExtendDeadlineSettlement
                    : handleTransferRemainingFunds
                }
                disabled={
                  isSettlingFunds ||
                  !settlementOption ||
                  (settlementOption === 'extend' && !newSettlementDeadline)
                }
                className="flex-1 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-50 font-medium"
              >
                {isSettlingFunds ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
```

## Key Points

1. **Settlement Alert Banner**: Appears prominently below the hero section when `needsRemainingSettlement` is true
2. **Modal Trigger**: User can click "Settle Now" button to open the settlement modal
3. **Two Options**: 
   - Extend Deadline: Requires selecting a new date
   - Transfer to Wallet: Direct transfer of remaining budget
4. **State Management**: Uses React state to manage modal visibility and selected option
5. **Loading State**: Shows "Processing..." while API call is in progress
6. **Error Handling**: Uses alerts to show errors (can be replaced with toast notifications)
7. **Auto-Reload**: After settlement, campaign is reloaded to reflect updated status

## Integration with API

The component makes these API calls:
- `GET /api/content/campaigns/{id}/` - Fetch campaign details
- `PATCH /api/content/campaigns/{id}/` - Extend deadline
- `POST /api/content/campaigns/{id}/transfer-remaining-funds/` - Transfer funds

All these endpoints already exist in the backend and are fully tested.

## Next Steps

1. Copy the settlement modal code into CampaignDetails.jsx
2. Test the UI by:
   - Creating a campaign and manually closing it via admin
   - Verify settlement alert appears
   - Test both settlement options
   - Verify campaign status updates after settlement
   - Check that wallet balance updates after transfer

3. (Optional) Replace alert() with toast notifications for better UX
4. (Optional) Add animations when modal opens/closes
5. (Optional) Add confirmation before extending deadline

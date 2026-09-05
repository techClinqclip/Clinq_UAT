import { useState } from "react";
import { X, ArrowRightLeft, CircleDollarSign, Wallet, AlertCircle } from "lucide-react";
import useToast from "../../../hooks/useToast"; // ADJUST to match this file's actual path

/*
  TransferToCampaignModal — moves money from the creator's earned,
  withdrawable balance straight into their campaign-spend wallet.

  This is the third leg of the creator wallet's money movement, next to
  Add Funds (external → spend wallet) and Withdraw (earnings → bank/UPI):
  earnings → spend wallet, entirely internal, no payment gateway, so it
  settles instantly and unlike a withdrawal never leaves the platform.

  Props:
    isOpen, onClose
    availableEarnings   — number, the creator's current withdrawable balance
    onSuccess(amount)   — called with the transferred amount once confirmed;
                          the parent is responsible for decrementing
                          availableEarnings and incrementing walletBalance
*/

const PRESET_PERCENTAGES = [25, 50, 100];

export default function TransferToCampaignModal({ isOpen, onClose, availableEarnings, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const reset = () => setAmount("");

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const value = Number(amount) || 0;
  const isValid = value > 0 && value <= availableEarnings;

  const applyPercent = (pct) => {
    const next = Math.floor((availableEarnings * pct) / 100);
    setAmount(next > 0 ? String(next) : "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number.isNaN(value) || value <= 0) {
      showToast({ type: "error", message: "Enter an amount to transfer." });
      return;
    }
    if (value > availableEarnings) {
      showToast({ type: "error", message: "You can't transfer more than your available earnings." });
      return;
    }

    setSubmitting(true);
    // TODO(backend): replace with the real internal-transfer call. Since
    // this never touches a payment gateway it's safe to resolve
    // optimistically rather than routing through ProcessingModal like
    // Add Funds does.
    window.setTimeout(() => {
      setSubmitting(false);
      reset();
      onClose();
      onSuccess?.(value);
      showToast({ type: "success", message: `₹${value.toLocaleString()} moved to your campaign wallet.` });
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131316] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Transfer to campaign wallet</h3>
            <p className="mt-1 text-sm text-zinc-500">Move earned funds straight into your spend balance.</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Flow diagram */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <CircleDollarSign size={15} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">From</p>
              <p className="text-sm font-medium text-white">Earnings</p>
            </div>
          </div>
          <ArrowRightLeft size={16} className="shrink-0 text-zinc-600" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Wallet size={15} className="text-violet-400" />
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">To</p>
              <p className="text-sm font-medium text-white">Campaign wallet</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Amount</label>
              <span className="text-xs text-zinc-500">
                Available: ₹{availableEarnings.toLocaleString()}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-violet-500">
              <span className="text-zinc-500">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max={availableEarnings}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-lg font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_PERCENTAGES.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyPercent(pct)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-white/20 hover:text-white"
                >
                  {pct === 100 ? "Max" : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          {availableEarnings <= 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-300">
              <AlertCircle size={16} className="shrink-0" />
              <p className="text-xs">You don't have any available earnings to transfer yet.</p>
            </div>
          )}

          {amount && !isValid && availableEarnings > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
              Enter an amount up to your available earnings balance.
            </div>
          )}

          <p className="text-xs text-zinc-500">
            Transfers settle instantly — no payment gateway involved. Once moved, funds are only usable to
            fund your own campaigns and can't be withdrawn directly until spent or transferred back.
          </p>

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Transferring\u2026" : `Transfer ₹${amount ? Number(amount).toLocaleString() : "0"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
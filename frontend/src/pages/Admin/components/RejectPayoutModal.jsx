import { useState } from "react";
import { X, XCircle } from "lucide-react";

export default function RejectPayoutModal({ open, item, busy = false, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!open || !item) return null;

  const resetAndClose = () => {
    if (busy) return;
    setReason("");
    setError("");
    onClose?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const cleaned = reason.trim();
    if (!cleaned) {
      setError("Please provide a rejection reason.");
      return;
    }
    setError("");
    onConfirm?.({
      transactionId: item.id,
      reason: cleaned,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131316] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Reject withdrawal</h3>
            <p className="mt-1 text-sm text-zinc-500">
              This restores ₹{Number(item.amount || 0).toLocaleString("en-IN")} to the user&apos;s available earnings.
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-sm font-medium text-white">{item.userEmail || `User #${item.userId}`}</p>
          <p className="mt-1 text-xs text-zinc-500">{item.destinationLabel || item.paymentDetails || "—"}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white">
              Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Invalid UPI ID / bank details mismatch"
              disabled={busy}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={busy}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              <XCircle size={15} />
              {busy ? "Rejecting..." : "Reject request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

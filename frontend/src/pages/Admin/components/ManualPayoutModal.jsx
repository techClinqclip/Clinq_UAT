import { useState } from "react";
import { Building2, CheckCircle2, Smartphone, X } from "lucide-react";

function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function ManualPayoutModal({
  open,
  item,
  busy = false,
  onClose,
  onConfirm,
}) {
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  if (!open || !item) return null;

  const isUpi = item.paymentMethod === "upi" || Boolean(item.upiId);
  const MethodIcon = isUpi ? Smartphone : Building2;

  const resetAndClose = () => {
    if (busy) return;
    setPaymentReference("");
    setNotes("");
    setConfirmed(false);
    setError("");
    onClose?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const reference = paymentReference.trim();
    if (!reference) {
      setError("UTR / payment reference is required for manual payout.");
      return;
    }
    if (!confirmed) {
      setError("Confirm that you have already transferred the money.");
      return;
    }
    setError("");
    onConfirm?.({
      transactionId: item.id,
      paymentReference: reference,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#131316] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Mark withdrawal as paid</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Record the offline transfer details after you have paid the user.
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

        <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">User</p>
              <p className="mt-1 text-sm font-medium text-white">{item.userEmail || `User #${item.userId}`}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Amount</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">{formatINR(item.amount)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                <MethodIcon size={16} className="text-violet-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  {isUpi ? "Pay to UPI" : "Pay to Bank Account"}
                </p>
                <p className="mt-1 text-sm text-zinc-300 break-all">
                  {item.destinationLabel || item.paymentDetails || "—"}
                </p>
                {item.destinationHint ? (
                  <p className="mt-1 text-xs text-zinc-500">{item.destinationHint}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white">
              UTR / Payment reference <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. 123456789012"
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-white">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any internal note about this payout"
              disabled={busy}
              className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none transition focus:border-violet-500"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={busy}
              className="mt-1"
            />
            <span className="text-sm leading-6 text-zinc-300">
              I confirm ₹{Number(item.amount || 0).toLocaleString("en-IN")} has already been transferred
              to this user&apos;s {isUpi ? "UPI ID" : "bank account"}.
            </span>
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <div className="flex justify-end gap-3 pt-1">
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {busy ? "Saving..." : "Mark as paid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

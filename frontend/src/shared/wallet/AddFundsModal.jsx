import { useState } from "react";
import { createPortal } from "react-dom";
import { X, IndianRupee, ShieldCheck, Loader2 } from "lucide-react";
import useToast from "../../hooks/useToast";
import useCurrentUser from "../../hooks/useCurrentUser";
import { startWalletTopUp } from "./razorpayCheckout";
import { notifyWalletBalanceChanged } from "./walletBalanceEvents";

/*
  Shared AddFundsModal — used by Brand wallet, navbar WalletChip, and
  Creator wallet. Opens Razorpay Checkout; does not collect card/UPI
  details in-app. Profile payment methods stay for withdrawals only.
*/

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000];
const MIN_AMOUNT = 500;

export default function AddFundsModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Add funds",
  subtitle = "Top up your wallet to launch and fund campaigns.",
  description = "Clinq wallet top-up",
}) {
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();
  const user = useCurrentUser();

  if (!isOpen) return null;

  const reset = () => setAmount("");

  const handleClose = () => {
    if (processing) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      showToast({ type: "error", message: "Enter an amount to add." });
      return;
    }
    if (value < MIN_AMOUNT) {
      showToast({
        type: "error",
        message: `Minimum top-up is ₹${MIN_AMOUNT.toLocaleString()}.`,
      });
      return;
    }

    setProcessing(true);
    try {
      const result = await startWalletTopUp({
        amount: value,
        userName: user?.full_name || user?.name || "",
        userEmail: user?.email || "",
        description,
      });
      reset();
      onClose();
      if (typeof result?.walletBalance === "number") {
        notifyWalletBalanceChanged(result.walletBalance);
      } else {
        notifyWalletBalanceChanged();
      }
      onSuccess?.(result);
      showToast({
        type: "success",
        message: `₹${Number(result.amount).toLocaleString()} added to your wallet.`,
      });
    } catch (error) {
      const message = error?.message || "Unable to complete payment.";
      if (!/cancelled/i.test(message)) {
        showToast({ type: "error", message });
      } else {
        // Cancelled/dismissed checkout — navbar may need to stay in sync
        // after any server-side fail marking.
        notifyWalletBalanceChanged();
      }
    } finally {
      setProcessing(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#131316] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={processing}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-white">Amount</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-violet-500">
              <IndianRupee size={16} className="text-zinc-500" />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={processing}
                className="w-full bg-transparent text-lg font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-60"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={processing}
                  onClick={() => setAmount(String(preset))}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    String(preset) === amount
                      ? "border-violet-500 bg-violet-500/10 text-violet-300"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  ₹{preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <ShieldCheck size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Pay securely with Razorpay</p>
              <p className="mt-1 text-xs text-zinc-500">
                UPI, cards, and netbanking are handled on Razorpay Checkout. We never store your card details.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Waiting for payment...
              </>
            ) : (
              `Add ₹${amount ? Number(amount).toLocaleString() : "0"}`
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import useToast from "../../../hooks/useToast";
import { api } from "../../../lib/api";

/*
  WithdrawModal — cash-out flow for the creator's earned balance.
  Uses the same /api/earnings/payout/request-payout/ endpoint as Clipper.
  Payment method is read-only from Profile > Payments.
*/

const MIN_DEFAULT = 2500;

function buildPayoutPayload(amount, profile) {
  const method =
    profile?.payment_method || profile?.onboarding_data?.paymentMethod || "";
  const normalized =
    method === "bank" || method === "bank_transfer" ? "bank_transfer" : method;

  if (normalized === "upi") {
    const upiId = profile?.upi_id || profile?.onboarding_data?.upiId;
    return {
      amount,
      payoutMethod: "upi",
      upiId,
    };
  }

  if (normalized === "bank_transfer") {
    return {
      amount,
      payoutMethod: "bank_transfer",
      bankAccountHolder:
        profile?.bank_account_holder || profile?.onboarding_data?.bankAccountHolder,
      bankAccountNumber:
        profile?.bank_account_number || profile?.onboarding_data?.bankAccountNumber,
      bankIfsc: profile?.bank_ifsc || profile?.onboarding_data?.bankIfsc,
      bankName: profile?.bank_name || profile?.onboarding_data?.bankName,
    };
  }

  return null;
}

export default function WithdrawModal({
  isOpen,
  onClose,
  availableBalance,
  minimumWithdrawal = MIN_DEFAULT,
  savedMethod,
  profile,
  onSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const reset = () => setAmount("");

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const goToPaymentSettings = () => {
    reset();
    onClose();
    navigate("/creator/profile?tab=payments");
  };

  const value = Number(amount) || 0;
  const withdrawableMethod =
    savedMethod?.method === "upi" ||
    savedMethod?.method === "bank" ||
    savedMethod?.method === "bank_transfer";
  const isValid =
    !!savedMethod &&
    withdrawableMethod &&
    value >= minimumWithdrawal &&
    value <= availableBalance;
  const MethodIcon = savedMethod?.icon || AlertCircle;

  const quickSelect = (val) => {
    if (val === "all") {
      setAmount(String(Math.max(0, Math.floor(availableBalance))));
      return;
    }
    setAmount(String(Math.max(0, val)));
  };

  const handleAmountChange = (e) => {
    const nextAmount = e.target.value;
    if (nextAmount === "") {
      setAmount("");
      return;
    }

    const nextValue = Number(nextAmount);
    if (Number.isNaN(nextValue)) return;
    setAmount(String(Math.max(0, nextValue)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number.isNaN(value) || value <= 0) {
      showToast({ type: "error", message: "Enter an amount to withdraw." });
      return;
    }
    if (!savedMethod) {
      showToast({ type: "error", message: "Add a payment method in your profile first." });
      return;
    }
    if (!withdrawableMethod) {
      showToast({
        type: "error",
        message: "Withdrawals support UPI or bank transfer. Update your payment method in profile.",
      });
      return;
    }
    if (value < minimumWithdrawal) {
      showToast({
        type: "error",
        message: `Minimum withdrawal is ₹${minimumWithdrawal.toLocaleString()}.`,
      });
      return;
    }
    if (value > availableBalance) {
      showToast({ type: "error", message: "You can't withdraw more than your available balance." });
      return;
    }

    const payload = buildPayoutPayload(value, profile);
    if (!payload) {
      showToast({
        type: "error",
        message: "Withdrawals support UPI or bank transfer. Update your payment method in profile.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await api("/api/earnings/payout/request-payout/", {
        method: "POST",
        body: payload,
      });
      reset();
      onClose();
      onSuccess?.(result);
      showToast({
        type: "success",
        message:
          result?.message ||
          `₹${value.toLocaleString()} withdrawal requested via ${savedMethod?.label || "your payment method"}.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        message: error?.message || "Unable to request a withdrawal right now.",
      });
    } finally {
      setSubmitting(false);
    }
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
            <h3 className="text-lg font-semibold text-white">Withdraw earnings</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Send your available balance to your payment method.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Amount</label>
              <span className="text-xs text-zinc-500">
                Available: ₹{Number(availableBalance || 0).toLocaleString()}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-violet-500">
              <span className="text-zinc-500">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="0"
                value={amount}
                onChange={handleAmountChange}
                onWheel={(e) => e.currentTarget.blur()}
                disabled={submitting}
                className="w-full bg-transparent text-lg font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[2500, 5000, 10000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => quickSelect(val)}
                  disabled={submitting}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    String(val) === amount
                      ? "border-violet-500 bg-violet-500/10 text-violet-300"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  ₹{val.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => quickSelect("all")}
                disabled={submitting}
                className="rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500"
              >
                Withdraw all
              </button>
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              Minimum withdrawal: ₹{minimumWithdrawal.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-white">Payment method</label>

            {savedMethod ? (
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
                    <MethodIcon size={16} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{savedMethod.label}</p>
                    <p className="text-xs text-zinc-500">{savedMethod.detail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={goToPaymentSettings}
                  className="text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <div className="flex items-center gap-2.5 text-amber-300">
                  <AlertCircle size={16} className="shrink-0" />
                  <p className="text-xs">No payment method saved yet.</p>
                </div>
                <button
                  type="button"
                  onClick={goToPaymentSettings}
                  className="shrink-0 text-xs font-medium text-violet-400 hover:text-violet-300"
                >
                  Add one
                </button>
              </div>
            )}

            {savedMethod && !withdrawableMethod && (
              <p className="mt-2 text-xs text-amber-300">
                Card payouts aren&apos;t supported. Switch to UPI or bank transfer in profile.
              </p>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            Requests are processed within 1–3 business days to your verified payment method.
          </p>

          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Requesting..."
              : `Withdraw ₹${amount ? Number(amount).toLocaleString() : "0"}`}
          </button>
        </form>
      </div>
    </div>
  );
}

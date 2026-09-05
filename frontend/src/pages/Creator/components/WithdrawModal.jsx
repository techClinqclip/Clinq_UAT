import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import ProcessingModal from "../../../shared/ui/ProcessingModal"; // ADJUST to match this file's actual path
import useToast from "../../../hooks/useToast"; // ADJUST to match this file's actual path

/*
  WithdrawModal — cash-out flow for the creator's earned balance, sibling
  to AddFundsModal and TransferToCampaignModal so all three money-movement
  actions on the wallet page share one interaction pattern (modal, preset
  amounts, saved-method reflection, ProcessingModal on submit).

  Like AddFundsModal, this reflects whatever payment method is saved on
  Profile > Payments read-only — it doesn't let the person pick between
  methods here, since only one is stored at a time. See
  getSavedPaymentMethodDisplay() in CreatorWallet.jsx for how that's built.

  Props:
    isOpen, onClose
    availableBalance    — number, the creator's current withdrawable balance
    minimumWithdrawal    — number, smallest amount allowed
    savedMethod          — { method, label, detail, icon } | null
    onSuccess(amount)    — called once the (simulated) withdrawal completes
*/

const MIN_DEFAULT = 500;

export default function WithdrawModal({ isOpen, onClose, availableBalance, minimumWithdrawal = MIN_DEFAULT, savedMethod, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const reset = () => setAmount("");

  const handleClose = () => {
    if (processing) return;
    reset();
    onClose();
  };

  const goToPaymentSettings = () => {
    reset();
    onClose();
    navigate("/creator/profile?tab=payments");
  };

  const value = Number(amount) || 0;
  const isValid = !!savedMethod && value >= minimumWithdrawal && value <= availableBalance;
  const MethodIcon = savedMethod?.icon || AlertCircle;

  const quickSelect = (val) => {
    if (val === "all") {
      setAmount(String(availableBalance));
      return;
    }
    setAmount(String(val));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number.isNaN(value) || value <= 0) {
      showToast({ type: "error", message: "Enter an amount to withdraw." });
      return;
    }
    if (!savedMethod) {
      showToast({ type: "error", message: "Add a payment method in your profile first." });
      return;
    }
    if (value < minimumWithdrawal) {
      showToast({ type: "error", message: `Minimum withdrawal is ₹${minimumWithdrawal.toLocaleString()}.` });
      return;
    }
    if (value > availableBalance) {
      showToast({ type: "error", message: "You can't withdraw more than your available balance." });
      return;
    }
    setProcessing(true);
  };

  return (
    <>
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
              <p className="mt-1 text-sm text-zinc-500">Send your available balance to your payment method.</p>
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
                <span className="text-xs text-zinc-500">Available: ₹{availableBalance.toLocaleString()}</span>
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 focus-within:border-violet-500">
                <span className="text-zinc-500">₹</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[500, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => quickSelect(val)}
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
                  className="rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500"
                >
                  Withdraw all
                </button>
              </div>

              <p className="mt-2 text-xs text-zinc-500">Minimum withdrawal: ₹{minimumWithdrawal.toLocaleString()}</p>
            </div>

            {/* Payment method — reflects Profile, never picked here */}
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
            </div>

            <p className="text-xs text-zinc-500">
              Requests are processed within 1–3 business days to your verified payment method.
            </p>

            <button
              type="submit"
              disabled={!isValid}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Withdraw ₹{amount ? Number(amount).toLocaleString() : "0"}
            </button>
          </form>
        </div>
      </div>

      <ProcessingModal
        isOpen={processing}
        title="Processing withdrawal"
        steps={["Verifying balance", `Sending to ${savedMethod?.label || "payment method"}`, "Updating wallet balance"]}
        onComplete={() => {
          setProcessing(false);
          reset();
          onClose();
          onSuccess?.(value);
          showToast({
            type: "success",
            message: `₹${value.toLocaleString()} withdrawal requested via ${savedMethod?.label || "your payment method"}.`,
          });
        }}
      />
    </>
  );
}
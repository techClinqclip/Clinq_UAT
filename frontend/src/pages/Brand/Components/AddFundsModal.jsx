import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";
import { X, IndianRupee, Smartphone, Building2, CreditCard, AlertCircle } from "lucide-react";
import ProcessingModal from "../../../shared/ui/ProcessingModal"; // ADJUST to match this file's actual path
import useToast from "../../../hooks/useToast"; // ADJUST to match this file's actual path

/*
  AddFundsModal — top-up flow for the brand wallet.

  IMPORTANT: this modal does NOT offer a payment-method picker. Your
  Profile > Payments tab only ever stores ONE active method at a time
  (paymentMethod: "upi" | "bank" | "debit" | "credit", with just that
  method's details saved) — there's nothing to "pick between" in here.
  So this just reflects whatever's saved there, read-only, with a
  "Change" link that sends them to Profile to update it. If nothing's
  saved yet, it shows an explicit empty state instead of letting them
  submit into a method that doesn't exist.

  Also deliberately still doesn't collect card details directly — a
  one-off top-up should hand off to your payment gateway's own hosted
  checkout (Razorpay/Stripe/etc.), not re-enter card data through your
  own form. `savedMethod.detail` for a card is just a masked "last 4"
  label, sourced from the Profile page, not raw card data.

  Props:
    isOpen, onClose
    onSuccess(amount)   — called after the (simulated) top-up completes
    savedMethod         — { method, label, detail, icon } | null
                          Build this from the brand's profile — see
                          getSavedPaymentMethodDisplay() in BrandWallet.jsx
                          for the exact shape/derivation.
*/

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000];
const MIN_AMOUNT = 500;

export default function AddFundsModal({ isOpen, onClose, onSuccess, savedMethod }) {
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const reset = () => setAmount("");

  const handleClose = () => {
    if (processing) return; // don't let them dismiss mid-payment
    reset();
    onClose();
  };

  const goToPaymentSettings = () => {
    reset();
    onClose();
    navigate("/brand/profile?tab=payments");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!amount || Number.isNaN(value) || value <= 0) {
      showToast({ type: "error", message: "Enter an amount to add." });
      return;
    }
    if (value < MIN_AMOUNT) {
      showToast({ type: "error", message: `Minimum top-up is ₹${MIN_AMOUNT.toLocaleString()}.` });
      return;
    }
    if (!savedMethod) {
      showToast({ type: "error", message: "Add a payment method in your profile first." });
      return;
    }
    setProcessing(true);
  };

  const MethodIcon = savedMethod?.icon || Smartphone;

  // This modal can be opened from the sticky navbar. Rendering it at the document
  // root prevents the navbar's layout context from offsetting or clipping the overlay.
  return createPortal(
    <>
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
              <h3 className="text-lg font-semibold text-white">Add funds</h3>
              <p className="mt-1 text-sm text-zinc-500">Top up your wallet to launch and fund campaigns.</p>
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
                  className="w-full bg-transparent text-lg font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
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
              Payments are processed securely through our payment partner. Funds are usually available
              instantly for UPI and cards, and within 1–2 business days for bank transfers.
            </p>

            <button
              type="submit"
              disabled={!savedMethod}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add ₹{amount ? Number(amount).toLocaleString() : "0"}
            </button>
          </form>
        </div>
      </div>

      <ProcessingModal
        isOpen={processing}
        title="Adding funds"
        steps={[`Contacting ${savedMethod?.label || "payment gateway"}`, "Confirming payment", "Updating wallet balance"]}
        onComplete={() => {
          const value = Number(amount);
          setProcessing(false);
          reset();
          onClose();
          onSuccess?.(value);
          showToast({ type: "success", message: `₹${value.toLocaleString()} added to your wallet.` });
        }}
      />
    </>,
    document.body
  );
}

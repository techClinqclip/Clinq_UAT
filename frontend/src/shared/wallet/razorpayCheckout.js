import { api } from "../../lib/api";

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only run in the browser."));
  }
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout.")));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.body.appendChild(script);
  });
}

/**
 * Shared wallet top-up flow for Brand / Creator dashboards.
 * 1) Create order on our API
 * 2) Open Razorpay Checkout
 * 3) Confirm payment signature on our API (credits wallet)
 */
export async function startWalletTopUp({
  amount,
  userName = "",
  userEmail = "",
  description = "Clinq wallet top-up",
} = {}) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Enter a valid amount.");
  }

  const order = await api("/api/earnings/wallet/create-topup/", {
    method: "POST",
    body: { amount: value },
  });

  const Razorpay = await loadRazorpayScript();

  const paymentResult = await new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      amount: order.amountPaise,
      currency: order.currency || "INR",
      name: "Clinq",
      description,
      order_id: order.orderId,
      prefill: {
        name: userName || undefined,
        email: userEmail || undefined,
      },
      theme: { color: "#7c3aed" },
      handler: (response) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
    });

    checkout.on("payment.failed", (response) => {
      const message =
        response?.error?.description
        || response?.error?.reason
        || "Payment failed. Please try again.";
      reject(new Error(message));
    });

    checkout.open();
  });

  const confirmed = await api("/api/earnings/wallet/confirm-topup/", {
    method: "POST",
    body: {
      razorpayOrderId: paymentResult.razorpay_order_id,
      razorpayPaymentId: paymentResult.razorpay_payment_id,
      razorpaySignature: paymentResult.razorpay_signature,
    },
  });

  return {
    amount: Number(confirmed.amount ?? value),
    walletBalance: Number(confirmed.walletBalance ?? 0),
    totalDeposited: Number(confirmed.totalDeposited ?? 0),
    transactionId: confirmed.transactionId,
    orderId: confirmed.orderId || order.orderId,
  };
}

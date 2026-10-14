import { api } from "../../lib/api";
import { syncPendingWalletTopups } from "./syncPendingTopups";

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const PENDING_TOPUP_KEY = "clinq_pending_wallet_topup";

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

async function markTopUpFailed(orderId, reason) {
  if (!orderId) return;
  try {
    await api("/api/earnings/wallet/fail-topup/", {
      method: "POST",
      body: {
        razorpayOrderId: orderId,
        reason: reason || "Payment cancelled or failed.",
      },
    });
  } catch (error) {
    console.warn("[wallet] fail-topup failed", error?.message || error);
  }
  try {
    sessionStorage.removeItem(PENDING_TOPUP_KEY);
  } catch {
    // ignore
  }
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

  try {
    sessionStorage.setItem(
      PENDING_TOPUP_KEY,
      JSON.stringify({
        orderId: order.orderId,
        amount: value,
        createdAt: Date.now(),
      }),
    );
  } catch {
    // ignore storage failures
  }

  const Razorpay = await loadRazorpayScript();

  let paymentResult;
  try {
    paymentResult = await new Promise((resolve, reject) => {
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
  } catch (checkoutError) {
    const message = checkoutError?.message || "Payment failed.";
    await markTopUpFailed(
      order.orderId,
      /cancelled/i.test(message) ? "Checkout dismissed by user." : message,
    );
    throw checkoutError;
  }

  try {
    const confirmed = await api("/api/earnings/wallet/confirm-topup/", {
      method: "POST",
      body: {
        razorpayOrderId: paymentResult.razorpay_order_id,
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpaySignature: paymentResult.razorpay_signature,
      },
    });

    try {
      sessionStorage.removeItem(PENDING_TOPUP_KEY);
    } catch {
      // ignore
    }

    return {
      amount: Number(confirmed.amount ?? value),
      walletBalance: Number(confirmed.walletBalance ?? 0),
      totalDeposited: Number(confirmed.totalDeposited ?? 0),
      transactionId: confirmed.transactionId,
      orderId: confirmed.orderId || order.orderId,
    };
  } catch (confirmError) {
    // Money may already be captured on Razorpay. Ask API to reconcile.
    const synced = await syncPendingWalletTopups();
    if (synced?.creditedCount > 0) {
      try {
        sessionStorage.removeItem(PENDING_TOPUP_KEY);
      } catch {
        // ignore
      }
      const credited = synced.credited?.[0];
      return {
        amount: Number(credited?.amount ?? value),
        walletBalance: Number(synced.walletBalance ?? 0),
        totalDeposited: Number(synced.totalDeposited ?? 0),
        transactionId: credited?.transactionId,
        orderId: credited?.orderId || order.orderId,
        recovered: true,
      };
    }
    throw confirmError;
  }
}

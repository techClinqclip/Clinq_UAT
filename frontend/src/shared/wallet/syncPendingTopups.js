import { api } from "../../lib/api";

/**
 * Ask the API to credit any deposits Razorpay already captured
 * (browser closed / offline after pay, before confirm finished).
 * Safe to call on every wallet page load.
 */
export async function syncPendingWalletTopups() {
  try {
    return await api("/api/earnings/wallet/sync-topups/", { method: "POST" });
  } catch (error) {
    // Non-blocking: wallet can still load even if sync fails.
    console.warn("[wallet] sync-topups failed", error?.message || error);
    return null;
  }
}

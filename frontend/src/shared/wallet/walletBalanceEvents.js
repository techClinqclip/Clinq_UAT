/** Cross-component wallet balance sync (navbar chip ↔ wallet pages). */

export const WALLET_BALANCE_EVENT = "clinq:wallet-balance-changed";

export function notifyWalletBalanceChanged(balance) {
  if (typeof window === "undefined") return;
  const value = Number(balance);
  window.dispatchEvent(
    new CustomEvent(WALLET_BALANCE_EVENT, {
      detail: {
        walletBalance: Number.isFinite(value) ? value : undefined,
        at: Date.now(),
      },
    }),
  );
}

export function subscribeWalletBalanceChanged(handler) {
  if (typeof window === "undefined") return () => {};
  const listener = (event) => handler(event.detail || {});
  window.addEventListener(WALLET_BALANCE_EVENT, listener);
  return () => window.removeEventListener(WALLET_BALANCE_EVENT, listener);
}

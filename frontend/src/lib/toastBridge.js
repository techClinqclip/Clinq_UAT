// Lets code outside React (like api.js) trigger toasts without needing a hook.
// Your ToastProvider registers its `showToast` function here once, on mount.
// Everything else just imports `notifyError` and calls it directly.

let registeredShowToast = null;

export function registerToastHandler(showToastFn) {
  registeredShowToast = showToastFn;
}

export function notifyError(message, opts = {}) {
  if (!registeredShowToast) return; // no-op if provider hasn't mounted yet
  registeredShowToast({ type: "error", message, ...opts });
}
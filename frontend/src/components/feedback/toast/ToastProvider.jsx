import { useCallback, useEffect, useMemo, useState } from "react";
import ToastContext from "./ToastContext";
import ToastContainer from "./ToastContainer";
import { registerToastHandler } from "../../../lib/toastBridge"; // adjust path to wherever you put toastBridge.js

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toastData) => {
    const toast = {
      id: crypto.randomUUID(),
      ...toastData,
    };

    setToasts((prev) => [...prev, toast]);
  }, []);

  // Lets non-component code (api.js) trigger toasts without needing a hook —
  // registered once, since showToast is a stable useCallback reference.
  useEffect(() => {
    registerToastHandler(showToast);
  }, [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      removeToast,
    }),
    [showToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}
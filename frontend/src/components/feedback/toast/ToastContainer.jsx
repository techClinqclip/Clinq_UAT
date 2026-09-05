import Toast from "./Toast";
import { AnimatePresence } from "framer-motion";

export default function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="pointer-events-none fixed top-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            removeToast={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
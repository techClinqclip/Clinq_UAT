import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

const variants = {
  success: {
    icon: CheckCircle2,
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    progress: "bg-emerald-500",
  },

  error: {
    icon: XCircle,
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    iconColor: "text-red-400",
    progress: "bg-red-500",
  },

  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    progress: "bg-amber-500",
  },

  info: {
    icon: Info,
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    iconColor: "text-cyan-400",
    progress: "bg-cyan-500",
  },
};

export default function Toast({ toast, removeToast }) {
  const timeoutRef = useRef(null);

  const {
    id,
    type = "info",
    title,
    message,
    duration = 4000,
  } = toast;

  const style = variants[type] || variants.info;
  const Icon = style.icon;

  useEffect(() => {
    if (duration <= 0) return;

    timeoutRef.current = setTimeout(() => {
      removeToast(id);
    }, duration);

    return () => clearTimeout(timeoutRef.current);
  }, [duration, id, removeToast]);

  const handleClose = () => {
    clearTimeout(timeoutRef.current);
    removeToast(id);
  };

  console.log("Toast component rendered");
  return (
    <motion.div
  layout
  initial={{
    opacity: 0,
    x: 60,
    scale: 0.95,
  }}
  animate={{
    opacity: 1,
    x: 0,
    scale: 1,
  }}
  exit={{
    opacity: 0,
    x: 60,
    scale: 0.95,
  }}
  transition={{
    duration: 0.25,
    ease: "easeOut",
  }}
  className={`
    pointer-events-auto
    overflow-hidden
    rounded-xl
    border
    ${style.border}
    bg-[#111118]/95
    backdrop-blur-xl
    shadow-[0_12px_40px_rgba(0,0,0,0.45)]
  `}
>
      <div className="flex items-start gap-3 p-4">
        <div className={`mt-0.5 rounded-full p-2 ${style.bg}`}>
          <Icon
            size={18}
            className={style.iconColor}
          />
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white">
            {title}
          </h4>

          {message && (
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              {message}
            </p>
          )}
        </div>

        <button
          onClick={handleClose}
          className="rounded-md p-1 text-zinc-500 transition hover:bg-white/5 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {duration > 0 && (
        <div className="h-1 w-full bg-white/5">
          <motion.div
            className={`h-full ${style.progress}`}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{
              duration: duration / 1000,
              ease: "linear",
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
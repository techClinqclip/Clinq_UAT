
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Check, X, Loader2 } from "lucide-react";

/**
 * Two ways to drive this:
 *
 * 1. AUTO (demo/no backend yet) — just pass `steps` and `mode="auto"`
 *    (the default). It self-progresses through each step on a timer.
 *
 *      <ProcessingModal
 *        isOpen={open}
 *        title="Creating your campaign"
 *        steps={["Uploading assets", "Setting up campaign", "Publishing"]}
 *        onComplete={() => { setOpen(false); navigate("/brand/campaigns"); }}
 *      />
 *
 * 2. CONTROLLED (once a real upload/API exists) — drive it yourself by
 *    passing `mode="controlled"` and updating `currentStepIndex` as your
 *    real async steps complete. Nothing else about the component changes.
 *
 *      <ProcessingModal
 *        isOpen={open}
 *        mode="controlled"
 *        title="Uploading resource"
 *        steps={["Uploading file", "Scanning", "Saving"]}
 *        currentStepIndex={uploadStepIndex} // -1 = not started, steps.length = done
 *        onComplete={() => setOpen(false)}
 *      />
 */
export default function ProcessingModal({
  isOpen,
  title = "Working on it...",
  steps = [],
  mode = "auto",
  currentStepIndex: controlledIndex,
  autoStepDuration = 1100,
  onComplete,
  allowCancel = false,
  onCancel,
}) {
  const [autoIndex, setAutoIndex] = useState(-1);
  const timerRef = useRef(null);

  const activeIndex = mode === "controlled" ? controlledIndex : autoIndex;
  const isDone = activeIndex >= steps.length;

  // Auto mode: step through on a timer.
  useEffect(() => {
    if (!isOpen || mode !== "auto") return;

    setAutoIndex(0);
    let i = 0;

    timerRef.current = setInterval(() => {
      i += 1;
      setAutoIndex(i);
      if (i >= steps.length) clearInterval(timerRef.current);
    }, autoStepDuration);

    return () => clearInterval(timerRef.current);
  }, [isOpen, mode, steps.length, autoStepDuration]);

  // Fire onComplete once, whichever mode got us there.
  useEffect(() => {
    if (isOpen && isDone) {
      const t = setTimeout(() => onComplete?.(), 900);
      return () => clearTimeout(t);
    }
  }, [isOpen, isDone, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] p-8 text-center shadow-2xl">
        {allowCancel && !isDone && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-xl p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        )}

        {/* Icon area: spinning ring while working, checkmark burst when done */}
        <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
          <AnimatePresence mode="wait">
            {!isDone ? (
              <motion.div
                key="working"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative flex h-20 w-20 items-center justify-center"
              >
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-dashed border-violet-500/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
                  <UploadCloud size={20} className="text-violet-400" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
                className="relative flex h-20 w-20 items-center justify-center"
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-emerald-500/15"
                  initial={{ scale: 0.6, opacity: 0.8 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check size={26} className="text-emerald-400" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <h3 className="mt-5 text-lg font-semibold text-white">
          {isDone ? "All done!" : title}
        </h3>

        {/* Step list */}
        {steps.length > 0 && (
          <div className="mt-6 space-y-2.5 text-left">
            {steps.map((step, i) => {
              const label = typeof step === "string" ? step : step.label;
              const status = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";

              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {status === "done" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20"
                      >
                        <Check size={11} className="text-emerald-400" />
                      </motion.div>
                    )}
                    {status === "active" && <Loader2 size={16} className="animate-spin text-violet-400" />}
                    {status === "pending" && <div className="h-1.5 w-1.5 rounded-full bg-white/15" />}
                  </div>
                  <span
                    className={`text-sm transition ${
                      status === "pending" ? "text-zinc-600" : status === "active" ? "text-white" : "text-zinc-400"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
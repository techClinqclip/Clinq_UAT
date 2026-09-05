import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedBackground from "./AnimatedBackground";

const DEFAULT_MESSAGES = [
  "Setting things up...",
  "Loading your marketplace...",
  "Fetching campaigns...",
  "Almost there...",
];

/**
 * Usage:
 *   const [ready, setReady] = useState(false);
 *   useEffect(() => { loadInitialData().then(() => setReady(true)); }, []);
 *   return <LoadingScreen isReady={ready} onFinish={() => setShowLoader(false)} />
 *
 * Progress creeps toward ~92% on its own (classic "never quite finishes"
 * loader feel) and only completes to 100% once isReady flips true — so it
 * never lies about being done before the real data actually is.
 */
export default function LoadingScreen({ isReady = false, messages = DEFAULT_MESSAGES, onFinish }) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const progressRef = useRef(0);

  // Creeping progress simulation — slows down as it approaches the cap,
  // never reaches 100 on its own.
  useEffect(() => {
    if (isReady) return;
    const interval = setInterval(() => {
      progressRef.current = Math.min(92, progressRef.current + (92 - progressRef.current) * 0.08 + 0.4);
      setProgress(progressRef.current);
    }, 120);
    return () => clearInterval(interval);
  }, [isReady]);

  // Rotate status messages.
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Once real data is ready, snap to 100% then fade out.
  useEffect(() => {
    if (!isReady) return;
    progressRef.current = 100;
    setProgress(100);
    const timer = setTimeout(() => setExiting(true), 450);
    return () => clearTimeout(timer);
  }, [isReady]);

  return (
    <AnimatePresence onExitComplete={onFinish}>
      {!exiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
        >
          <AnimatedBackground />

          <div className="flex w-full max-w-xs flex-col items-center text-center">
            {/* Pulsing logo mark */}
            <div className="relative flex h-20 w-20 items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-violet-500/30"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-fuchsia-500/30"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
                <span className="text-xl font-bold text-white">C</span>
              </div>
            </div>

            <h1 className="mt-6 text-xl font-bold text-white">
              Clinq<span className="text-violet-400">.</span>
            </h1>

            {/* Progress bar */}
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.15, ease: "linear" }}
              />
            </div>

            {/* Rotating status message */}
            <div className="mt-4 h-5 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-zinc-500"
                >
                  {messages[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
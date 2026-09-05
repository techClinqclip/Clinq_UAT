import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * Mount once near the root (e.g. main.jsx). No props.
 * Always mounted — animates via transform, so it never pops in/out of
 * the DOM and never causes layout shift. Styled to match the app's
 * dark/violet "production HUD" aesthetic (see ComingSoon.jsx).
 */
export default function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const reconnectTimerRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => setShowReconnected(false), 2500);
    };

    const handleOffline = () => {
      clearTimeout(reconnectTimerRef.current);
      setShowReconnected(false);
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  const visible = !isOnline || showReconnected;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-[100] flex justify-center pointer-events-none
        transition-transform duration-300 ease-out
        ${visible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div
        className={`pointer-events-auto mt-4 flex items-center gap-3 overflow-hidden rounded-full
          border backdrop-blur-xl px-4 py-2 shadow-2xl transition-colors duration-300
          ${
            isOnline
              ? "border-emerald-500/20 bg-emerald-500/[0.08]"
              : "border-violet-500/20 bg-white/[0.03]"
          }`}
      >
        {/* pulsing status dot, same construction as the REC indicator */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
              isOnline ? "bg-emerald-500/60" : "bg-red-500/60"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
        </span>

        {isOnline ? (
          <Wifi size={14} className="shrink-0 text-emerald-400" />
        ) : (
          <WifiOff size={14} className="shrink-0 text-violet-400" />
        )}

        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-300">
          {isOnline ? "Back online" : "No signal"}
        </span>

        {!isOnline && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
            · Reconnecting
          </span>
        )}
      </div>
    </div>
  );
}
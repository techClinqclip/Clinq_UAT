import { AlertTriangle, Clock3, LockKeyhole, RefreshCw, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Centralized error display — every page that fetches data should render
 * this instead of hand-rolling its own error block. Reads `error.status`
 * (attached by api.js on every thrown error) to pick the right icon, tone,
 * and whether a retry makes sense at all.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useSomething();
 *   if (error) return <ErrorState error={error} onRetry={refetch} />;
 *
 * `error` can be an Error instance (with optional .status) or a plain
 * string message — both are handled.
 */
export default function ErrorState({ error, onRetry, className = "" }) {
  if (!error) return null;

  const status = typeof error === "object" ? error.status : null;
  const message = typeof error === "object" ? error.message : String(error);

  const isSessionExpired = status === 401 || /session has expired|sign in again/i.test(message || "");
  const isThrottled = status === 429;
  const isServerError = status >= 500;
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  const config = isOffline
    ? {
        icon: WifiOff,
        tone: "amber",
        title: "You're offline",
        body: "Check your connection and try again.",
        showRetry: true,
      }
    : isSessionExpired
    ? {
        icon: LockKeyhole,
        tone: "violet",
        title: "Your session has expired",
        body: "Please sign in again to continue.",
        showRetry: false,
        action: (
          <Link
            to="/login"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            Sign in
          </Link>
        ),
      }
    : isThrottled
    ? {
        icon: Clock3,
        tone: "amber",
        title: "Slow down a little",
        body: message || "You're doing that a bit too fast. Please wait a moment and try again.",
        // Retrying immediately would just get throttled again — no button.
        showRetry: false,
      }
    : isServerError
    ? {
        icon: AlertTriangle,
        tone: "rose",
        title: "Something went wrong on our end",
        body: message || "Please try again in a moment.",
        showRetry: true,
      }
    : {
        icon: AlertTriangle,
        tone: "rose",
        title: "Couldn't load this",
        body: message || "Please try again.",
        showRetry: true,
      };

  const toneStyles = {
    rose: { border: "border-rose-500/20", bg: "bg-rose-500/5", iconBg: "bg-rose-500/10", iconText: "text-rose-400" },
    amber: { border: "border-amber-500/20", bg: "bg-amber-500/5", iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
    violet: { border: "border-violet-500/20", bg: "bg-violet-500/5", iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
  };
  const t = toneStyles[config.tone];
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border ${t.border} ${t.bg} px-6 py-14 text-center ${className}`}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${t.iconBg}`}>
        <Icon size={20} className={t.iconText} />
      </div>
      <p className="font-semibold text-white">{config.title}</p>
      <p className="max-w-sm text-sm text-zinc-400">{config.body}</p>

      {config.action}

      {config.showRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/5"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      )}
    </div>
  );
}
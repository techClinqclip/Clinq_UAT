import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import useToast from "../hooks/useToast";
import { api } from "../lib/api";

function useTimecode() {
  const [frames, setFrames] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrames((f) => f + 1), 100);
    return () => clearInterval(id);
  }, []);
  const totalSeconds = Math.floor(frames / 10);
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  const f = String(frames % 10).padStart(2, "0");
  return `00:${m}:${s}:${f}`;
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const RESEND_COOLDOWN = 30; // seconds

export default function ForgotPassword() {
  const { showToast } = useToast();
  const timecode = useTimecode();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const submitReset = async () => {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api('/api/auth/password/forgot/', {
        method: 'POST',
        body: { email },
        silent: true,
      });

      setSent(true);
      setCooldown(RESEND_COOLDOWN);
      showToast({
        type: "success",
        title: "Check your inbox",
        message: `If an account exists for ${email}, we've sent a reset link.`,
      });
    } catch (err) {
      const message = err?.message || "Couldn't send the reset link. Try again.";
      setError(message);
      showToast({
        type: "error",
        title: "Something went wrong",
        message: "Couldn't send the reset link. Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitReset();
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    submitReset();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0F] px-6 py-10">

      {/* ambient texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[150px]" />

      {/* REC HUD */}
      <div className="absolute right-6 top-6 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs tracking-widest text-zinc-400 sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        REC
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300">{timecode}</span>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-y-0 left-0 hidden w-6 flex-col items-center justify-evenly border-r border-white/5 bg-black/30 sm:flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/10" />
          ))}
        </div>

        <div className="p-8 sm:pl-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">
              Clinq<span className="text-violet-400">.</span>
            </h1>

            {sent ? (
              <>
                <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 size={26} className="text-emerald-400" />
                </div>
                <h2 className="mt-4 text-2xl font-bold text-white">Check your email</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  We sent a password reset link to<br />
                  <span className="font-medium text-zinc-200">{email}</span>
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-6 text-2xl font-bold text-white">Forgot password?</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Enter your email and we'll send you a reset link.
                </p>
              </>
            )}
          </div>

          {sent ? (
            <div className="mt-7 space-y-4">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </button>

              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                <ArrowLeft size={15} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Email
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="john@example.com"
                    className={`w-full rounded-lg border bg-white/[0.03] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${
                      error
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                        : "border-white/10 focus:border-violet-400/60 focus:ring-violet-400/20"
                    }`}
                  />
                </div>
                {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Sending…" : "Send reset link"}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 pt-1 text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
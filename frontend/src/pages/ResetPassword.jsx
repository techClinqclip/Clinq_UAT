import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, Lock } from "lucide-react";
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

const MIN_LENGTH = 8;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const timecode = useTimecode();

  // In production this token comes from the reset link Forgot Password
  // emailed out (e.g. /reset-password?token=...) and gets validated
  // server-side on submit. No backend yet, so it's just read here for
  // when that wiring happens.
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const next = {};
    if (!password) next.password = "Password is required.";
    else if (password.length < MIN_LENGTH) next.password = `Use at least ${MIN_LENGTH} characters.`;

    if (!confirmPassword) next.confirmPassword = "Please confirm your password.";
    else if (password && confirmPassword !== password) next.confirmPassword = "Passwords don't match.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!token) {
      showToast({
        type: "error",
        title: "Missing token",
        message: "This reset link is invalid or incomplete.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api('/api/auth/password/reset/', {
        method: 'POST',
        body: { token, password },
        silent: true,
      });

      setSuccess(true);
      showToast({
        type: "success",
        title: "Password updated",
        message: "You can now sign in with your new password.",
      });
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      const message = err?.message || 'That reset link may have expired. Request a new one.';
      showToast({
        type: "error",
        title: "Something went wrong",
        message,
      });
      showToast({
        type: "error",
        title: "Something went wrong",
        message: "That reset link may have expired. Request a new one.",
      });
    } finally {
      setIsSubmitting(false);
    }
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

            {success ? (
              <>
                <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 size={26} className="text-emerald-400" />
                </div>
                <h2 className="mt-4 text-2xl font-bold text-white">Password updated</h2>
                <p className="mt-2 text-sm text-zinc-400">Redirecting you to sign in…</p>
              </>
            ) : (
              <>
                <h2 className="mt-6 text-2xl font-bold text-white">Set a new password</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Choose a new password for your account.
                </p>
              </>
            )}
          </div>

          {!success && (
            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
              {/* New password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  New password
                </label>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••"
                    className={`w-full rounded-lg border bg-white/[0.03] py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${
                      errors.password
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                        : "border-white/10 focus:border-violet-400/60 focus:ring-violet-400/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>
                ) : (
                  <p className="mt-1.5 text-xs text-zinc-600">At least {MIN_LENGTH} characters.</p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="••••••••"
                    className={`w-full rounded-lg border bg-white/[0.03] py-2.5 pl-10 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${
                      errors.confirmPassword
                        ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                        : "border-white/10 focus:border-violet-400/60 focus:ring-violet-400/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? "Updating…" : "Update password"}
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
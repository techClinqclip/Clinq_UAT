import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, Loader2, ArrowLeft } from "lucide-react";
import useToast from "../hooks/useToast";
import { api, loginWithGoogle, setAuthStorage } from "../lib/api";
import {
  getOnboardingRedirectPath,
  getRoleFromPayload,
} from "../lib/auth";

const roleConfig = {
  clipper: { title: "Creating a Clipper Account", description: "Start earning rewards by creating engaging clips.", accent: "amber" },
  creator: { title: "Creating a Creator Account", description: "Grow your audience through community-powered clipping.", accent: "violet" },
  brand: { title: "Creating a Brand Account", description: "Launch campaigns and scale your content reach.", accent: "cyan" },
};

const accentStyles = {
  violet: { badgeBorder: "border-violet-500/20", badgeBg: "bg-violet-500/10", badgeText: "text-violet-400", focus: "focus:border-violet-400/60 focus:ring-violet-400/20", solidBtn: "bg-violet-600 hover:bg-violet-500", dot: "text-violet-400", glow: "bg-violet-600/20" },
  amber: { badgeBorder: "border-amber-500/20", badgeBg: "bg-amber-500/10", badgeText: "text-amber-400", focus: "focus:border-amber-400/60 focus:ring-amber-400/20", solidBtn: "bg-amber-500 hover:bg-amber-400", dot: "text-amber-400", glow: "bg-amber-600/20" },
  cyan: { badgeBorder: "border-cyan-500/20", badgeBg: "bg-cyan-500/10", badgeText: "text-cyan-400", focus: "focus:border-cyan-400/60 focus:ring-cyan-400/20", solidBtn: "bg-cyan-500 hover:bg-cyan-400", dot: "text-cyan-400", glow: "bg-cyan-600/20" },
};

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

function OtpInput({ length = 6, value, onChange, accent, hasError }) {
  const refs = useRef([]);

  const setDigit = (index, digit) => {
    const chars = value.split("");
    chars[index] = digit;
    onChange(chars.join("").slice(0, length));
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`h-12 w-11 rounded-lg border bg-white/[0.03] text-center text-lg font-semibold text-white outline-none transition focus:bg-white/[0.05] focus:ring-2 ${hasError
              ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
              : `border-white/10 ${accentStyles[accent].focus}`
            }`}
        />
      ))}
    </div>
  );
}

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get("role") || "";
  const hasRole = Boolean(roleConfig[role]);
  const currentRole = roleConfig[role] || {
    title: "",
    description: "Sign up to get started with Clinq.",
    accent: "violet", // neutral default accent when no role is known yet
  };

  const a = accentStyles[currentRole.accent];
  const timecode = useTimecode();
  const { showToast } = useToast();

  const [step, setStep] = useState("form"); // "form" | "otp"

  // Form step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP step
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Password strength rules — checked live as the user types, and
  // enforced (not just length >= 8) before we let them proceed to OTP.
  const passwordRules = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const passwordIsStrong = Object.values(passwordRules).every(Boolean);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const validateForm = () => {
    const next = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (!passwordIsStrong)
      next.password = "Include uppercase, lowercase, a number, and a special character.";
    if (!confirmPassword) next.confirmPassword = "Please confirm your password.";
    else if (confirmPassword !== password) next.confirmPassword = "Passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await api('/api/auth/otp/send/', {
        method: 'POST',
        body: { email },
      });

      setCooldown(30);
      setStep('otp');
      showToast({ type: "success", message: `We sent a code to ${email}.` });
    } catch (err) {
      const message = err?.message || 'Something went wrong creating your account. Please try again.';
      showToast({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setOtpError(true);
      showToast({ type: "error", message: "Enter the full 6-digit code." });
      return;
    }

    // guard against stale/mismatched password state (e.g. user hit Back
    // and edited the password without re-matching confirmPassword) —
    // catch it here instead of letting register() fail and showing a
    // confusing "Incorrect code" toast after a correct OTP
    if (!validateForm()) {
      setStep("form");
      showToast({ type: "error", message: "Please fix your password before continuing." });
      return;
    }

    setIsVerifying(true);
    setOtpError(false);
    try {
      await api('/api/auth/otp/verify/', {
        method: 'POST',
        body: { email, otp },
      });

      const payload = await api('/api/auth/register/', {
        method: 'POST',
        body: {
          email,
          password,
          password2: confirmPassword,
          ...(hasRole ? { role } : {}),
        },
      });

      setAuthStorage(payload);

      showToast({ type: "success", message: "Welcome to Clinq!" });

      // don't trust the backend's default role when the user never
      // picked one — force them to role selection in that case
      const userType = hasRole ? role : null;

      navigate(
        getOnboardingRedirectPath({
          userType,
          profile: null,
        }),
        { replace: true }
      );
      // (removed the dead `navigate(onboardingPath, ...)` line below this —
      // onboardingPath was never defined, so it threw and got caught,
      // showing a false "Incorrect code" toast after a successful signup)
    } catch (err) {
      setOtpError(true);
      showToast({ type: "error", message: err?.message || "Incorrect code. Please try again." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    try {
      await api('/api/auth/otp/send/', {
        method: 'POST',
        body: { email },
      });
      setIsResending(false);
      setCooldown(30);
      setOtp("");
      setOtpError(false);
      showToast({ type: "success", message: "Code resent." });
    } catch (err) {
      showToast({ type: "error", message: err?.message || 'Unable to resend the code.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0F] px-6 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className={`pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full blur-[150px] ${a.glow}`} />

      <div className="flex absolute right-6 top-6 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs tracking-widest text-zinc-400 sm:flex">
    
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        REC
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300">{timecode}</span>
      </div>
      <button
  onClick={() => navigate(-1)}
  className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 md:text-sm"
>
  <ArrowLeft size={16} />
  Back
</button>

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-y-0 left-0 hidden w-6 flex-col items-center justify-evenly border-r border-white/5 bg-black/30 sm:flex">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/10" />
          ))}
        </div>

        <div className="p-8 sm:pl-12">
          {step === "form" ? (
            <>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-white">
                  Clinq<span className={a.dot}>.</span>
                </h1>
                {hasRole && (
                  <div className={`mt-5 inline-flex rounded-full border px-4 py-1.5 text-xs font-medium ${a.badgeBorder} ${a.badgeBg} ${a.badgeText}`}>
                    {currentRole.title}
                  </div>
                )}
                <h2 className={`${hasRole ? "mt-5" : "mt-6"} text-2xl font-bold text-white`}>Create your account</h2>
                <p className="mt-2 text-sm text-zinc-400">{currentRole.description}</p>
              </div>

              <form onSubmit={handleCreateAccount} noValidate className="mt-7 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors((prev) => ({
                          ...prev,
                          email: "",
                        }));
                      }
                    }}
                    placeholder="john@example.com"
                    className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${errors.email ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20" : `border-white/10 ${a.focus}`
                      }`}
                  />
                  {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: "",
                          }));
                        }
                      }}
                      placeholder="••••••••"
                      className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${errors.password ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20" : `border-white/10 ${a.focus}`
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                      {[
                        ["length", "8+ characters"],
                        ["lowercase", "Lowercase letter"],
                        ["uppercase", "Uppercase letter"],
                        ["number", "Number"],
                        ["special", "Special character"],
                      ].map(([key, label]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <Check size={12} className={passwordRules[key] ? a.dot : "text-zinc-700"} />
                          <span className={`text-[11px] ${passwordRules[key] ? "text-zinc-400" : "text-zinc-600"}`}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Confirm password
                  </label>
                  <div className="relative">
                  <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          setErrors((prev) => ({
                            ...prev,
                            confirmPassword: "",
                          }));
                        }
                      }}
                      placeholder="••••••••"
                      className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${errors.confirmPassword ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20" : `border-white/10 ${a.focus}`
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-400">{errors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-[#0A0A0F] transition disabled:cursor-not-allowed disabled:opacity-60 ${a.solidBtn}`}
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {isSubmitting ? "Creating account…" : "Create account"}
                </button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#0A0A0F] px-3 text-[11px] uppercase tracking-widest text-zinc-600">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const payload = await loginWithGoogle(
                        hasRole ? role : undefined,
                        hasRole ? `/onboarding/${role}` : '/onboarding/role'
                      );

                      if (payload?.access || payload?.refresh || payload?.user) {
                        setAuthStorage(payload);
                      }

                      // same fix: don't derive from payload when no role was
                      // ever chosen, or the backend default leaks through
                      const userType = hasRole ? role : null;

                      navigate(
                        getOnboardingRedirectPath({
                          userType,
                          profile: null,
                        }),
                        { replace: true }
                      );
                    } catch (err) {
                      showToast({
                        type: 'error',
                        title: 'Google Sign-In Failed',
                        message: err?.message || 'Unable to continue with Google.',
                      });
                    }
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-3 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.03]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.94 11.94 0 000 12c0 1.92.46 3.74 1.29 5.38l3.98-3.09z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
                  </svg>
                  Continue with Google
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-zinc-400">
                Already have an account?{" "}
                <Link to="/login" className={`${a.badgeText} hover:opacity-80`}>
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("form")}
                className="flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white"
              >
                <ArrowLeft size={13} />
                Back
              </button>

              <div className="mt-5 text-center">
                <h2 className="text-2xl font-bold text-white">Verify your email</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Enter the 6-digit code we sent to <span className="text-white">{email}</span>
                </p>
              </div>

              <div className="mt-7">
                <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpError(false); }} accent={currentRole.accent} hasError={otpError} />
                {otpError && <p className="mt-3 text-center text-xs text-red-400">Incorrect code. Please try again.</p>}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isVerifying}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-[#0A0A0F] transition disabled:cursor-not-allowed disabled:opacity-60 ${a.solidBtn}`}
              >
                {isVerifying && <Loader2 size={16} className="animate-spin" />}
                {isVerifying ? "Verifying…" : "Verify"}
              </button>

              <p className="mt-5 text-center text-sm text-zinc-400">
                Didn't get a code?{" "}
                {cooldown > 0 ? (
                  <span className="text-zinc-600">Resend in {cooldown}s</span>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={isResending}
                    className={`font-medium ${a.badgeText} hover:opacity-80 disabled:opacity-50`}
                  >
                    {isResending ? "Resending…" : "Resend code"}
                  </button>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
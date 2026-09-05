import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import useToast from "../hooks/useToast";
import { api, loginWithGoogle, setAuthStorage } from "../lib/api";
import { getOnboardingRedirectPath, hydrateAuthState } from "../lib/auth";

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

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const timecode = useTimecode();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
 
  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!isValidEmail(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = await api('/api/auth/login/', {
        method: 'POST',
        body: { email, password },
      });

      setAuthStorage(payload);

      // Fetch complete profile data from backend to ensure all onboarding fields are present
      const hydrationResult = await hydrateAuthState();
      if (!hydrationResult) {
        throw new Error('Failed to fetch profile');
      }

      const { profile, userType } = hydrationResult;
      const targetPath = getOnboardingRedirectPath({ userType, profile });

      showToast({
        type: "success",
        title: "Welcome Back!",
        message: "Redirecting to your workspace...",
      });

      navigate(targetPath, { replace: true });
    } catch (err) {
      const message = err?.message || 'Invalid email or password.';
      showToast({
        type: "error",
        title: "Login Failed",
        message,
      });
      setErrors({ form: message });
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
      <button
  onClick={() => navigate(-1)}
  className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 md:text-sm"
>
  <ArrowLeft size={16} />
  Back
</button>

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
            <h2 className="mt-6 text-2xl font-bold text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-zinc-400">Sign in to access your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${
                  errors.email
                    ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                    : "border-white/10 focus:border-violet-400/60 focus:ring-violet-400/20"
                }`}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2 ${
                    errors.password
                      ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                      : "border-white/10 focus:border-violet-400/60 focus:ring-violet-400/20"
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
              {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="h-3.5 w-3.5 rounded border-white/20 accent-violet-500"
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-xs text-violet-400 transition hover:text-violet-300">
                Forgot password?
              </Link>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0A0A0F] px-3 text-[11px] uppercase tracking-widest text-zinc-600">or</span>
              </div>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={async () => {
                try {
                  const payload = await loginWithGoogle(undefined, '/marketplace');
                  navigate('/marketplace', { replace: true });
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
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.94 11.94 0 000 12c0 1.92.46 3.74 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-zinc-400">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-violet-400 transition hover:text-violet-300">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
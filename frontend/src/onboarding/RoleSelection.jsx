import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Users,
  Scissors,
  BriefcaseBusiness,
  ArrowLeft,
  Check,
  Play,
  ChevronRight,
} from "lucide-react";
import { api, setAuthStorage } from "../lib/api";

/*
  Fonts: tuned for a grotesk display face + monospace for timecodes/labels.
  Optional, add to index.html for the full effect:
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  Falls back cleanly to system sans/mono otherwise.

  Layout: everything scales down via Tailwind breakpoints rather than
  hiding content, so all three cards + heading fit on a single mobile
  screen without scrolling. md+ restores full spacing/detail.
*/

const roles = [
  {
    id: "creator",
    code: "REEL_01",
    title: "Creator",
    subtitle: "Create & collaborate",
    description:
      "Join  campaigns, submit  content, and publish your own gigs for clippers to join.",
    icon: Users,
    features: ["Join brand campaigns", "Submit UGC content", "Publish your own gigs"],
    accent: "violet",
  },
  {
    id: "clipper",
    code: "REEL_02",
    title: "Clipper",
    subtitle: "Earn through clipping",
    description: "Join campaigns, submit clips and build your reputation.",
    icon: Scissors,
    features: ["Join campaigns", "Earn rewards", "Build reputation"],
    accent: "amber",
  },
  {
    id: "brand",
    code: "REEL_03",
    title: "Brand",
    subtitle: "Scale content distribution",
    description:
      "Launch campaigns and receive high-quality short-form content.",
    icon: BriefcaseBusiness,
    features: ["Launch campaigns", "Review submissions", "Analytics & insights"],
    accent: "cyan",
  },
];

// Literal Tailwind class strings per accent (kept static so JIT can see them)
const accentStyles = {
  violet: {
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-400",
    subtitle: "text-violet-400",
    checkBg: "bg-violet-500/10",
    checkText: "text-violet-400",
    border: "hover:border-violet-500/40",
    glow: "hover:shadow-violet-500/10",
    bar: "bg-violet-400",
    code: "text-violet-400/70",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
    subtitle: "text-amber-400",
    checkBg: "bg-amber-500/10",
    checkText: "text-amber-400",
    border: "hover:border-amber-500/40",
    glow: "hover:shadow-amber-500/10",
    bar: "bg-amber-400",
    code: "text-amber-400/70",
  },
  cyan: {
    iconBg: "bg-cyan-500/10",
    iconText: "text-cyan-400",
    subtitle: "text-cyan-400",
    checkBg: "bg-cyan-500/10",
    checkText: "text-cyan-400",
    border: "hover:border-cyan-500/40",
    glow: "hover:shadow-cyan-500/10",
    bar: "bg-cyan-400",
    code: "text-cyan-400/70",
  },
};

function useTimecode() {
  const [frames, setFrames] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrames((f) => f + 1), 100);
    return () => clearInterval(id);
  }, []);
  const totalSeconds = Math.floor(frames / 10);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  const f = String(frames % 10).padStart(2, "0");
  return `${h}:${m}:${s}:${f}`;
}

function Sprockets() {
  return (
    <div className="absolute inset-y-0 left-0 hidden w-7 flex-col items-center justify-evenly border-r border-white/5 bg-black/30 md:flex">
      {Array.from({ length: 8 }).map((_, i) => (
        <span key={i} className="h-2 w-2 rounded-full bg-white/10" />
      ))}
    </div>
  );
}

export default function RoleSelection() {
  const navigate = useNavigate();
  const timecode = useTimecode();

  const handleSelect = async (role) => {
    const safeRole = String(role || '').toLowerCase();
    const currentUser = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}');
      } catch {
        return {};
      }
    })();
  
    localStorage.setItem('user_type', safeRole);
    localStorage.setItem('user', JSON.stringify({
      ...(currentUser || {}),
      user_type: safeRole,
    }));
  
    setAuthStorage({
      user_type: safeRole,
      user: { ...(currentUser || {}), user_type: safeRole },
    });
  
    // Navigate immediately on the role the user actually picked —
    // don't wait on / trust the PATCH response for this.
    navigate(`/onboarding/${safeRole}`, { replace: true });
  
    // Fire-and-forget the profile sync; if it fails, the local
    // state is still correct, so don't let it affect routing.
    try {
      await api('/api/auth/profile/me/', {
        method: 'PATCH',
        body: { role: safeRole, type: safeRole, user_type: safeRole },
      });
    } catch (error) {
      console.error('Role selection save failed (non-blocking)', error);
    }
  };
  const steps = ["Role Selection", "Profile Setup", "Dashboard"];
  const currentStep = 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0F] px-4 py-5 text-white sm:px-6 md:py-10">
      {/* ambient texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        {/* Top bar: back + HUD timecode */}
        <div className="mb-4 flex items-center justify-between md:mb-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded md:text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] tracking-widest text-zinc-400 md:px-3 md:py-1.5 md:text-xs">
            <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500 md:h-2 md:w-2" />
            </span>
            REC
            <span className="hidden text-zinc-600 sm:inline">/</span>
            <span className="hidden text-zinc-300 sm:inline">{timecode}</span>
          </div>
        </div>

        {/* Scrubber-style progress */}
        <div className="mx-auto mb-4 max-w-xl md:mb-16">
          <div className="relative h-1 rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-violet-400"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
            <div
              className="absolute -top-1.5 h-4 w-4 -translate-x-1/2 rotate-45 bg-violet-400"
              style={{ left: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-widest md:mt-4 md:text-[11px]">
            {steps.map((step, i) => (
              <span
                key={step}
                className={i === currentStep ? "text-white" : "text-zinc-600"}
              >
                {String(i + 1).padStart(2, "0")}
                <span className="hidden sm:inline">&nbsp;{step}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-500 md:mb-4 md:text-xs">
            Select your track
          </p>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-6xl">
            Who are you joining as?
          </h1>
          {/* <p className="mx-auto mt-1.5 max-w-2xl text-xs text-zinc-400 sm:text-sm md:mt-5 md:text-lg">
            Choose your path. We'll personalize your onboarding experience based on how you plan to use Clinq.
          </p> */}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:mt-20 md:grid-cols-3 md:gap-8">
          {roles.map((role) => {
            const Icon = role.icon;
            const a = accentStyles[role.accent];

            return (
              <button
                key={role.id}
                onClick={() => handleSelect(role.id)}
                className={`group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-4 pr-3 text-left shadow-2xl shadow-transparent transition-all duration-300 md:rounded-2xl md:py-8 md:pl-14 md:pr-7 md:hover:-translate-y-1.5 ${a.border} ${a.glow} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
              >
                <Sprockets />

                {/* Code label — desktop only */}
                <div className="relative z-10 hidden items-start justify-between md:flex">
                  <span className={`font-mono text-[11px] tracking-widest ${a.code}`}>
                    {role.code}
                  </span>
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl ${a.iconBg}`}
                  >
                    <Icon size={26} className={a.iconText} />
                  </div>
                </div>

                {/* Mobile row: icon + title/subtitle + chevron */}
                <div className="relative z-10 flex items-center gap-3 md:hidden">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}
                  >
                    <Icon size={17} className={a.iconText} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-sm font-bold text-white">{role.title}</h2>
                      <span className={`font-mono text-[9px] tracking-widest ${a.code}`}>
                        {role.code}
                      </span>
                    </div>
                    <p className={`text-[11px] font-medium ${a.subtitle}`}>
                      {role.subtitle}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-zinc-600 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-zinc-400"
                  />
                </div>

                {/* Description */}
                <p className="relative z-10 mt-1.5 text-[11px] leading-4 text-zinc-400 md:mt-7 md:text-sm md:leading-6">
                  {role.description}
                </p>

                {/* Title/subtitle — desktop only (mobile shows it in the row above) */}
                <div className="relative z-10 hidden md:block">
                  <h2 className="text-2xl font-bold text-white">{role.title}</h2>
                  <p className={`mt-1.5 text-sm font-medium ${a.subtitle}`}>
                    {role.subtitle}
                  </p>
                </div>

                {/* Features */}
                <div className="relative z-10 mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/5 pt-2 md:mt-7 md:block md:space-y-3 md:border-t md:pt-6">
                  {role.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-1.5 md:gap-3">
                      <div
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${a.checkBg} md:h-5 md:w-5`}
                      >
                        <Check size={9} className={`${a.checkText} md:hidden`} />
                        <Check size={12} className={`hidden ${a.checkText} md:block`} />
                      </div>
                      <span className="text-[10px] text-zinc-400 md:text-sm md:text-zinc-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer / play control — desktop only */}
                <div className="relative z-10 mt-8 hidden md:block">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white">
                      <Play size={12} className={a.iconText} />
                      Start
                    </span>
                    <span className="font-mono text-[11px] text-zinc-600">
                      00:00 / 00:03
                    </span>
                  </div>
                  <div className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full w-0 ${a.bar} transition-all duration-500 ease-out group-hover:w-full`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
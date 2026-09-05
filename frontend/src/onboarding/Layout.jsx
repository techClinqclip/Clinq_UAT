import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Plus } from "lucide-react";

/*
  OnboardingLayout
  -----------------
  Shared shell for every role-specific onboarding flow (Brand, Creator,
  Clipper). Keeps the Clinq "film reel" visual identity — REC/timecode
  HUD, sprocket-hole card edge, scrubber-style progress — consistent
  across flows, while each flow only has to supply its step labels,
  heading copy, and field content.

  Usage:
    <OnboardingLayout
      accent="cyan"
      eyebrow="Brand Setup"
      title="Tell us about your company"
      subtitle="This helps clippers and creators recognize your brand."
      steps={["Company", "Manager", "Company email"]}
      currentStep={0}
      onBack={() => ...}          // called from the top-left back arrow
      primaryLabel="Continue"
      onPrimary={() => ...}
      primaryDisabled={false}
      secondaryLabel="Back"        // optional footer secondary button
      onSecondary={() => ...}
    >
      ...form fields...
    </OnboardingLayout>
*/

// Literal Tailwind class strings per accent (kept static so JIT can see them)
export const accentStyles = {
  violet: {
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-400",
    ring: "focus:border-violet-400/60 focus:ring-violet-400/20",
    bar: "bg-violet-400",
    solidBtn: "bg-violet-500 hover:bg-violet-400",
    text: "text-violet-400",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-400",
    ring: "focus:border-amber-400/60 focus:ring-amber-400/20",
    bar: "bg-amber-400",
    solidBtn: "bg-amber-500 hover:bg-amber-400",
    text: "text-amber-400",
  },
  cyan: {
    iconBg: "bg-cyan-500/10",
    iconText: "text-cyan-400",
    ring: "focus:border-cyan-400/60 focus:ring-cyan-400/20",
    bar: "bg-cyan-400",
    solidBtn: "bg-cyan-500 hover:bg-cyan-400",
    text: "text-cyan-400",
  },
};

export function useTimecode() {
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

export function Sprockets() {
  return (
    <div className="absolute inset-y-0 left-0 hidden w-7 flex-col items-center justify-evenly border-r border-white/5 bg-black/30 md:flex">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="h-2 w-2 rounded-full bg-white/10" />
      ))}
    </div>
  );
}

/* ---------------- Form primitives (shared across onboarding flows) ---------------- */

export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </span>
        {hint && (
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-zinc-300">
            {hint}
          </span>
        )}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const baseFieldClasses =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:bg-white/[0.05] focus:ring-2";

export function Input({ accent = "violet", className = "", ...props }) {
  const a = accentStyles[accent];
  return (
    <input className={`${baseFieldClasses} ${a.ring} ${className}`} {...props} />
  );
}

export function TextArea({ accent = "violet", className = "", ...props }) {
  const a = accentStyles[accent];
  return (
    <textarea
      className={`${baseFieldClasses} resize-none ${a.ring} ${className}`}
      {...props}
    />
  );
}

export function ChipGroup({ options, selected = [], onToggle, accent = "violet", className = "flex flex-wrap gap-2" }) {
  const a = accentStyles[accent];
  return (
    <div className={className}>
      {options.map((option) => {
        const isActive = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            aria-pressed={isActive}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              isActive
                ? `border-transparent ${a.solidBtn} text-[#0A0A0F]`
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function OtherOptionInput({
  accent = "violet",
  open,
  active = false,
  value,
  onOpen,
  onChange,
  onAdd,
  placeholder = "Type custom option",
  label = "Other",
}) {
  const a = accentStyles[accent];
  const canAdd = value.trim().length > 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={active}
        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
          active
            ? `border-transparent ${a.solidBtn} text-[#0A0A0F]`
            : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex min-w-[220px] flex-1 items-center gap-2 sm:flex-none">
      <Input
        accent={accent}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        autoFocus
        className="h-8 min-w-0 py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className={`flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-semibold text-[#0A0A0F] transition ${
          canAdd ? a.solidBtn : "cursor-not-allowed bg-white/10 text-zinc-500"
        }`}
      >
        <Plus size={14} />
        Add
      </button>
    </div>
  );
}

export function ImageUpload({ label, shape = "square", value, onChange, accent = "violet" }) {
  const a = accentStyles[accent];
  const inputId = `upload-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <label
        htmlFor={inputId}
        className={`group flex cursor-pointer items-center gap-3 border border-dashed border-white/15 bg-white/[0.02] transition hover:border-white/30 ${
          shape === "circle" ? "h-20 w-20 rounded-full justify-center" : "h-24 w-full rounded-xl px-4"
        }`}
      >
        {value ? (
          <img
            src={value}
            alt={label}
            className={shape === "circle" ? "h-full w-full rounded-full object-cover" : "h-full w-full rounded-xl object-cover"}
          />
        ) : (
          <div className={`flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300 ${shape === "circle" ? "flex-col text-center" : ""}`}>
            <ImagePlus size={18} className={a.iconText} />
            {shape !== "circle" && <span className="text-xs">{label}</span>}
          </div>
        )}
      </label>
    </div>
  );
}

/* ---------------- Layout ---------------- */


export default function OnboardingLayout({
  accent = "violet",
  eyebrow,
  title,
  subtitle,
  steps = [],
  currentStep = 0,
  onBack,
  children,
  primaryLabel = "Continue",
  onPrimary,
  primaryDisabled = false,
  secondaryLabel,
  onSecondary,
}) {
  const timecode = useTimecode();
  const a = accentStyles[accent];
  const progressPct = steps.length ? ((currentStep + 1) / steps.length) * 100 : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0F] px-4 pb-28 pt-5 text-white sm:px-6 md:pb-32 md:pt-10">
      {/* ambient texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="relative mx-auto max-w-2xl">
        {/* Top bar: back + HUD timecode */}
        <div className="mb-6 flex items-center justify-between md:mb-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded md:text-sm"
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

        {/* Sub-step scrubber */}
        {steps.length > 0 && (
          <div className="mb-8 md:mb-12">
            <div className="relative h-1 rounded-full bg-white/10">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${a.bar} transition-all duration-500`}
                style={{ width: `${progressPct}%` }}
              />
              <div
                className={`absolute -top-1.5 h-4 w-4 -translate-x-1/2 rotate-45 ${a.bar} transition-all duration-500`}
                style={{ left: `${progressPct}%` }}
              />
            </div>
            <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-widest md:text-[11px]">
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
        )}

        {/* Heading */}
        <div>
          {eyebrow && (
            <p className={`mb-2 font-mono text-[10px] uppercase tracking-[0.3em] ${a.text} md:text-xs`}>
              {eyebrow}
            </p>
          )}
          {title && (
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-2 max-w-xl text-sm text-zinc-400 md:mt-3 md:text-base">
              {subtitle}
            </p>
          )}
        </div>

        {/* Form card */}
        <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl md:mt-10">
          <Sprockets />
          <div className="p-5 md:py-8 md:pl-14 md:pr-8">{children}</div>
        </div>
      </div>

      {/* Sticky footer nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0A0A0F]/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {secondaryLabel && (
            <button
              onClick={onSecondary}
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={onPrimary}
            disabled={primaryDisabled}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-[#0A0A0F] transition-all duration-300 sm:flex-none sm:min-w-[220px] ${
              primaryDisabled ? "cursor-not-allowed bg-white/10 text-zinc-500" : a.solidBtn
            }`}
          >
            {primaryLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

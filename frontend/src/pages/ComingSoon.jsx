import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clapperboard } from "lucide-react";

// Turns "/discover" -> "DISCOVER", "/blogs" -> "BLOGS", falls back to a
// generic scene name if we're at a route with no clean segment to show.
function sceneNameFromPath(pathname) {
  const segment = pathname.split("/").filter(Boolean).pop();
  if (!segment) return "UNTITLED";
  return segment.replace(/[-_]/g, " ").toUpperCase();
}

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

function Sprockets() {
  return (
    <div className="absolute inset-y-0 left-0 hidden w-6 flex-col items-center justify-evenly border-r border-white/5 bg-black/30 sm:flex">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/10" />
      ))}
    </div>
  );
}

export default function ComingSoon() {
  const location = useLocation();
  const navigate = useNavigate();
  const timecode = useTimecode();
  const sceneName = sceneNameFromPath(location.pathname);

  // Render progress is deliberately stuck — this scene isn't done cutting.
  const renderPercent = 42;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0A0F] px-6 py-16 text-white">
      {/* ambient texture, consistent with Login/Signup */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[150px]" />

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="absolute left-6 top-6 z-10 flex items-center gap-2 text-xs text-zinc-500 transition hover:text-white sm:left-10 sm:top-10 sm:text-sm"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* REC HUD */}
      <div className="absolute right-6 top-6 z-10 hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs tracking-widest text-zinc-400 sm:right-10 sm:top-10 sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        REC
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-300">{timecode}</span>
      </div>

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-xl">
        <Sprockets />

        <div className="px-8 py-10 sm:pl-12">
          {/* Clapperboard — the signature moment: claps shut once on load */}
          <div className="flex justify-center">
            <div className="relative">
              <motion.div
                initial={{ rotate: -28, y: -6 }}
                animate={{ rotate: 0, y: 0 }}
                transition={{ delay: 0.3, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ transformOrigin: "8% 15%" }}
                className="absolute -top-1 left-0 right-0 z-10"
              >
                <div className="h-5 w-full rounded-t-md bg-[repeating-linear-gradient(-45deg,#fff,#fff_8px,#0A0A0F_8px,#0A0A0F_16px)] opacity-90" />
              </motion.div>
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <Clapperboard size={26} className="text-violet-400" />
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-violet-300">
              In production
            </div>

            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.3em] text-zinc-500">
              Scene · {sceneName} · Take 01
            </p>

            <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Still in the edit bay
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">
              This one's being cut right now. Check back soon — it'll be ready to ship before you know it.
            </p>
          </div>

          {/* Frozen render scrubber */}
          <div className="mt-8">
            <div className="relative h-1.5 rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                style={{ width: `${renderPercent}%` }}
              />
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rotate-45 bg-violet-400"
                style={{ left: `${renderPercent}%` }}
              />
            </div>
            <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-600">
              <span>Rendering…</span>
              <span>{renderPercent}%</span>
            </div>
          </div>

          <button
            onClick={() => navigate("/marketplace")}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}
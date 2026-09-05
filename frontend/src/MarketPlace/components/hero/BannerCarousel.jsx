import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ImageOff, RotateCcw } from "lucide-react";

import BannerSlide from "./BannerSlide";
import CarouselControls from "./CarouselControls";
import CampaignDetailModal from "../CampaignDetailModal";

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.98,
  }),
};

// Shared footprint wrapper so loading/error/empty/content never cause layout jump.
function CarouselShell({ children }) {
  return (
    <div className="relative h-[420px] overflow-hidden rounded-3xl sm:h-[440px] lg:h-[470px]">
      {children}
    </div>
  );
}

export default function BannerCarousel({ campaigns = [], loading = false, error = null, onRetry }) {
  const featuredCampaigns = campaigns.slice(0, 4);
  const [[current, direction], setState] = useState([0, 1]);
  const [paused, setPaused] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!featuredCampaigns.length) return;
    setState(([prev]) => [Math.min(prev, featuredCampaigns.length - 1), 1]);
  }, [featuredCampaigns.length]);

  const goTo = (index, dir) => setState([index, dir]);
  const next = () => goTo((current + 1) % featuredCampaigns.length, 1);
  const prev = () => goTo((current - 1 + featuredCampaigns.length) % featuredCampaigns.length, -1);
  const jumpTo = (index) => goTo(index, index > current ? 1 : -1);

  useEffect(() => {
    if (paused || !featuredCampaigns.length || error) return;
    const timer = setInterval(() => {
      setState(([prevIndex]) => [(prevIndex + 1) % featuredCampaigns.length, 1]);
    }, 5500);
    return () => clearInterval(timer);
  }, [paused, featuredCampaigns.length, error]);

  // Reserve the exact same footprint as the real carousel so nothing
  // shifts when data lands — no skeleton = layout jump.
  if (loading) {
    return <BannerCarouselSkeleton />;
  }

  if (error) {
    return (
      <CarouselShell>
        <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border border-red-500/20 bg-red-500/[0.03] px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle size={22} className="text-red-400" />
          </div>
          <div>
            <p className="font-medium text-red-400">Couldn't load campaigns</p>
            <p className="mt-1 text-sm text-zinc-500">
              {typeof error === "string" ? error : "Something went wrong while fetching the banner."}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
            >
              <RotateCcw size={14} />
              Try again
            </button>
          )}
        </div>
      </CarouselShell>
    );
  }

  if (!featuredCampaigns.length) {
    return (
      <CarouselShell>
        <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <ImageOff size={22} className="text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-300">No campaigns to feature yet</p>
            <p className="mt-1 text-sm text-zinc-500">Check back soon — new campaigns show up here first.</p>
          </div>
        </div>
      </CarouselShell>
    );
  }

  return (
    <div
      className="relative h-[420px] overflow-hidden rounded-3xl sm:h-[440px] lg:h-[470px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.div
          key={featuredCampaigns[current].id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <BannerSlide campaign={featuredCampaigns[current]} onJoinClick={() => setModalOpen(true)} />
        </motion.div>
      </AnimatePresence>

      <CarouselControls total={featuredCampaigns.length} current={current} next={next} prev={prev} goTo={jumpTo} />

      <CampaignDetailModal isOpen={modalOpen} onClose={() => setModalOpen(false)} campaign={featuredCampaigns[current]} />
    </div>
  );
}

function BannerCarouselSkeleton() {
  return (
    <div className="relative h-[420px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] sm:h-[440px] lg:h-[470px]">
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02]" />

      <div className="relative z-10 flex h-full items-center px-6 pb-20 pt-6 sm:px-10 sm:pb-24 sm:pt-10 lg:px-14 lg:pb-16 lg:pt-14">
        <div className="max-w-xl w-full">
          <div className="h-6 w-40 animate-pulse rounded-full bg-white/10 sm:h-8 sm:w-48" />
          <div className="mt-4 h-9 w-3/4 animate-pulse rounded-lg bg-white/10 sm:mt-6 sm:h-11 lg:mt-8 lg:h-14" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10 sm:mt-4" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/10" />

          <div className="mt-4 flex flex-wrap gap-4 sm:mt-6 sm:gap-6 lg:mt-8 lg:gap-8">
            <div className="h-5 w-24 animate-pulse rounded bg-white/10" />
            <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
            <div className="h-5 w-20 animate-pulse rounded bg-white/10" />
          </div>

          <div className="mt-5 h-12 w-40 animate-pulse rounded-xl bg-white/10 sm:mt-7 lg:mt-10" />
        </div>
      </div>

      {/* dot indicators placeholder to match CarouselControls position */}
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="h-1.5 w-6 animate-pulse rounded-full bg-white/15" />
        ))}
      </div>
    </div>
  );
}
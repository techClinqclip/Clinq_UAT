import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  PlayCircle,
  Scissors,
  Video,
  Building2,
} from "lucide-react";

export default function HeroContent() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mx-auto max-w-5xl text-center"
      >
        {/* Badge */}

        <div className="mb-8 inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 backdrop-blur-md">
          <span className="text-sm font-medium uppercase tracking-[0.18em] text-violet-300">
            India's Creator Platform
          </span>
        </div>

        {/* Heading */}

        <h1 className="text-3xl font-bold leading-tight text-white sm:text-5xl md:text-7xl lg:text-8xl">
          Turn Content Into
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent">
            Real Rewards
          </span>
        </h1>

        {/* Description */}

        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-zinc-300 sm:mt-8 sm:text-lg sm:leading-8 md:text-xl">
          The marketplace connecting brands, creators and clippers.
          Discover campaigns, create engaging clips and earn rewards
          for every approved submission.
        </p>

        {/* CTA Buttons */}

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:mt-12 sm:gap-5 lg:flex-row">

          {/* Clipper */}

          <Link
            to="/signup?role=clipper"
            className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 text-lg font-semibold text-white shadow-[0_0_35px_rgba(139,92,246,.45)] transition-all duration-300 hover:scale-105 sm:h-16 sm:w-72"
          >
            <Scissors size={22} />

            Start Clipping

            <ArrowRight
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

          {/* Creator */}

          <Link
            to="/signup?role=creator"
            className="group hidden h-16 w-72 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black/30 text-lg font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-violet-400 hover:bg-white/5 sm:flex"
          >
            <Video size={21} />

            I'm a Creator

            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

          {/* Brand */}

          <Link
            to="/signup?role=brand"
            className="group hidden h-16 w-72 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black/30 text-lg font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-violet-400 hover:bg-white/5 sm:flex"
          >
            <Building2 size={21} />

            I'm a Brand

            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

          {/* Mobile-only: collapsed role link */}
          <Link
            to="/signup"
            className="sm:hidden text-sm text-zinc-400 transition hover:text-white"
          >
            Brand or creator?{" "}
            <span className="text-violet-400 underline underline-offset-2">
              Get started
            </span>
          </Link>

        </div>

        {/* How It Works */}

        <a
          href="#how-it-works"
          className="group mt-8 inline-flex items-center gap-3 text-zinc-300 transition hover:text-white sm:mt-12"
        >
          <PlayCircle
            size={24}
            className="text-violet-400"
          />

          <span className="text-lg">
            See how it works
          </span>
        </a>

      </motion.div>
    </div>
  );
}
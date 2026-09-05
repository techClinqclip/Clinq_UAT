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

        <h1 className="text-5xl font-bold leading-tight text-white md:text-7xl lg:text-8xl">
          Turn Content Into
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-300 bg-clip-text text-transparent">
            Real Rewards
          </span>
        </h1>

        {/* Description */}

        <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-zinc-300 md:text-xl">
          The marketplace connecting brands, creators and clippers.
          Discover campaigns, create engaging clips and earn rewards
          for every approved submission.
        </p>

        {/* CTA Buttons */}

        <div className="mt-12 flex flex-col items-center justify-center gap-5 lg:flex-row">

          {/* Clipper */}

          <Link
            to="/signup?role=clipper"
            className="group flex h-16 w-72 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 text-lg font-semibold text-white shadow-[0_0_35px_rgba(139,92,246,.45)] transition-all duration-300 hover:scale-105"
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
            className="group flex h-16 w-72 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black/30 text-lg font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-violet-400 hover:bg-white/5"
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
            className="group flex h-16 w-72 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black/30 text-lg font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-violet-400 hover:bg-white/5"
          >
            <Building2 size={21} />

            I'm a Brand

            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

        </div>

        {/* How It Works */}

        <a
          href="#how-it-works"
          className="group mt-12 inline-flex items-center gap-3 text-zinc-300 transition hover:text-white"
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
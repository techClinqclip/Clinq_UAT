import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Rocket, Compass } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

// The middle "0" in "404" is a spinning orbit ring with a rocket circling
// it, instead of a static digit — the one bit of real personality on the
// page.
function OrbitDigit() {
  return (
    <div className="relative flex h-[0.9em] w-[0.9em] items-center justify-center">
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/15" />

      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-1.5 shadow-lg shadow-violet-500/40">
          <Rocket size={13} className="text-white" />
        </div>
      </motion.div>

      <motion.div
        className="h-[45%] w-[45%] rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-20">
      <AnimatedBackground />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex w-full max-w-lg flex-col items-center text-center"
      >
        <motion.div
          variants={item}
          className="flex items-center gap-3 text-[7rem] font-bold leading-none text-white sm:text-[9rem]"
        >
          <span>4</span>
          <OrbitDigit />
          <span>4</span>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300"
        >
          <Compass size={14} className="text-violet-400" />
          You've drifted off course
        </motion.div>

        <motion.h1 variants={item} className="mt-6 text-2xl font-bold text-white">
          This page doesn't exist
        </motion.h1>

        <motion.p variants={item} className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
          The link might be broken, or the page may have moved. Let's get you
          back to somewhere that actually exists.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/marketplace"
            className="flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            <Home size={15} />
            Back to Marketplace
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
          >
            <ArrowLeft size={15} />
            Go Back
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
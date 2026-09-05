import { motion } from "framer-motion";
import { Rocket } from "lucide-react";

/**
 * For loading states INSIDE a page — a section fetching data while the
 * rest of the UI (navbar, sidebar) stays visible. Not a full-screen
 * overlay like LoadingScreen; sized to fit whatever container it's
 * dropped into.
 *
 * Usage — replace this:
 *   {loading && <p>Campaigns are loading...</p>}
 * with this:
 *   {loading && <ContentLoader message="Loading campaigns..." />}
 *
 * Same orbiting-rocket motif as OrbitDigit (NotFound.jsx) and OrbitLogo
 * (LoadingScreen.jsx) — a dashed ring with a rocket circling it on the
 * same 6s loop — just scaled down to fit this component's much smaller
 * footprint, so the "loading" and "error" states across the app share
 * one visual language instead of three unrelated spinners.
 */
export default function ContentLoader({ message = "Loading...", minHeight = 280 }) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-4 py-16"
      style={{ minHeight }}
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/15" />

        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 p-1 shadow-md shadow-violet-500/40">
            <Rocket size={9} className="text-white" />
          </div>
        </motion.div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <motion.div
            className="h-2.5 w-2.5 rounded-full bg-white"
            animate={{ scale: [1, 0.6, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
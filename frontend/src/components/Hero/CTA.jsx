import {
  Scissors,
  Gift,
  IndianRupee,
  Play,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
export default function CTA() {
  return (
    <section className="bg-[#07070B] px-6 py-24">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-[#11111a] via-[#0d0d15] to-[#09090B] px-10 py-24">

        {/* Background Glow */}
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[140px]" />

        {/* Decorative Dots */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-24 top-20 h-1 w-1 rounded-full bg-violet-400" />
          <div className="absolute left-40 bottom-20 h-1 w-1 rounded-full bg-violet-300" />
          <div className="absolute right-28 top-24 h-1 w-1 rounded-full bg-violet-400" />
          <div className="absolute right-40 bottom-24 h-1 w-1 rounded-full bg-violet-300" />
        </div>

        {/* Left Icons */}
        <div className="absolute left-16 top-1/2 hidden -translate-y-1/2 lg:block">

          <div className="absolute -left-6 -top-12 h-28 w-28 rounded-3xl border border-violet-500/30 bg-violet-500/10 backdrop-blur-md rotate-[-10deg] flex items-center justify-center">
            <Play className="h-12 w-12 text-violet-400" />
          </div>

          <div className="absolute left-20 top-24 h-28 w-28 rounded-3xl border border-violet-500/30 bg-violet-500/10 backdrop-blur-md rotate-[8deg] flex items-center justify-center">
            <Scissors className="h-12 w-12 text-violet-400" />
          </div>

        </div>

        {/* Right Icons */}

        <div className="absolute right-16 top-1/2 hidden -translate-y-1/2 lg:block">

          <div className="absolute -right-4 -top-12 h-28 w-28 rounded-3xl border border-violet-500/30 bg-violet-500/10 backdrop-blur-md rotate-[10deg] flex items-center justify-center">
            <Gift className="h-12 w-12 text-violet-400" />
          </div>

          <div className="absolute right-20 top-24 h-28 w-28 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-md flex items-center justify-center">
            <IndianRupee className="h-12 w-12 text-violet-400" />
          </div>

        </div>

        {/* Center */}

        <div className="relative z-10 mx-auto max-w-3xl text-center">

          <span className="inline-block rounded-full border border-violet-500/20 bg-violet-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
            Ready To Grow?
          </span>

          <h2 className="mt-8 text-5xl font-bold leading-tight text-white md:text-6xl">
            Your Next Opportunity
            <br />
            Is Just One Clip Away.
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400">
            Join Clinq today and start earning rewards, building your
            portfolio and working with creators and brands across India.
          </p>

          <div className="mt-12 flex flex-col justify-center gap-5 sm:flex-row">

            <Link
              to="/signup"
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 px-8 py-4 font-semibold text-white transition hover:scale-105"
            >
              Join Clinq Today
            </Link>
            <a
  href="#how-it-works"
  className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-8 py-4 font-semibold text-white transition hover:border-violet-500"
>
  Learn More
  <ArrowRight size={18} />
</a>

          </div>

        </div>

      </div>
    </section>
  );
}
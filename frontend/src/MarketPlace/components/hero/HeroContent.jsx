import { ArrowRight, PlayCircle } from "lucide-react";

export default function HeroContent() {
  return (
    <div className="relative z-10 max-w-3xl">
      {/* Badge */}
      <div className="mb-6 inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2">
        <span className="text-sm font-medium text-violet-300">
          🚀 Discover opportunities. Build your audience. Earn rewards.
        </span>
      </div>

      {/* Heading */}
      <h1 className="text-5xl font-bold leading-tight tracking-tight text-white lg:text-6xl">
        Find Campaigns.
        <br />
        <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Create.
        </span>{" "}
        Clip. Earn.
      </h1>

      {/* Subtitle */}
      <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
        Explore exciting campaigns from top brands, collaborate with creators,
        submit your best work, and earn rewards for your creativity—all in one
        platform.
      </p>

      {/* CTA Buttons */}
      <div className="mt-10 flex flex-wrap gap-4">
        <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500">
          Explore Campaigns
          <ArrowRight size={18} />
        </button>

        <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
          <PlayCircle size={18} />
          How It Works
        </button>
      </div>
    </div>
  );
}
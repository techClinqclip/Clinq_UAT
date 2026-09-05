import { ArrowRight, Clock3, Trophy, Users } from "lucide-react";

export default function FeaturedBanner() {
  return (
    <div className="relative overflow-hidden custom-scrollbar rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600"
        alt="Featured Campaign"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute custom-scrollbar inset-0 bg-gradient-to-r from-[#09090f]/95 via-[#09090f]/70 to-transparent" />

      {/* Content */}
      <div className="relative z-10 custom-scrollbar flex min-h-[460px] items-center px-10 py-12 lg:px-14">
        <div className="max-w-xl">
          {/* Badge */}
          <span className="inline-flex rounded-full border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-300">
            🔥 Featured Campaign
          </span>

          {/* Title */}
          <h1 className="mt-6 text-5xl font-bold leading-tight text-white">
            Summer Collection
            <br />
            Launch Campaign
          </h1>

          {/* Description */}
          <p className="mt-5 text-lg leading-8 text-zinc-300">
            Create engaging short-form videos showcasing our latest collection
            and compete for exciting cash rewards.
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-yellow-400" />
              ₹50,000 Reward Pool
            </div>

            <div className="flex items-center gap-2">
              <Users size={18} className="text-violet-400" />
              124 Creators Joined
            </div>

            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-emerald-400" />
              8 Days Left
            </div>
          </div>

          {/* CTA */}
          <button className="mt-10 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3 font-medium text-white transition hover:bg-violet-500">
            Join Campaign
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
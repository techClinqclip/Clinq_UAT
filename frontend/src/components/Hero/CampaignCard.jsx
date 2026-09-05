import {
  IndianRupee,
  Clock3,
  Flame,
  ArrowUpRight,
  Mic2,
  Gamepad2,
  Dumbbell,
  Briefcase,
  TrendingUp,
  GraduationCap,
} from "lucide-react";

const categoryIcons = {
  Podcast: Mic2,
  Gaming: Gamepad2,
  Fitness: Dumbbell,
  Business: Briefcase,
  Finance: TrendingUp,
  Education: GraduationCap,
};

export default function CampaignCard({
  category,
  status,
  title,
  creator,
  reward,
  duration,
  difficulty,
  hero = false,
}) {
  const Icon = categoryIcons[category] || Mic2;

  const difficultyColor = {
    Easy: "text-emerald-400",
    Medium: "text-yellow-400",
    Hard: "text-red-400",
  };

  const statusColor = {
    Trending: "bg-orange-500/15 text-orange-300",
    Featured: "bg-violet-500/15 text-violet-300",
    Popular: "bg-sky-500/15 text-sky-300",
    New: "bg-emerald-500/15 text-emerald-300",
    "Ending Soon": "bg-red-500/15 text-red-300",
  };

  return (
    <div
      className={`
        ${
          hero
            ? "w-[290px] scale-90"
            : "w-[360px]"
        }

        rounded-3xl
        border
        border-white/10
        bg-zinc-900/80
        backdrop-blur-xl
        overflow-hidden
        shadow-[0_20px_60px_rgba(0,0,0,.35)]
        transition-all
        duration-500
        hover:border-violet-500/40
        hover:bg-zinc-900
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
            <Icon className="h-5 w-5 text-violet-300" />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              {category}
            </p>

            <h3 className="text-base font-semibold text-white">
              {title}
            </h3>
          </div>
        </div>

        <span
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium ${
            statusColor[status] || "bg-white/10 text-white"
          }`}
        >
          <Flame size={12} />
          {status}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-5 p-5">
        {/* Creator */}
        <div>
          <p className="text-xs text-zinc-500">
            Creator
          </p>

          <p className="mt-1 text-white font-medium">
            {creator}
          </p>
        </div>

        {/* Reward */}
        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-violet-300">
            Reward
          </p>

          <div className="mt-2 flex items-center gap-2">
            <IndianRupee
              size={22}
              className="text-violet-400"
            />

            <span className="text-3xl font-bold text-white">
              {reward}
            </span>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock3 size={15} />
              <span className="text-xs">
                Duration
              </span>
            </div>

            <p className="mt-2 text-sm font-medium text-white">
              {duration}
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs text-zinc-400">
              Difficulty
            </p>

            <p
              className={`mt-2 text-sm font-semibold ${
                difficultyColor[difficulty]
              }`}
            >
              {difficulty}
            </p>
          </div>
        </div>

        {/* CTA */}
        {!hero && (
          <button className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 font-medium text-white transition-all duration-300 hover:bg-violet-500">
            View Campaign

            <ArrowUpRight
              size={18}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </button>
        )}
      </div>
    </div>
  );
}
import {
  ArrowRight,
  Clock3,
  Trophy,
  Users,
} from "lucide-react";

function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BannerSlide({ campaign, onJoinClick }) {
  const title = campaign?.name || campaign?.title || "Featured Campaign";
  const image = campaign?.thumbnailUrl || campaign?.thumbnail || campaign?.image || "";
  const description = campaign?.description || "";
  const reward = campaign?.rewardPer1k ? `${formatMoney(campaign.rewardPer1k)} Reward` : `${formatMoney(campaign?.budget || 0)} Reward Pool`;
  const creators = `${Number(campaign?.submissions || 0)} creators joined`;
  const deadline = campaign?.endDate ? `${Math.max(0, Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} days left` : "Open now";

  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-white/10">
      <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />

      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />

      <div className="relative z-10 flex h-full items-center px-6 pb-20 pt-6 sm:px-10 sm:pb-24 sm:pt-10 lg:px-14 lg:pb-16 lg:pt-14">
        <div className="max-w-xl">
          <span className="rounded-full border border-violet-500/40 bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-300 sm:px-4 sm:py-2 sm:text-sm">
            🔥 Featured Campaign
          </span>

          <h1 className="mt-4 text-3xl font-bold text-white sm:mt-6 sm:text-4xl lg:mt-8 lg:text-6xl">
            {title}
          </h1>

          <p className="mt-3 text-sm text-zinc-300 sm:mt-4 sm:text-base lg:mt-6 lg:text-lg">
            {description}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-200 sm:mt-6 sm:gap-6 lg:mt-8 lg:gap-8 lg:text-base">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="shrink-0" />
              {reward}
            </div>

            <div className="flex items-center gap-2">
              <Users size={16} className="shrink-0" />
              {creators}
            </div>

            <div className="flex items-center gap-2">
              <Clock3 size={16} className="shrink-0" />
              {deadline}
            </div>
          </div>

          <button
            type="button"
            onClick={onJoinClick}
            className="mt-5 flex items-center gap-2.5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 sm:mt-7 sm:px-6 sm:py-3.5 sm:text-base lg:mt-10 lg:gap-3 lg:px-7 lg:py-4"
          >
            Join Campaign
            <ArrowRight size={16} className="shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
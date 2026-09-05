import { Crown, Trophy, Medal } from "lucide-react";
import Avatar from "./Avatar";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";
import { useLeaderboard } from "../LeaderboardContext";

const RANK_STYLE = {
  1: {
    icon: Crown,
    iconClass: "text-amber-400",
    ring: "ring-amber-400/60",
    badgeBg: "bg-gradient-to-br from-amber-400 to-yellow-500",
    cardBorder: "border-amber-500/30",
    cardBg: "bg-gradient-to-b from-amber-500/[0.08] to-transparent",
    order: "order-2",
    lift: "sm:-translate-y-5",
    avatarSize: 84,
    scoreClass: "text-amber-400",
  },
  2: {
    icon: Trophy,
    iconClass: "text-zinc-300",
    ring: "ring-zinc-300/50",
    badgeBg: "bg-gradient-to-br from-zinc-300 to-zinc-400",
    cardBorder: "border-white/10",
    cardBg: "bg-white/[0.03]",
    order: "order-1",
    lift: "",
    avatarSize: 68,
    scoreClass: "text-zinc-300",
  },
  3: {
    icon: Medal,
    iconClass: "text-orange-400",
    ring: "ring-orange-400/50",
    badgeBg: "bg-gradient-to-br from-orange-400 to-amber-600",
    cardBorder: "border-white/10",
    cardBg: "bg-white/[0.03]",
    order: "order-3",
    lift: "",
    avatarSize: 68,
    scoreClass: "text-orange-400",
  },
};

export default function PodiumTop3() {
  const { top3, currentUserRanked } = useLeaderboard();

  if (top3.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center sm:gap-5">
      {top3.map((person) => {
        const style = RANK_STYLE[person.rank];
        const isYou = currentUserRanked && person.id === currentUserRanked.id;
        const Icon = style.icon;

        return (
          <div
            key={person.id}
            className={`flex w-full max-w-xs flex-col items-center rounded-2xl border p-6 shadow-lg transition sm:w-44 ${style.order} ${style.lift} ${
              isYou ? "border-violet-500/50 bg-violet-500/[0.07]" : `${style.cardBorder} ${style.cardBg}`
            }`}
          >
            <div className="relative">
              <HoverProfileTrigger user={person}>
                <button type="button">
                  <Avatar
                    src={person.avatar}
                    name={person.name}
                    size={style.avatarSize}
                    className={`ring-4 ${style.ring}`}
                  />
                </button>
              </HoverProfileTrigger>

              <div className={`absolute -top-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full ${style.badgeBg} shadow-md`}>
                <Icon size={16} className="text-black/70" />
              </div>

              <div className="absolute -bottom-1 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-[#0B0B12] bg-[#1a1a24] text-[11px] font-bold text-white">
                {person.rank}
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="truncate text-sm font-semibold text-white">{person.name}</p>
              <p className={`mt-1 text-base font-bold ${style.scoreClass}`}>
                {person.score.toLocaleString()}
                <span className="ml-1 text-xs font-medium text-zinc-500">pts</span>
              </p>
              {isYou && (
                <span className="mt-2 inline-block rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-medium text-violet-300">
                  That's you!
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
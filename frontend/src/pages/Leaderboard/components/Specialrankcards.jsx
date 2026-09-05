import { Sparkles } from "lucide-react";
import Avatar from "./Avatar";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";
import FollowButton from "../../../shared/social/FollowButton";
import { useLeaderboard } from "../LeaderboardContext";

export default function SpecialRankCards() {
  const { special4and5, currentUserRanked } = useLeaderboard();

  if (special4and5.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {special4and5.map((person) => {
        const isYou = currentUserRanked && person.id === currentUserRanked.id;

        return (
          <div
            key={person.id}
            className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-4 transition ${
              isYou
                ? "border-violet-500/60 bg-violet-500/[0.07]"
                : "border-white/10 bg-gradient-to-br from-violet-500/[0.06] via-fuchsia-500/[0.03] to-transparent hover:border-white/20"
            }`}
          >
            <Sparkles size={14} className="absolute right-3 top-3 text-violet-400/40" />

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-sm font-bold text-violet-300">
              {person.rank}
            </div>

            <HoverProfileTrigger user={person}>
              <button type="button">
                <Avatar src={person.avatar} name={person.name} size={44} />
              </button>
            </HoverProfileTrigger>

            <div className="min-w-0 flex-1">
              <HoverProfileTrigger user={person}>
                <button type="button" className="block truncate text-left text-sm font-semibold text-white hover:underline">
                  {person.name}
                  {isYou && <span className="ml-1.5 text-xs font-medium text-violet-400">(You)</span>}
                </button>
              </HoverProfileTrigger>
              <p className="text-xs text-zinc-500">{person.score.toLocaleString()} pts</p>
            </div>

            <FollowButton userId={person.id} size="sm" />
          </div>
        );
      })}
    </div>
  );
}
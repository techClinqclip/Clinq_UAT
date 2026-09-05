import { Sparkles } from "lucide-react";
import Avatar from "./Avatar";
import { useLeaderboard } from "../LeaderboardContext";

export default function CurrentUserPinnedCard() {
  const { currentUserRanked, currentUserInTop20, openProfile } = useLeaderboard();

  // Only show when the current user exists in this filtered view AND
  // isn't already visible in the top 20 (where they'd get the
  // highlighted-row treatment instead).
  if (!currentUserRanked || currentUserInTop20) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <button
        type="button"
        onClick={() => openProfile(currentUserRanked.id)}
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-violet-500/50 bg-[#15151F]/95 p-4 shadow-2xl shadow-violet-500/20 backdrop-blur-xl transition hover:border-violet-500 hover:shadow-violet-500/30"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 text-sm font-bold text-violet-300">
          {currentUserRanked.rank}
        </div>

        <Avatar src={currentUserRanked.avatar} name={currentUserRanked.name} size={40} />

        <div className="min-w-0 flex-1 text-left">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
            {currentUserRanked.name}
            <Sparkles size={12} className="text-violet-400" />
          </p>
          <p className="text-xs text-zinc-500">Your current rank</p>
        </div>

        <span className="shrink-0 text-sm font-semibold text-violet-300">
          {currentUserRanked.score.toLocaleString()} pts
        </span>
      </button>
    </div>
  );
}
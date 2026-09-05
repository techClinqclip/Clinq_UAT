import Avatar from "./Avatar";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";
import FollowButton from "../../../shared/social/FollowButton";
import { useLeaderboard } from "../LeaderboardContext";

const ROLE_STYLES = {
  Creator: "bg-violet-500/10 text-violet-300",
  Clipper: "bg-emerald-500/10 text-emerald-300",
  Brand: "bg-amber-500/10 text-amber-300",
};

export default function LeaderboardRow({ person }) {
  const { currentUserRanked } = useLeaderboard();
  const isYou = currentUserRanked && person.id === currentUserRanked.id;

  return (
    <div
      className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition ${
        isYou
          ? "border-violet-500/50 bg-violet-500/[0.06]"
          : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
      }`}
    >
      <span className="w-6 shrink-0 text-center text-sm font-semibold text-zinc-500">{person.rank}</span>

      <HoverProfileTrigger user={person}>
        <button type="button">
          <Avatar src={person.avatar} name={person.name} size={36} />
        </button>
      </HoverProfileTrigger>

      <div className="min-w-0 flex-1">
        <HoverProfileTrigger user={person}>
          <button type="button" className="flex items-center gap-1.5 text-left">
            <span className="truncate text-sm font-medium text-white hover:underline">{person.name}</span>
            {isYou && <span className="shrink-0 text-xs font-medium text-violet-400">(You)</span>}
          </button>
        </HoverProfileTrigger>
        <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_STYLES[person.role] || "bg-white/10 text-zinc-400"}`}>
          {person.role}
        </span>
      </div>

      <span className="shrink-0 text-sm font-semibold text-zinc-300">{person.score.toLocaleString()}</span>

      <FollowButton userId={person.id} size="sm" />
    </div>
  );
}
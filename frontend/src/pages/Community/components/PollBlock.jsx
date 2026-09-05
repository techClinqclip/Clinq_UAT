import { Check } from "lucide-react";
import { useCommunity } from "../CommunityContext";

export default function PollBlock({ threadId, poll }) {
  const { votedPolls, votePoll } = useCommunity();
  const votedOptionId = votedPolls[threadId];
  const hasVoted = Boolean(votedOptionId);
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0) || 1;

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {poll.question && (
        <p className="mb-3 text-sm font-medium text-white">{poll.question}</p>
      )}

      <div className="space-y-2">
        {poll.options.map((opt) => {
          const pct = Math.round((opt.votes / totalVotes) * 100);
          const isSelected = votedOptionId === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                votePoll(threadId, opt.id);
              }}
              disabled={hasVoted}
              className={`relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                isSelected
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 bg-black/20 hover:border-white/20"
              } ${hasVoted ? "cursor-default" : "cursor-pointer"}`}
            >
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-violet-500/10"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-2 text-zinc-200">
                  {isSelected && <Check size={13} className="text-violet-400" />}
                  {opt.label}
                </span>
                {hasVoted && (
                  <span className="text-xs font-medium text-zinc-400">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        {!hasVoted && " · Tap an option to vote"}
      </p>
    </div>
  );
}
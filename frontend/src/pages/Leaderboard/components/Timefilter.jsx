import { useLeaderboard } from "../LeaderboardContext";

const OPTIONS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "overall", label: "Overall" },
];

export default function TimeFilter() {
  const { timeFilter, setTimeFilter } = useLeaderboard();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => setTimeFilter(opt.key)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            timeFilter === opt.key
              ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
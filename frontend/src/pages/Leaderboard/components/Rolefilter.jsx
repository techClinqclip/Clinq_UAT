import { useLeaderboard } from "../LeaderboardContext";

export default function RoleFilter() {
  const { ROLES, roleFilter, setRoleFilter } = useLeaderboard();

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => setRoleFilter(role)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            roleFilter === role ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}
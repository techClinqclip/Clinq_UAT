import { Trophy } from "lucide-react";
import { LeaderboardProvider, useLeaderboard } from "./LeaderboardContext";
import LeaderboardLayout from "./LeaderboardLayout";
import RoleFilter from "./components/RoleFilter";
import TimeFilter from "./components/TimeFilter";
import PodiumTop3 from "./components/PodiumTop3";
import SpecialRankCards from "./components/SpecialRankCards";
import LeaderboardRow from "./components/LeaderboardRow";
import CurrentUserPinnedCard from "./components/CurrentUserPinnedCard";

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {children}
      </span>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  );
}

function LeaderboardBody() {
  const { rest6to20, ranked, currentUserInTop20 } = useLeaderboard();

  return (
    <div className={`mx-auto max-w-4xl px-6 py-10 ${currentUserInTop20 ? "" : "pb-28"}`}>
      {/* Header */}
      <div className="flex flex-col items-center gap-5 border-b border-white/5 pb-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/10">
            <Trophy size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Leaderboard</h1>
            <p className="mt-1 text-sm text-zinc-500">See how you stack up against the community</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <RoleFilter />
          <TimeFilter />
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-zinc-500">No entries for this filter yet.</p>
        </div>
      ) : (
        <>
          {/* Podium panel */}
          <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-10 sm:px-10">
            <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="relative">
              <PodiumTop3 />
            </div>
          </div>

          {/* Rising stars (4-5) */}
          <div className="mt-10 space-y-4">
            <SectionLabel>Rising Stars</SectionLabel>
            <SpecialRankCards />
          </div>

          {/* Full ranking (6-20) */}
          {rest6to20.length > 0 && (
            <div className="mt-10 space-y-4">
              <SectionLabel>Full Ranking</SectionLabel>
              <div className="space-y-2">
                {rest6to20.map((person) => (
                  <LeaderboardRow key={person.id} person={person} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CurrentUserPinnedCard />
    </div>
  );
}

export default function Leaderboard() {
  // ProfileModal, QuickMessageModal, MessagingProvider, and SocialProvider
  // all live globally in main.jsx now.
  return (
    <LeaderboardProvider>
      <LeaderboardLayout>
        <LeaderboardBody />
      </LeaderboardLayout>
    </LeaderboardProvider>
  );
}
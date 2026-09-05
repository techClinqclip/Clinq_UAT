import { createContext, useContext, useMemo, useState } from "react";
import { entries as rawEntries, currentUser } from "./leaderboardData";

const LeaderboardContext = createContext(null);

const ROLES = ["All", "Creators", "Clippers", "Brands"];
const ROLE_MAP = { Creators: "Creator", Clippers: "Clipper", Brands: "Brand" };

export function LeaderboardProvider({ children }) {
  const [roleFilter, setRoleFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState("overall"); // "weekly" | "monthly" | "overall"

  // Everyone (including the current user) in one pool so ranking, hover
  // cards, and the profile modal can all look someone up by id.
  const allPeople = useMemo(() => [...rawEntries, currentUser], []);

  const usersById = useMemo(() => {
    const map = {};
    allPeople.forEach((p) => (map[p.id] = p));
    return map;
  }, [allPeople]);

  // Recompute ranking whenever the role or time filter changes. Ranks are
  // computed WITHIN the filtered set, so "Creators only" ranks 1-N among
  // creators, not the whole board.
  const ranked = useMemo(() => {
    const targetRole = ROLE_MAP[roleFilter];
    const pool = targetRole ? allPeople.filter((p) => p.role === targetRole) : allPeople;

    return [...pool]
      .sort((a, b) => b.scores[timeFilter] - a.scores[timeFilter])
      .map((person, i) => ({ ...person, rank: i + 1, score: person.scores[timeFilter] }));
  }, [allPeople, roleFilter, timeFilter]);

  const currentUserRanked = ranked.find((p) => p.id === currentUser.id) || null;
  const currentUserInTop20 = currentUserRanked ? currentUserRanked.rank <= 20 : false;

  const value = {
    ROLES,
    usersById,
    ranked,
    top3: ranked.slice(0, 3),
    special4and5: ranked.slice(3, 5),
    rest6to20: ranked.slice(5, 20),
    currentUserRanked,
    currentUserInTop20,
    roleFilter,
    setRoleFilter,
    timeFilter,
    setTimeFilter,
  };

  return <LeaderboardContext.Provider value={value}>{children}</LeaderboardContext.Provider>;
}

export function useLeaderboard() {
  const ctx = useContext(LeaderboardContext);
  if (!ctx) throw new Error("useLeaderboard must be used inside LeaderboardProvider");
  return ctx;
}
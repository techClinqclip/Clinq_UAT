import { createContext, useContext, useState } from "react";

const SocialContext = createContext(null);

// One global follow-state + profile-modal store for the whole app.
// User IDs never collide across pages (Community: u1-u5, Leaderboard:
// l1-l24, Marketplace: sc_*/te_*), so there's no reason this needs to be
// split per-page — same reasoning as MessagingContext/NotificationContext.
export function SocialProvider({ children }) {
  const [followedIds, setFollowedIds] = useState(new Set());
  const [activeProfile, setActiveProfile] = useState(null);

  const toggleFollow = (userId) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  // Takes the FULL user object (not just an id) — this is what lets
  // ProfileModal render without needing to know which page's usersById
  // map to look the person up in.
  const openProfile = (user) => setActiveProfile(user);
  const closeProfile = () => setActiveProfile(null);

  const value = { followedIds, toggleFollow, activeProfile, openProfile, closeProfile };

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used inside SocialProvider");
  return ctx;
}
import { useState } from "react";
import { X, MoreHorizontal, BadgeCheck, Calendar, Trophy, Users, Crown, Medal, Star, IndianRupee } from "lucide-react";
import Avatar from "../../pages/Community/components/Avatar";
import { useSocial } from "./SocialContext";
import { useMessaging } from "../messaging/MessagingContext";

const TABS = ["Created", "Joined", "Reviews"];

function rankBadge(rank) {
  if (rank === 1) return { icon: Crown, className: "text-amber-400", label: "1st Place" };
  if (rank === 2) return { icon: Trophy, className: "text-zinc-300", label: "2nd Place" };
  if (rank === 3) return { icon: Medal, className: "text-orange-400", label: "3rd Place" };
  return null;
}

const formatCompact = (n) =>
  typeof n === "number" ? new Intl.NumberFormat("en-IN", { notation: "compact" }).format(n) : n;

// One profile modal for the whole app. It adapts to whatever fields exist
// on the user object it's handed — user.tabs → Community-style people get
// the Created/Joined/Reviews tabs, user.rank → Leaderboard people get a
// podium badge, user.followers/earned → Marketplace sidebar people get a
// simple stat line. No page-specific branching needed anywhere else.
export default function ProfileModal() {
  const { activeProfile, closeProfile, followedIds, toggleFollow } = useSocial();
  const { openQuickMessage } = useMessaging();
  const [activeTab, setActiveTab] = useState("Created");

  if (!activeProfile) return null;
  const user = activeProfile;

  const following = followedIds.has(user.id);
  const badge = rankBadge(user.rank);
  const hasTabs = Boolean(user.tabs);
  const items = hasTabs ? user.tabs[activeTab.toLowerCase()] || [] : [];

  const handleClose = () => {
    setActiveTab("Created");
    closeProfile();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl"
      >
        {/* Cover + avatar wrapper — not overflow-hidden, so the avatar
            never gets clipped by the cover or a scroll container. */}
        <div className="relative shrink-0">
          <div className="h-32 overflow-hidden">
            {user.cover ? (
              <img src={user.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11111A] via-transparent to-black/20" />
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-xl bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
          >
            <X size={18} />
          </button>

          {badge && (
            <div className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur-sm ${badge.className}`}>
              <badge.icon size={13} />
              {badge.label}
            </div>
          )}

          <div className="absolute -bottom-10 left-6 rounded-2xl ring-4 ring-[#11111A]">
            <Avatar src={user.avatar} name={user.name} size={84} className="rounded-2xl" />
          </div>
        </div>

        <div className="overflow-y-auto">
          <div className="px-6 pb-5 pt-14">
            <div className="flex justify-end gap-2">
              {/* <button
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                <IndianRupee size={14} />
                Pay
              </button> */}
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              {user.verified && <BadgeCheck size={16} className="text-violet-400" />}
              {user.role && (
                <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium capitalize text-zinc-300">
                  {user.role}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">@{user.username}</p>

            {user.tagline && <p className="mt-2 text-sm text-zinc-300">{user.tagline}</p>}
            {user.bio && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">{user.bio}</p>}

            {user.joined && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
                <Calendar size={13} />
                Joined {user.joined}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {user.rank && (
                <span className="text-white">#{user.rank} <span className="text-zinc-500">Rank</span></span>
              )}
              {user.score !== undefined && (
                <span className="text-white">{formatCompact(user.score)} <span className="text-zinc-500">Score</span></span>
              )}
              {user.followers !== undefined && (
                <span className="text-white">{formatCompact(user.followers)} <span className="text-zinc-500">Followers</span></span>
              )}
              {/* {user.following !== undefined && (
                <span className="text-white">{formatCompact(user.following)} <span className="text-zinc-500">Following</span></span>
              )} */}
              {user.earned && (
                <span className="text-white">{user.earned} <span className="text-zinc-500">Earned this week</span></span>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              {/* <button
                type="button"
                onClick={() => toggleFollow(user.id)}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                  following
                    ? "border border-white/15 bg-white/5 text-zinc-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                    : "bg-violet-600 text-white hover:bg-violet-500"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button> */}
              {/* <button
                type="button"
                onClick={() => openQuickMessage(user)}
                className="flex-1 rounded-full border border-white/10 bg-white/5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Message
              </button> */}
            </div>
          </div>

          {hasTabs && (
            <>
              <div className="flex gap-1 border-b border-white/10 px-6">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-4 pb-3 text-sm font-medium transition ${
                      activeTab === tab ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" />
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-3 p-6">
                {items.length > 0 ? (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                        <Users size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{item.title}</p>
                        <p className="truncate text-xs text-zinc-500">{item.subtitle}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-zinc-400">{item.members} members</p>
                        {item.rating && (
                          <p className="flex items-center justify-end gap-1 text-xs text-amber-400">
                            <Star size={11} className="fill-amber-400" />
                            {item.rating} ({item.reviews})
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    Nothing to show in {activeTab.toLowerCase()} yet.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
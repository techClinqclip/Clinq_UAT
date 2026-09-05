import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import { CommunityProvider, useCommunity } from "./CommunityContext";
import CommunityLayout from "./CommunityLayout";
import Avatar from "./components/Avatar";
import FollowButton from "../../shared/social/FollowButton";
import HoverProfileTrigger from "../../shared/social/HoverProfileTrigger";

function AllUsersBody() {
  const { users, loading, error } = useCommunity();
  const [query, setQuery] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link
        to="/community"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft size={15} />
        Back to Townhall
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">People to Follow</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Discover creators, clippers, and brands across Clinq.
        </p>
      </div>

      <div className="relative mb-6">
        <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
  {loading ? (
    Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      >
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/10" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
        </div>
        <div className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-white/10" />
      </div>
    ))
  ) : error ? (
    <p className="col-span-full py-16 text-center text-sm text-rose-300">Unable to load users: {error}</p>
  ) : filtered.length > 0 ? (
    filtered.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20"
            >
              <HoverProfileTrigger user={user}>
                <button type="button">
                  <Avatar src={user.avatar} name={user.name} size={44} />
                </button>
              </HoverProfileTrigger>

              <div className="min-w-0 flex-1">
                <HoverProfileTrigger user={user}>
                  <button type="button" className="block truncate text-left text-sm font-semibold text-white hover:underline">
                    {user.name}
                  </button>
                </HoverProfileTrigger>
                <p className="truncate text-xs text-zinc-500">
                  {user.tagline || `@${user.username}`}
                </p>
              </div>

              <FollowButton userId={user.id} size="sm" />
            </div>
          ))
        ) : (
          <p className="col-span-full py-16 text-center text-sm text-zinc-500">
            No matches for "{query}".
          </p>
        )}
      </div>
    </div>
  );
}

export default function AllUsers() {
  // ProfileModal + QuickMessageModal now render globally in main.jsx.
  return (
    <CommunityProvider>
      <CommunityLayout>
        <AllUsersBody />
      </CommunityLayout>
    </CommunityProvider>
  );
}
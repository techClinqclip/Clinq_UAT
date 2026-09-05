import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "../../../shared/social/FollowButton";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";
import { useCommunity } from "../CommunityContext";

export default function PopularUsers() {
  const { usersById, users, loading } = useCommunity();
  const featuredUsers = users.slice(0, 4);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Popular users</h3>
        <Link
          to="/community/people"
          className="text-sm font-medium text-violet-400 transition hover:text-violet-300"
        >
          See all
        </Link>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
              </div>
              <div className="h-7 w-16 shrink-0 animate-pulse rounded-full bg-white/10" />
            </div>
          ))
        ) : (
          featuredUsers.map((user) => {
            if (!user || !usersById[user.id]) return null;

            return (
              <div key={user.id} className="flex items-center gap-3">
                <HoverProfileTrigger user={user}>
                  <button type="button">
                    <Avatar src={user.avatar} name={user.name} size={40} />
                  </button>
                </HoverProfileTrigger>

                <div className="min-w-0 flex-1">
                  <HoverProfileTrigger user={user}>
                    <button type="button" className="flex items-center gap-1 text-left">
                      <span className="truncate text-sm font-medium text-white hover:underline">{user.name}</span>
                      {user.verified && <BadgeCheck size={13} className="shrink-0 text-violet-400" />}
                    </button>
                  </HoverProfileTrigger>
                  <p className="truncate text-xs text-zinc-500">{user.tagline || `@${user.username}`}</p>
                </div>

                <FollowButton userId={user.id} size="sm" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
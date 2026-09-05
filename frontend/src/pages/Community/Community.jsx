import { useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { CommunityProvider, useCommunity } from "./CommunityContext";
import CommunityLayout from "./CommunityLayout";
import PostComposer from "./components/PostComposer";
import ThreadCard from "./components/ThreadCard";
import FiltersBar from "./components/FiltersBar";
import CommentModal from "./components/Commendmodal";

// Maps whatever raw error string/status we got into copy a person
// can actually act on, instead of dumping the raw error message.
function describeError(error) {
  const raw = String(error || "").toLowerCase();

  if (/session has expired|sign in again|401|unauthorized/.test(raw)) {
    return {
      title: "You've been signed out",
      body: "Please sign in again to view and post to the community.",
      icon: null,
    };
  }
  if (/failed to fetch|networkerror|network request failed|offline/.test(raw)) {
    return {
      title: "You're offline",
      body: "Check your internet connection and try again.",
      icon: WifiOff,
    };
  }
  if (/500|internal server error/.test(raw)) {
    return {
      title: "Something went wrong on our end",
      body: "We're having trouble loading the community right now. Please try again in a moment.",
      icon: null,
    };
  }
  if (/404|not found/.test(raw)) {
    return {
      title: "Community not found",
      body: "We couldn't find what you were looking for.",
      icon: null,
    };
  }
  return {
    title: "Couldn't load the community",
    body: "Something unexpected happened. Please try again.",
    icon: null,
  };
}

function CommunityFeed() {
  const { threads, loading, error, reload } = useCommunity();
  const [filter, setFilter] = useState("All");

  const visibleThreads = threads.filter((t) => {
    // if (filter === "Following") return followedIds.has(t.userId);
    // if (filter === "Joined") return false;
    if (filter === "Trending") return t.views > 10000;
    return true;
  });

  return (
    <div className="flex gap-8 ml-10 ">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            Townhall
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </h1>
          <FiltersBar active={filter} onChange={setFilter} />
        </div>

        <PostComposer />

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-32 animate-pulse rounded bg-white/10" />
                      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3.5 w-full animate-pulse rounded bg-white/10" />
                    <div className="h-3.5 w-4/5 animate-pulse rounded bg-white/10" />
                  </div>
                  <div className="mt-4 flex gap-4">
                    <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : error && visibleThreads.length === 0 ? (
            (() => {
              const { title, body, icon: Icon } = describeError(error);
              return (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 py-16 text-center">
                  {Icon && <Icon className="text-rose-300" size={28} />}
                  <div>
                    <p className="text-sm font-medium text-rose-200">{title}</p>
                    <p className="mt-1 text-sm text-rose-200/70">{body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={reload}
                    className="mt-2 flex items-center gap-1.5 rounded-full border border-rose-500/30 px-4 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/10"
                  >
                    <RefreshCw size={13} />
                    Try again
                  </button>
                </div>
              );
            })()
          ) : visibleThreads.length > 0 ? (
            visibleThreads.map((thread) => <ThreadCard key={thread.id} thread={thread} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
              <p className="text-sm text-zinc-500">
                {filter === "Following"
                  ? "Follow some creators to see their posts here."
                  : "Nothing here yet — be the first to post."}
              </p>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 lg:block">
        {/* <div className="sticky top-6">
          <PopularUsers />
        </div> */}
      </aside>
    </div>
  );
}

export default function Community() {
  return (
    <CommunityProvider>
      <CommunityLayout>
        <div className="mx-auto max-w-6xl px-6 py-8">
          <CommunityFeed />
        </div>
      </CommunityLayout>
      <CommentModal />
    </CommunityProvider>
  );
}
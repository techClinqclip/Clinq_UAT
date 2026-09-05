import { useState } from "react";
import { Heart, MessageCircle, Share2, Eye, MoreHorizontal, ArrowUpRight } from "lucide-react";
import Avatar from "./Avatar";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";
import PollBlock from "./PollBlock";
import ShareDialog from "./ShareDialog";
import { useCommunity } from "../CommunityContext";

const formatCompact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function normalizeRenderMedia(media) {
  if (!media) return [];
  if (typeof media === "string") return [media];
  if (Array.isArray(media)) return media.flatMap((item) => normalizeRenderMedia(item));
  if (typeof media === "object") {
    const direct = [media.url, media.preview, media.src, media.image, media.image_url, media.thumbnail, media.cover, media.video, media.video_url, media.media_url, media.gif, media.poster]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim());
    if (direct.length > 0) return direct;
    return Object.values(media).flatMap((item) => normalizeRenderMedia(item));
  }
  return [];
}

export default function ThreadCard({ thread }) {
  const { usersById, toggleLike, openComments } = useCommunity();
  const [shareOpen, setShareOpen] = useState(false);
  const user = usersById[thread.userId];
  const mediaUrls = normalizeRenderMedia(thread.media);

  if (!user) return null;

  return (
    <>
      <article className="rounded-2xl border border-white/10 bg-[#11111A] p-5 transition hover:border-white/15">
        {thread.source && (
          <p className="mb-3 flex items-center gap-1 text-xs text-zinc-500">
            <span className="text-zinc-400">{thread.source.label}</span>
            <ArrowUpRight size={11} />
            <span>· {thread.sourceType || "Public forum"}</span>
          </p>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <HoverProfileTrigger user={user}>
              <button type="button" className="block">
                <Avatar src={user.avatar} name={user.name} size={40} />
              </button>
            </HoverProfileTrigger>

            <div>
              <HoverProfileTrigger user={user}>
                <button type="button" className="flex flex-wrap items-center gap-1.5 text-left">
                  <span className="font-semibold text-white hover:underline">{user.name}</span>
                  <span className="text-sm text-zinc-500">@{user.username}</span>
                </button>
              </HoverProfileTrigger>
              <p className="text-xs text-zinc-500">{thread.timestamp}</p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>

        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-200">
          {thread.article}
        </p>

        {mediaUrls.length > 0 && (
          <div className="mt-3 grid gap-2">
            {mediaUrls.map((src, idx) => (
              <div key={`${thread.id}-media-${idx}`} className="overflow-hidden rounded-2xl border border-white/10">
                <img src={src} alt="" className="max-h-96 w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {thread.poll && <PollBlock threadId={thread.id} poll={thread.poll} />}

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleLike(thread.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${
                thread.liked
                  ? "text-rose-400 hover:bg-rose-500/10"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Heart size={16} className={thread.liked ? "fill-rose-400" : ""} />
              {formatCompact(thread.likes)}
            </button>

            <button
              type="button"
              onClick={() => openComments(thread.id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <MessageCircle size={16} />
              {formatCompact(thread.comments)}
            </button>

            <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-zinc-500">
              <Eye size={16} />
              {formatCompact(thread.views)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            <Share2 size={15} />
          </button>
        </div>
      </article>

      <ShareDialog isOpen={shareOpen} onClose={() => setShareOpen(false)} threadId={thread.id} />
    </>
  );
}
import { useState } from "react";
import { X, Send } from "lucide-react";
import Avatar from "./Avatar";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";
import { useCommunity } from "../CommunityContext";

function formatTime(ts) {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function CommentModal() {
  const { threads, usersById, activeCommentThreadId, closeComments, getComments, addComment } = useCommunity();
  const [text, setText] = useState("");

  if (!activeCommentThreadId) return null;

  const thread = threads.find((t) => t.id === activeCommentThreadId);
  if (!thread) return null;

  const threadAuthor = usersById[thread.userId];
  const comments = getComments(thread.id);
  const currentUser = usersById["u_me"];

  const handleSend = () => {
    if (!text.trim()) return;
    addComment(thread.id, text);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={closeComments}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h3 className="text-lg font-semibold text-white">Comments</h3>
          <button
            type="button"
            onClick={closeComments}
            className="rounded-xl p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Original thread preview */}
        {threadAuthor && (
          <div className="border-b border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-start gap-3">
              <Avatar src={threadAuthor.avatar} name={threadAuthor.name} size={36} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm">
                  <span className="font-semibold text-white">{threadAuthor.name}</span>
                  <span className="text-zinc-500">@{threadAuthor.username}</span>
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{thread.article}</p>
              </div>
            </div>
          </div>
        )}

        {/* Comments list */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {comments.length > 0 ? (
            comments.map((comment) => {
              const author = usersById[comment.userId];
              if (!author) return null;

              return (
                <div key={comment.id} className="flex items-start gap-3">
                  <HoverProfileTrigger user={author}>
                    <button type="button">
                      <Avatar src={author.avatar} name={author.name} size={32} />
                    </button>
                  </HoverProfileTrigger>

                  <div className="min-w-0 flex-1">
                    <div className="rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                      <HoverProfileTrigger user={author}>
                        <button type="button" className="text-sm font-medium text-white hover:underline">
                          {author.name}
                        </button>
                      </HoverProfileTrigger>
                      <p className="mt-0.5 text-sm leading-5 text-zinc-300">{comment.text}</p>
                    </div>
                    <p className="mt-1 pl-3.5 text-xs text-zinc-500">{formatTime(comment.timestamp)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
              <p className="text-sm text-zinc-500">No comments yet.</p>
              <p className="text-xs text-zinc-600">Be the first to say something.</p>
            </div>
          )}
        </div>

        {/* Reply box */}
        <div className="flex items-center gap-2.5 border-t border-white/10 p-4">
          <Avatar src={currentUser?.avatar} name={currentUser?.name} size={32} />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment..."
            className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
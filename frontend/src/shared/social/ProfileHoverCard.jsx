import { useState } from "react";
import { MoreHorizontal, ArrowUp, Trophy } from "lucide-react";
import Avatar from "../../pages/Community/components/Avatar";
import { useMessaging } from "../messaging/MessagingContext";
import { useSocial } from "./SocialContext";

export default function ProfileHoverCard({ user }) {
  const { sendMessage } = useMessaging();
  const { followedIds, toggleFollow, openProfile } = useSocial();
  const [text, setText] = useState("");

  const isFollowing = followedIds.has(user.id);
  const goToProfile = () => openProfile(user);

  // const handleSend = () => {
  //   if (!text.trim()) return;
  //   sendMessage(user, text);
  //   setText("");
  // };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
<div
  className="w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#15151F] shadow-2xl"
  onClick={(e) => e.stopPropagation()}
>
  <div
    onClick={goToProfile}
    className="relative h-16 cursor-pointer bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent"
  >
    {user.cover && (
      <img src={user.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
    )}
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-zinc-300 backdrop-blur-sm transition hover:bg-black/60 hover:text-white"
    >
      <MoreHorizontal size={15} />
    </button>
  </div>

  <div className="px-5 pb-5 relative z-10">
        <div className="flex items-end justify-between">
          <button
            type="button"
            onClick={goToProfile}
            className="-mt-7 rounded-full ring-4 ring-[#15151F] transition hover:scale-[1.03]"
          >
            <Avatar src={user.avatar} name={user.name} size={64} />
          </button>

          {/* <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFollow(user.id);
            }}
            className={`mb-1 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              isFollowing
                ? "border border-white/15 bg-white/5 text-zinc-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                : "bg-violet-600 text-white hover:bg-violet-500"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button> */}
        </div>

        <button type="button" onClick={goToProfile} className="mt-3 block text-left">
          <p className="flex items-center gap-1 font-semibold text-white hover:underline">{user.name}</p>
          <p className="text-sm text-zinc-500">@{user.username}</p>
        </button>

        {user.rank && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
            <Trophy size={12} />
            Rank #{user.rank} · {user.score?.toLocaleString()} pts
          </div>
        )}

        {user.followedByCount > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2">
              {(user.followedByPreview || []).slice(0, 3).map((src, i) => (
                <img key={i} src={src} alt="" className="h-5 w-5 rounded-full border-2 border-[#15151F] object-cover" />
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Followed by <span className="text-zinc-300">{(user.followedByPreview || []).length > 0 ? "friends" : "others"}</span> + {user.followedByCount} more
            </p>
          </div>
        )}

        {(user.followers || user.earned) && !user.followedByCount && (
          <p className="mt-2 text-xs font-medium text-violet-300">
            {user.followers ? `${user.followers} followers` : `${user.earned} earned this week`}
          </p>
        )}

        <p className="mt-3 text-sm italic text-zinc-500">
          {user.bio ? user.bio.split("\n")[0] : "No description"}
        </p>

        {/* <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder="Send message"
            className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSend();
            }}
            disabled={!text.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={15} />
          </button>
        </div> */}
      </div>
    </div>
  );
}
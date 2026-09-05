import { useSocial } from "./SocialContext";

export default function FollowButton({ userId, size = "md", className = "" }) {
  const { followedIds, toggleFollow } = useSocial();
  const following = followedIds.has(userId);

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2 text-sm",
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleFollow(userId);
      }}
      className={`shrink-0 rounded-full font-medium transition ${sizes[size]} ${
        following
          ? "border border-white/15 bg-white/5 text-zinc-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
          : "bg-violet-600 text-white hover:bg-violet-500"
      } ${className}`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
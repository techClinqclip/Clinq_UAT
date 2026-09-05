import { Star } from "lucide-react";
import SidebarCard from "./SidebarCard";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";
import { featuredCreator } from "./sidebarData";

export default function FeaturedCreator() {
  return (
    <SidebarCard title="Featured Creator" icon={Star}>
      <HoverProfileTrigger user={featuredCreator}>
        <button type="button" className="flex w-full items-center gap-4 text-left">
          <img
            src={featuredCreator.avatar}
            alt={featuredCreator.name}
            className="h-14 w-14 rounded-full border-2 border-violet-500/30 object-cover"
          />
          <div>
            <h4 className="font-medium text-white hover:underline">{featuredCreator.name}</h4>
            <p className="text-sm text-zinc-400">@{featuredCreator.username}</p>
            <p className="mt-1 text-xs text-violet-300">{featuredCreator.followers} Followers</p>
          </div>
        </button>
      </HoverProfileTrigger>
    </SidebarCard>
  );
}
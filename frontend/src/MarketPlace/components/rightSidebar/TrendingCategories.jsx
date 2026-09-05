import { Hash } from "lucide-react";
import SidebarCard from "./SidebarCard";

function prettifyCategory(category) {
  return String(category || "").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TrendingCategories({ campaigns = [] }) {
  const categoryMap = campaigns.reduce((acc, campaign) => {
    const category = campaign.category || "General";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const trendingCategories = Object.entries(categoryMap)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 5)
    .map(([category, count]) => ({
      id: category,
      label: prettifyCategory(category),
      count,
    }));

  return (
    <SidebarCard title="Trending Categories" icon={Hash}>
      <div className="flex flex-wrap gap-2">
        {trendingCategories.length === 0 ? (
          <span className="text-sm text-zinc-400">No category data available yet.</span>
        ) : (
          trendingCategories.map((category) => (
            <span
              key={category.id}
              className="cursor-pointer rounded-full bg-violet-500/10 px-3 py-1 text-sm text-violet-300 transition hover:bg-violet-500/20"
            >
              #{category.label}
            </span>
          ))
        )}
      </div>
    </SidebarCard>
  );
}
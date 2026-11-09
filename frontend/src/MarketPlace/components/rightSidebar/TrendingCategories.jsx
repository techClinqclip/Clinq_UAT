import { Hash } from "lucide-react";
import SidebarCard from "./SidebarCard";

function prettifyCategory(category) {
  return String(category || "").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TrendingCategories({ campaigns = [], onCategoryClick, activeCategory = "all" }) {
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
      value: category.toLowerCase(),
      label: prettifyCategory(category),
      count,
    }));

  const hasHandler = typeof onCategoryClick === "function";

  return (
    <SidebarCard title="Trending Categories" icon={Hash}>
      {!hasHandler && (
        <p className="mb-2 text-xs text-zinc-500">Categories found in this marketplace.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {trendingCategories.length === 0 ? (
          <span className="text-sm text-zinc-400">No category data available yet.</span>
        ) : (
          trendingCategories.map((category) => {
            const isActive = activeCategory === category.value;
            return hasHandler ? (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryClick(isActive ? "all" : category.value)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                }`}
              >
                #{category.label}
              </button>
            ) : (
              <span
                key={category.id}
                className="rounded-full bg-violet-500/10 px-3 py-1 text-sm text-violet-300"
              >
                #{category.label}
              </span>
            );
          })
        )}
      </div>
    </SidebarCard>
  );
}
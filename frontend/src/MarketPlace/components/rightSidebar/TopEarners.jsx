import { Briefcase } from "lucide-react";
import SidebarCard from "./SidebarCard";

export default function TopEarners({ campaigns = [] }) {
  // Deduplicate brands from live marketplace campaigns.
  const seen = new Set();
  const activeBrands = campaigns
    .filter((c) => c && (c.brandName || c.brand))
    .reduce((acc, c) => {
      const name = c.brandName || c.brand;
      if (!seen.has(name)) {
        seen.add(name);
        acc.push({
          id: c.id || name,
          name,
          campaignCount: 0,
        });
      }
      return acc;
    }, []);

  // Count campaigns per brand.
  campaigns.forEach((c) => {
    const name = c.brandName || c.brand;
    const entry = activeBrands.find((b) => b.name === name);
    if (entry) entry.campaignCount += 1;
  });

  const topBrands = activeBrands
    .sort((a, b) => b.campaignCount - a.campaignCount)
    .slice(0, 3);

  return (
    <SidebarCard title="Active Brands" icon={Briefcase} accentClass="text-violet-400">
      <div className="space-y-3">
        {topBrands.length === 0 ? (
          <p className="text-sm text-zinc-400">Brand data will appear here as campaigns are published.</p>
        ) : (
          topBrands.map((brand, i) => (
            <div key={brand.id} className="flex items-center gap-3">
              <span className={`w-4 text-xs font-bold ${i === 0 ? "text-violet-400" : "text-zinc-500"}`}>
                {i + 1}
              </span>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-300">
                {brand.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{brand.name}</p>
              </div>
              <span className="text-xs text-zinc-400">
                {brand.campaignCount} {brand.campaignCount === 1 ? "campaign" : "campaigns"}
              </span>
            </div>
          ))
        )}
      </div>
    </SidebarCard>
  );
}
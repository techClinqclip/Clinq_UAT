import { BarChart3 } from "lucide-react";
import SidebarCard from "./SidebarCard";

function formatCount(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(value);
}

export default function PlatformStats({ campaigns = [] }) {
  const campaignCount = campaigns.length;
  const creatorCount = new Set(
    campaigns
      .map((campaign) => campaign.creatorEmail || campaign.creator || campaign.creatorId)
      .filter(Boolean)
  ).size;
  const brandCount = new Set(
    campaigns
      .map((campaign) => campaign.brandName || campaign.brand || "Brand")
      .filter(Boolean)
  ).size;

  const stats = [
    { label: "Campaigns", value: formatCount(campaignCount) },
    { label: "Creators", value: formatCount(creatorCount) },
    { label: "Brands", value: formatCount(brandCount) },
  ];

  return (
    <SidebarCard title="Platform Stats" icon={BarChart3}>
      <div className="space-y-3">
        {stats.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
            <span className="text-sm text-zinc-400">{item.label}</span>
            <span className="font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </SidebarCard>
  );
}
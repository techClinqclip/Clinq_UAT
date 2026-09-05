import { Crown } from "lucide-react";
import SidebarCard from "./SidebarCard";
import HoverProfileTrigger from "../../../shared/social/HoverProfileTrigger";

function formatMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "₹0";
  if (amount >= 100000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function TopEarners({ campaigns = [] }) {
  const topEarners = [...campaigns]
    .filter((campaign) => campaign && (campaign.paidOut || campaign.maxEarnings || campaign.budget))
    .sort((a, b) => Number(b.paidOut || b.maxEarnings || b.budget || 0) - Number(a.paidOut || a.maxEarnings || a.budget || 0))
    .slice(0, 3)
    .map((campaign, index) => {
      const brandName = campaign.brandName || campaign.brand || "Brand";
      const email = campaign.creatorEmail || "brand";
      const userName = email.includes("@") ? email.split("@")[0] : email;

      return {
        id: campaign.id || `${brandName}-${index}`,
        name: brandName,
        username: userName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(brandName)}&background=7c3aed&color=fff`,
        earned: formatMoney(campaign.paidOut || campaign.maxEarnings || campaign.budget),
        bio: campaign.name || "Campaign payout",
      };
    });

  return (
    <SidebarCard title="Top Earners This Week" icon={Crown} accentClass="text-amber-400">
      <div className="space-y-3">
        {topEarners.length === 0 ? (
          <p className="text-sm text-zinc-400">Earnings data will appear here as campaigns are published.</p>
        ) : (
          topEarners.map((creator, i) => (
            <HoverProfileTrigger key={creator.id} user={creator}>
              <button type="button" className="flex w-full items-center gap-3 text-left">
                <span className={`w-4 text-xs font-bold ${i === 0 ? "text-amber-400" : "text-zinc-500"}`}>
                  {i + 1}
                </span>
                <img src={creator.avatar} alt={creator.name} className="h-8 w-8 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white hover:underline">{creator.name}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-400">{creator.earned}</span>
              </button>
            </HoverProfileTrigger>
          ))
        )}
      </div>
    </SidebarCard>
  );
}
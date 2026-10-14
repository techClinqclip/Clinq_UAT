import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import CampaignCard from "./components/CampaignCard";
import MarketplaceLoadingSkeleton from "../components/MarketplaceLoadingSkeleton";

const PAGE_SIZE = 12;

function normalizeCampaignList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function AllCampaigns({ campaigns = [], filters = {}, loading = false, error = null, onRetry }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters.search, filters.status, filters.category, filters.reward, filters.sort, filters.platform]);

  const filteredCampaigns = useMemo(() => {
    const query = String(filters.search || "").trim().toLowerCase();
    const status = String(filters.status || "all").toLowerCase();
    const category = String(filters.category || "all").toLowerCase();
    const reward = String(filters.reward || "all").toLowerCase();
    const platform = String(filters.platform || "All").toLowerCase();
    const sort = String(filters.sort || "newest").toLowerCase();

    const list = normalizeCampaignList(campaigns)
      .filter((campaign) => {
        if (!campaign) return false;

        const title = String(campaign.name || campaign.title || "").toLowerCase();
        const brand = String(campaign.brandName || campaign.brand || "").toLowerCase();
        const categoryName = String(campaign.category || "").toLowerCase();
        const campaignStatus = String(campaign.status || "active").toLowerCase();
        const platformList = Array.isArray(campaign.platforms) ? campaign.platforms.map((item) => String(item).toLowerCase()) : [];
        const budget = Number(campaign.budget || 0);

        if (query && !`${title} ${brand}`.includes(query)) {
          return false;
        }

        if (status !== "all" && status !== campaignStatus) {
          return false;
        }

        if (category !== "all" && categoryName !== category) {
          return false;
        }

        if (reward !== "all") {
          let matches = false;
          if (reward === "10k") matches = budget < 10000;
          if (reward === "50k") matches = budget >= 10000 && budget <= 50000;
          if (reward === "100k") matches = budget > 50000;
          if (!matches) return false;
        }

        if (platform !== "all" && !platformList.some((item) => item.includes(platform))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sort === "reward") return Number(b.budget || 0) - Number(a.budget || 0);
        if (sort === "popular") return Number(b.views || 0) - Number(a.views || 0);
        if (sort === "ending") {
          const aDate = a.endDate ? new Date(a.endDate).getTime() : Date.now();
          const bDate = b.endDate ? new Date(b.endDate).getTime() : Date.now();
          return aDate - bDate;
        }
        return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
      });

    return list;
  }, [campaigns, filters]);

  const visible = filteredCampaigns.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCampaigns.length;
  const hasAnyCampaigns = normalizeCampaignList(campaigns).length > 0;

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredCampaigns.length));
      setLoadingMore(false);
    }, 250);
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">All Campaigns</h2>
        <p className="mt-2 text-zinc-400">Browse every live campaign from our brand partners.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <MarketplaceLoadingSkeleton />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.03] px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle size={22} className="text-red-400" />
          </div>
          <div>
            <p className="font-medium text-red-400">Couldn't load campaigns</p>
            <p className="mt-1 text-sm text-zinc-500">
              {typeof error === "string" ? error : "Something went wrong while fetching campaigns."}
            </p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
            >
              <RotateCcw size={14} />
              Try again
            </button>
          )}
        </div>
      ) : !hasAnyCampaigns ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#11111A] px-6 py-10 text-center text-zinc-400">
          No campaigns are live right now — check back soon.
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#11111A] px-6 py-10 text-center text-zinc-400">
          No campaigns match your filters right now.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#16161F] px-8 py-3 text-sm font-medium text-white transition hover:border-violet-500 hover:bg-violet-500/10 disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={16} className="animate-spin" />}
                {loadingMore ? "Loading..." : "Load More Campaigns"}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-500">
              You&apos;ve reached the end — {filteredCampaigns.length} campaigns shown.
            </p>
          )}
        </>
      )}
    </section>
  );
}
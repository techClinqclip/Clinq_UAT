import { useMemo } from "react";
import { AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import CampaignCard from "./components/CampaignCard";
import MarketplaceLoadingSkeleton from "../components/MarketplaceLoadingSkeleton";

function normalizeCampaignList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function FeaturedCampaigns({ campaigns = [], loading = false, error = null, onRetry }) {
  const featuredCampaigns = useMemo(() => {
    return normalizeCampaignList(campaigns).slice(0, 8);
  }, [campaigns]);

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Featured Campaigns</h2>
        <p className="mt-2 text-zinc-400">Hand-picked campaigns from top brands.</p>
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
            <p className="font-medium text-red-400">Couldn't load featured campaigns</p>
            <p className="mt-1 text-sm text-zinc-500">
              {typeof error === "string" ? error : "Something went wrong while fetching these."}
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
      ) : featuredCampaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 bg-[#11111A] px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <Sparkles size={22} className="text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-300">No featured campaigns yet</p>
            <p className="mt-1 text-sm text-zinc-500">Hand-picked campaigns will show up here once they're live.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </section>
  );
}

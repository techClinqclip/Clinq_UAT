import { useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import CampaignCard from "./components/CampaignCard";
import MarketplaceLoadingSkeleton from "../components/MarketplaceLoadingSkeleton";

function normalizeCampaignList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export default function FeaturedCampaigns({ campaigns = [], loading = false, error = null, onRetry }) {
  const sliderRef = useRef(null);

  const featuredCampaigns = useMemo(() => {
    return normalizeCampaignList(campaigns).slice(0, 8);
  }, [campaigns]);

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({
      left: -420,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({
      left: 420,
      behavior: "smooth",
    });
  };

  const showArrows = !loading && !error && featuredCampaigns.length > 0;

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Featured Campaigns</h2>
          <p className="mt-2 text-zinc-400">Hand-picked campaigns from top brands.</p>
        </div>

        {showArrows && (
          <div className="flex items-center gap-3">
            <button
              onClick={scrollLeft}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#16161F] text-white transition hover:border-violet-500 hover:bg-violet-500/10"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={scrollRight}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#16161F] text-white transition hover:border-violet-500 hover:bg-violet-500/10"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
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
        <div
          ref={sliderRef}
          className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory custom-scrollbar pb-2"
        >
          {featuredCampaigns.map((campaign) => (
            <div key={campaign.id} className="min-w-[380px] max-w-[380px] flex-shrink-0 snap-start">
              <CampaignCard campaign={campaign} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
/**
 * Placeholder card matching CampaignCard's layout, for the moment
 * before real campaign data arrives. Usually reads better than a
 * spinner for grid content — the shape of what's coming is already
 * visible, so it doesn't feel like an empty wait.
 *
 * Usage in FeaturedCampaigns / AllCampaigns while fetching:
 *   {loading
 *     ? Array.from({ length: 6 }).map((_, i) => <CampaignCardSkeleton key={i} />)
 *     : campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
 */
export default function CampaignCardSkeleton() {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#11111A]">
        {/* Cover */}
        <div className="relative h-36 overflow-hidden bg-white/[0.04] sm:h-40">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>
  
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
              <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-2.5 w-12 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-16 animate-pulse rounded bg-white/[0.08]" />
              </div>
            </div>
          ))}
        </div>
  
        {/* Progress bar */}
        <div className="px-5 pb-5">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-2.5 w-8 animate-pulse rounded bg-white/[0.05]" />
          </div>
          <div className="h-2 w-full animate-pulse rounded-full bg-white/[0.05]" />
        </div>
      </div>
    );
  }
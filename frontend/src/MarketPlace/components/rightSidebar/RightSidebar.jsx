import PlatformStats from "./PlatformStats";
import TopEarners from "./TopEarners";
import TrendingCategories from "./TrendingCategories";
import TipCard from "./TipCard";
import CTACard from "./CTACard";

function SidebarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Platform Stats */}
      <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-5 flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-white/10" />
          <div className="h-5 w-28 rounded bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="rounded-xl bg-white/[0.03] p-3">
              <div className="h-3 w-16 rounded bg-white/10" />
              <div className="mt-2 h-6 w-12 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Top Earners */}
      <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-5 flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-white/10" />
          <div className="h-5 w-40 rounded bg-white/10" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded bg-white/10" />
              <div className="h-9 w-9 rounded-full bg-white/10" />

              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="h-2.5 w-16 rounded bg-white/5" />
              </div>

              <div className="h-3 w-12 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Trending Categories */}
      <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-5 flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-white/10" />
          <div className="h-5 w-36 rounded bg-white/10" />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-20 rounded-full bg-white/10" />
          <div className="h-7 w-28 rounded-full bg-white/10" />
          <div className="h-7 w-24 rounded-full bg-white/10" />
          <div className="h-7 w-20 rounded-full bg-white/10" />
          <div className="h-7 w-28 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Tip */}
      <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-5 flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-white/10" />
          <div className="h-5 w-28 rounded bg-white/10" />
        </div>

        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-4/5 rounded bg-white/10" />
          <div className="h-3 w-3/5 rounded bg-white/10" />
        </div>
      </div>

      {/* CTA */}
      <div className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="h-5 w-36 rounded bg-white/10" />

        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-4/5 rounded bg-white/10" />
        </div>

        <div className="mt-4 h-10 w-36 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

export default function RightSidebar({
  campaigns = [],
  loading = false,
}) {
  if (loading) {
    return <SidebarSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PlatformStats campaigns={campaigns} />
      <TopEarners campaigns={campaigns} />
      <TrendingCategories campaigns={campaigns} />
      <TipCard />
      <CTACard />
    </div>
  );
}
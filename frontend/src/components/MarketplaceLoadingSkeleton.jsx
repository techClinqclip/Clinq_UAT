export default function MarketplaceLoadingSkeleton() {
  return (
    <div className="min-h-screen space-y-8 bg-[#08080a] p-8 text-white">
      <div className="h-48 animate-pulse rounded-3xl bg-white/[0.03]" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>

      <div className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </div>
  );
}

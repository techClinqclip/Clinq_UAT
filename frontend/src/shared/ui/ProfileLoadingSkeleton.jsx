/*
  ProfileLoadingSkeleton — one shared skeleton for Brand / Creator / Clipper
  profile pages. Mirrors the real layout (cover, avatar, stats grid, tab nav,
  panel) so there's no layout shift when real data lands. Pulse color is
  neutral gray, so it works regardless of each role's accent (cyan/violet/etc).

  Usage in each profile page:

    const [loading, setLoading] = useState(true);

    // in loadProfile(): setLoading(false) in both the success path and
    // every catch/fallthrough path, so it never gets stuck.

    if (loading) return <ProfileLoadingSkeleton tabCount={TABS.length} />;

  Drop this in place of the real JSX return while `loading` is true —
  keep it BEFORE the `<ConfirmDialog />` etc. wrapper, i.e. as an early
  return at the top of the component.
*/

export default function ProfileLoadingSkeleton({ tabCount = 5 }) {
    const pulse = "animate-pulse bg-white/[0.06]";
  
    return (
      <div>
        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className={`h-36 sm:h-44 ${pulse}`} />
          <div className="px-6 pb-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <div className={`-mt-10 h-20 w-20 shrink-0 rounded-2xl border-4 border-[#0A0A0F] ${pulse}`} />
              <div className="min-w-0 flex-1 space-y-2 pb-1 pt-2 sm:pt-3">
                <div className={`h-6 w-48 rounded-md ${pulse}`} />
                <div className={`h-4 w-32 rounded-md ${pulse}`} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className={`h-4 w-28 rounded-md ${pulse}`} />
              <div className={`h-4 w-36 rounded-md ${pulse}`} />
            </div>
          </div>
        </div>
  
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className={`h-9 w-9 rounded-lg ${pulse}`} />
              <div className={`mt-3 h-6 w-16 rounded-md ${pulse}`} />
              <div className={`mt-2 h-3 w-24 rounded-md ${pulse}`} />
            </div>
          ))}
        </div>
  
        <div className="mt-8 grid gap-6 md:grid-cols-[200px_1fr]">
          {/* Tab nav */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {Array.from({ length: tabCount }).map((_, i) => (
              <div key={i} className={`h-10 w-full shrink-0 rounded-xl ${pulse}`} style={{ minWidth: 120 }} />
            ))}
          </div>
  
          {/* Panel */}
          <div className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className={`h-4 w-40 rounded-md ${pulse}`} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className={`h-3 w-24 rounded-md ${pulse}`} />
                <div className={`h-10 w-full rounded-lg ${pulse}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
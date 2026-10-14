/**
 * Shared skeleton for Admin pages — matches the common layout
 * (hero + KPI row + content panel) so pages don't jump when data lands.
 *
 * Variants:
 *   default   — hero, 4 KPIs, filters, list (queues / payouts / support)
 *   dashboard — hero, 4 KPIs, two-column sections
 *   settings  — hero + stacked cards
 *   detail    — back link, hero, 4 KPIs, two lists
 *   list      — hero + list only (campaign index)
 */
export default function AdminLoadingSkeleton({ variant = "default", kpiCount = 4 }) {
  const pulse = "animate-pulse bg-white/[0.06]";
  const cards = Math.max(3, Math.min(kpiCount, 5));

  return (
    <div className="min-h-screen bg-black text-white" aria-busy="true" aria-label="Loading admin page">
      <div className={`mt-2 h-4 w-40 rounded-md ${pulse}`} />

      {variant === "detail" ? (
        <div className={`mt-6 h-4 w-36 rounded-md ${pulse}`} />
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className={`h-6 w-28 rounded-full ${pulse}`} />
        <div className={`mt-5 h-10 w-72 max-w-full rounded-md ${pulse}`} />
        <div className={`mt-4 h-4 w-full max-w-xl rounded-md ${pulse}`} />
        <div className={`mt-2 h-4 w-2/3 max-w-md rounded-md ${pulse}`} />
      </section>

      {variant === "settings" ? (
        <div className="mt-8 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <section key={i} className="max-w-3xl rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex items-start gap-4">
                <div className={`h-11 w-11 shrink-0 rounded-xl ${pulse}`} />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className={`h-5 w-48 rounded-md ${pulse}`} />
                  <div className={`h-4 w-full max-w-lg rounded-md ${pulse}`} />
                  <div className={`h-4 w-40 rounded-md ${pulse}`} />
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <div className={`h-10 w-full max-w-md rounded-xl ${pulse}`} />
                    <div className={`h-10 w-36 rounded-xl ${pulse}`} />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {variant !== "settings" && variant !== "list" ? (
        <section
          className={`mt-8 grid gap-6 ${
            cards === 5 ? "sm:grid-cols-2 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-4"
          }`}
        >
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className={`h-9 w-9 rounded-lg ${pulse}`} />
              <div className={`mt-3 h-8 w-20 rounded-md ${pulse}`} />
              <div className={`mt-2 h-3 w-28 rounded-md ${pulse}`} />
            </div>
          ))}
        </section>
      ) : null}

      {variant === "dashboard" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className={`h-5 w-28 rounded-md ${pulse}`} />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <div className={`h-9 w-9 rounded-lg ${pulse}`} />
                  <div className={`mt-3 h-4 w-32 rounded-md ${pulse}`} />
                  <div className={`mt-2 h-3 w-full rounded-md ${pulse}`} />
                  <div className={`mt-3 h-3 w-16 rounded-md ${pulse}`} />
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className={`h-5 w-36 rounded-md ${pulse}`} />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${pulse}`} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-3 w-full rounded-md ${pulse}`} />
                    <div className={`h-3 w-24 rounded-md ${pulse}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {variant === "default" || variant === "list" || variant === "detail" ? (
        <>
          {variant === "default" ? (
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`h-12 rounded-xl ${pulse}`} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-6 py-5">
              <div className={`h-6 w-48 rounded-md ${pulse}`} />
              <div className={`mt-2 h-3 w-64 max-w-full rounded-md ${pulse}`} />
            </div>
            <div className="divide-y divide-white/5">
              {Array.from({ length: variant === "detail" ? 4 : 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className={`h-4 w-48 rounded-md ${pulse}`} />
                    <div className={`h-3 w-36 rounded-md ${pulse}`} />
                  </div>
                  <div className={`h-4 w-20 rounded-md ${pulse}`} />
                  <div className={`h-6 w-24 rounded-full ${pulse}`} />
                </div>
              ))}
            </div>
          </section>

          {variant === "detail" ? (
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 px-6 py-5">
                <div className={`h-6 w-40 rounded-md ${pulse}`} />
              </div>
              <div className="divide-y divide-white/5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className={`h-4 w-40 rounded-md ${pulse}`} />
                      <div className={`h-3 w-28 rounded-md ${pulse}`} />
                    </div>
                    <div className={`h-4 w-16 rounded-md ${pulse}`} />
                    <div className={`h-6 w-20 rounded-full ${pulse}`} />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Compact list-only skeleton for in-page refreshes (filters, pagination). */
export function AdminListSkeleton({ rows = 5 }) {
  const pulse = "animate-pulse bg-white/[0.06]";
  return (
    <div className="divide-y divide-white/5" aria-busy="true" aria-label="Loading list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-2">
            <div className={`h-4 w-48 rounded-md ${pulse}`} />
            <div className={`h-3 w-36 rounded-md ${pulse}`} />
          </div>
          <div className={`h-4 w-20 rounded-md ${pulse}`} />
          <div className={`h-6 w-24 rounded-full ${pulse}`} />
        </div>
      ))}
    </div>
  );
}

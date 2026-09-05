/*
  SubmissionsLoadingSkeleton — matches ClipperSubmissions' layout section
  for section (header, 4 KPI cards, submission table, top clips, two
  charts, insights grid) so there's no layout shift when data lands.

  Usage in ClipperSubmissions.jsx:

    import SubmissionsLoadingSkeleton from "../../components/SubmissionsLoadingSkeleton";

    if (loading) {
      return <SubmissionsLoadingSkeleton />;
    }

  Place this check right after the existing `if (error) { ... }` block,
  before the main `return (`.
*/

export default function SubmissionsLoadingSkeleton() {
    const pulse = "animate-pulse bg-white/[0.06]";
  
    return (
      <div className="space-y-8">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <div className={`h-3 w-40 rounded-md ${pulse}`} />
          <div className={`mt-4 h-4 w-28 rounded-md ${pulse}`} />
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className={`h-3 w-36 rounded-md ${pulse}`} />
              <div className={`h-9 w-64 rounded-md ${pulse}`} />
            </div>
            <div className={`h-10 w-52 rounded-xl ${pulse}`} />
          </div>
        </section>
  
        {/* KPI cards */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#11111A] p-6">
              <div className={`h-3 w-24 rounded-md ${pulse}`} />
              <div className={`mt-3 h-9 w-20 rounded-md ${pulse}`} />
              <div className={`mt-2 h-3 w-28 rounded-md ${pulse}`} />
            </div>
          ))}
        </div>
  
        {/* Submission table */}
        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className={`h-6 w-56 rounded-md ${pulse}`} />
              <div className={`h-3 w-80 max-w-full rounded-md ${pulse}`} />
            </div>
            <div className={`h-9 w-36 rounded-xl ${pulse}`} />
          </div>
  
          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-white/5 py-3">
                <div className={`h-4 w-4 shrink-0 rounded ${pulse}`} />
                <div className={`h-14 w-24 shrink-0 rounded-xl ${pulse}`} />
                <div className="flex-1 space-y-2">
                  <div className={`h-3 w-40 rounded-md ${pulse}`} />
                  <div className={`h-3 w-24 rounded-md ${pulse}`} />
                </div>
                <div className={`h-3 w-16 shrink-0 rounded-md ${pulse}`} />
                <div className={`h-3 w-14 shrink-0 rounded-md ${pulse}`} />
                <div className={`h-6 w-20 shrink-0 rounded-full ${pulse}`} />
                <div className={`h-8 w-24 shrink-0 rounded-lg ${pulse}`} />
              </div>
            ))}
          </div>
        </section>
  
        {/* Top performing clips */}
        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <div className={`h-6 w-56 rounded-md ${pulse}`} />
          <div className={`mt-2 h-3 w-72 max-w-full rounded-md ${pulse}`} />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                <div className={`h-40 ${pulse}`} />
                <div className="space-y-3 p-5">
                  <div className={`h-5 w-20 rounded-full ${pulse}`} />
                  <div className={`h-4 w-32 rounded-md ${pulse}`} />
                  <div className="flex justify-between pt-2">
                    <div className={`h-6 w-14 rounded-md ${pulse}`} />
                    <div className={`h-6 w-14 rounded-md ${pulse}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
  
        {/* Analytics charts */}
        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className={`h-6 w-56 rounded-md ${pulse}`} />
              <div className={`h-3 w-64 max-w-full rounded-md ${pulse}`} />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`h-9 w-12 rounded-xl ${pulse}`} />
              ))}
            </div>
          </div>
  
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-white/10 bg-black/10 p-6">
                <div className={`h-3 w-32 rounded-md ${pulse}`} />
                <div className={`mt-3 h-9 w-40 rounded-md ${pulse}`} />
                <div className={`mt-8 h-[250px] w-full rounded-2xl ${pulse}`} />
              </div>
            ))}
          </div>
        </section>
  
        {/* Insights */}
        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <div className={`h-6 w-48 rounded-md ${pulse}`} />
          <div className={`mt-2 h-3 w-72 max-w-full rounded-md ${pulse}`} />
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <div className={`h-3 w-24 rounded-md ${pulse}`} />
                <div className={`mt-3 h-9 w-16 rounded-md ${pulse}`} />
                <div className={`mt-2 h-3 w-32 rounded-md ${pulse}`} />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }
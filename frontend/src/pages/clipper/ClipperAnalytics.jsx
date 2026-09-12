import { useState, useMemo, useEffect } from "react";
import {
    Eye,
    Heart,
    Clapperboard,
    TrendingUp,
    Download,
    ArrowUpRight,
    ArrowDown,
    ArrowUp,
    Play,
    ChevronDown,
    CheckCircle2,
    PieChart,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
} from "recharts";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import MarketplaceLoadingSkeleton from "../../components/MarketplaceLoadingSkeleton";

/* ---------------------------------------------------------
   Analytics data is sourced from backend snapshots and submissions.
--------------------------------------------------------o- */

const defaultAnalytics = {
    totalViews: 0,
    engagementRate: 0,
    totalClips: 0,
    averageViews: 0,
    performance: [],
    platforms: [],
    clips: [],
};

const FILTERS = ["30 Days", "3 Months", "6 Months", "All Time"];
const PLATFORM_COLOR = { Instagram: "#c084fc", YouTube: "#f87171", Facebook: "#5eead4", X: "#a1a1aa" };

// Where clippers land once they have nothing to show yet — same route
// used by every other "browse gigs" CTA across the app.
const GIGS_ROUTE = "/marketplace";

function formatMonthLabel(dateString) {
    const date = dateString ? new Date(dateString) : null;
    if (!date || Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function buildPerformanceData(submissions) {
    const buckets = {};
    submissions.forEach((item) => {
        const label = formatMonthLabel(item.uploadedAt);
        if (label === "Unknown") return;
        buckets[label] = (buckets[label] || 0) + item.views;
    });

    const sorted = Object.entries(buckets)
        .map(([month, views]) => ({ month, views }))
        .sort((a, b) => new Date(a.month) - new Date(b.month));

    return sorted.map((row, index) => ({
        month: row.month,
        views: row.views,
        previousViews: index > 0 ? sorted[index - 1].views : 0,
    }));
}

function buildPlatformData(submissions) {
    const totals = submissions.reduce((acc, item) => {
        acc[item.platform] = (acc[item.platform] || 0) + item.views;
        return acc;
    }, {});
    return Object.entries(totals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

function buildClips(submissions) {
    return submissions
        .map((item) => ({
            id: item.id,
            title: item.title,
            views: item.views,
            engagement: item.engagement,
            platform: item.platform,
            trend: item.trend,
            uploadedAt: item.uploadedAt,
        }))
        .sort((a, b) => b.views - a.views);
}

/* ---------------------------------------------------------
   Sprocket rule — a filmstrip-perforation divider.
   Encodes the subject (clip footage) instead of decorating.
--------------------------------------------------------- */
function SprocketRule({ className = "" }) {
    return (
        <div className={`flex items-center gap-[6px] ${className}`} aria-hidden="true">
            <div className="h-px flex-1 bg-white/10" />
            {Array.from({ length: 14 }).map((_, i) => (
                <span key={i} className="h-[3px] w-[3px] shrink-0 rounded-[1px] bg-white/15" />
            ))}
            <div className="h-px flex-1 bg-white/10" />
        </div>
    );
}

/* ---------------------------------------------------------
   Empty states — themed around the page's own filmstrip/slate
   motif (sprocket rule, clapperboard, mono/uppercase labels)
   instead of the generic dashed-box pattern used elsewhere,
   but kept on the app's violet accent so it doesn't clash.
--------------------------------------------------------- */

// Compact panel-level empty state, used inside the two chart cards.
function ChartEmptyState({ icon: Icon, title, description, height = 260 }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 text-center" style={{ height }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <Icon size={20} className="text-violet-400" />
            </div>
            <div>
                <p className="text-sm font-medium text-zinc-300">{title}</p>
                <p className="mx-auto mt-1 max-w-[220px] text-xs leading-5 text-zinc-500">{description}</p>
            </div>
        </div>
    );
}

// The headline empty state — replaces the clip performance table when
// there's nothing logged yet. Uses the clapperboard + sprocket-rule
// language established by the hero section instead of a plain box.
function ClipsEmptyState() {
    return (
        <div className="flex flex-col items-center gap-6 px-6 py-14 text-center">
            <SprocketRule className="w-full max-w-xs" />

            <div className="relative flex h-16 w-20 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
                <Clapperboard size={28} className="text-violet-400" />
            </div>

            <div>
                <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                    No Clips Logged
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                Submit clips to an active gig to see them listed here, ready to sort by views, engagement, and trend.
                </p>
            </div>

            <Link
                to={GIGS_ROUTE}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
                <Play size={14} className="fill-white" />
                Browse Gigs
            </Link>

            <SprocketRule className="w-full max-w-xs" />
        </div>
    );
}

function fmtCompact(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return `${n}`;
}

function exportCSV(clips) {
    const header = "id,title,duration,views,engagement,platform,trend\n";
    const rows = clips
        .map((c) => `${c.id},"${c.title}",${c.duration},${c.views},${c.engagement},${c.platform},${c.trend}`)
        .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clip-performance-report.csv";
    a.click();
    URL.revokeObjectURL(url);
}

export default function ClipperAnalytics() {
    const [selectedFilter, setSelectedFilter] = useState("30 Days");
    const [sortKey, setSortKey] = useState("views");
    const [sortDir, setSortDir] = useState("desc");
    const [analytics, setAnalytics] = useState(defaultAnalytics);
    const [activityEvents, setActivityEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            setLoading(true);
            setError("");

            try {
                const [snapshotData, submissionsData, activityData] = await Promise.all([
                    api("/api/creator/analytics/"),
                    api("/api/content/clipper-submissions/"),
                    api("/api/creator/analytics/activity/"),
                ]);

                const snapshot = Array.isArray(snapshotData) ? snapshotData[0] : snapshotData;
                const submissions = Array.isArray(submissionsData)
                    ? submissionsData.map((item) => ({
                          id: item.id,
                          title:
                              item.handle && item.handle !== ""
                                  ? `${item.handle} clip`
                                  : item.campaign || `Clip ${item.id}`,
                          duration: item.duration || "--:--",
                          views: Number(item.views || 0),
                          engagement: Number(item.views || 0) ? Math.min(100, Math.round((item.views || 0) / 1000)) : 0,
                          platform: item.platform || "Unknown",
                          trend: 0,
                          uploadedAt: item.submittedAt || null,
                      }))
                    : [];

                const totalViews = submissions.reduce((sum, item) => sum + item.views, 0);
                const totalClips = submissions.length;
                const averageViews = totalClips ? Math.round(totalViews / totalClips) : 0;
                const engagementRate = snapshot?.total_views
                    ? Math.round(((snapshot.unique_viewers || 0) / snapshot.total_views) * 100)
                    : totalViews
                    ? Math.min(100, Math.round((totalViews / Math.max(totalClips, 1)) / 1000))
                    : 0;

                if (!mounted) return;

                setAnalytics({
                    totalViews: snapshot?.total_views || totalViews,
                    engagementRate,
                    totalClips,
                    averageViews,
                    performance: buildPerformanceData(submissions),
                    platforms: buildPlatformData(submissions),
                    clips: buildClips(submissions),
                });
                setActivityEvents(Array.isArray(activityData) ? activityData : []);
            } catch (err) {
                if (!mounted) return;
                setError(err?.message || "Unable to load analytics data.");
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        loadData();
        return () => {
            mounted = false;
        };
    }, []);

    const sortedClips = useMemo(() => {
        const arr = [...(analytics.clips || [])];
        arr.sort((a, b) => (sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
        return arr;
    }, [analytics.clips, sortKey, sortDir]);

    function toggleSort(key) {
        if (key === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        else {
            setSortKey(key);
            setSortDir("desc");
        }
    }

    // Derived, not hardcoded — recompute the moment `analytics` is swapped for a real API response.
    const insights = useMemo(() => {
        const { clips, platforms, performance } = analytics;

        const topPlatform = [...platforms].sort((a, b) => b.value - a.value)[0] || { name: "—", value: 0 };
        const bestClip = [...clips].sort((a, b) => b.views - a.views)[0] || { title: "—", views: 0 };
        const mostEngagingClip = [...clips].sort((a, b) => b.engagement - a.engagement)[0] || { title: "—", engagement: 0 };
        const fastestGrowingClip = [...clips].sort((a, b) => b.trend - a.trend)[0] || { title: "—", trend: 0 };
        const last = performance[performance.length - 1] || { views: 0, previousViews: 0 };
        const monthlyGrowth = last.previousViews ? Math.round(((last.views - last.previousViews) / last.previousViews) * 100) : 0;

        return [
            {
                icon: <Eye size={16} className="text-sky-400" />,
                iconBg: "bg-sky-500/10",
                title: "Top Platform",
                description: `${topPlatform.name} generated ${analytics.totalViews ? Math.round((topPlatform.value / analytics.totalViews) * 100) : 0}% of total views.`,
            },
            {
                icon: <Clapperboard size={16} className="text-violet-400" />,
                iconBg: "bg-violet-500/10",
                title: "Best Clip",
                description: `"${bestClip.title}" reached ${fmtCompact(bestClip.views)} views.`,
            },
            {
                icon: <Heart size={16} className="text-rose-400" />,
                iconBg: "bg-rose-500/10",
                title: "Highest Engagement",
                description: `"${mostEngagingClip.title}" achieved ${mostEngagingClip.engagement}% engagement.`,
            },
            {
                icon: <TrendingUp size={16} className="text-amber-400" />,
                iconBg: "bg-amber-500/10",
                title: "Monthly Growth",
                description: `Views increased ${monthlyGrowth}% over the previous period.`,
            },
            {
                icon: <ArrowUp size={16} className="text-emerald-400" />,
                iconBg: "bg-emerald-500/10",
                title: "Fastest Growing Clip",
                description: `"${fastestGrowingClip.title}" is up ${fastestGrowingClip.trend}% week over week.`,
            },
        ];
    }, [analytics]);

    const activity = useMemo(() => {
        return activityEvents.map((event) => ({
            ...event,
            icon:
                event.type === "upload"
                    ? <Clapperboard size={14} className="text-violet-400" />
                    : event.type === "approved"
                    ? <CheckCircle2 size={14} className="text-emerald-400" />
                    : <Eye size={14} className="text-sky-400" />,
        }));
    }, [activityEvents]);

    const hasPerformanceData = analytics.performance.length > 0;
    const hasPlatformData = analytics.platforms.length > 0;
    const hasClips = sortedClips.length > 0;
    if (loading) {
        return <MarketplaceLoadingSkeleton />;
    }

    return (
        <div className="space-y-8 text-white">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 9999px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.22); }
            `}</style>

            <div className="space-y-8">
                {/* Breadcrumb placeholder — replace with real breadcrumbs */}
                <div className="mb-6 text-xs tracking-wide text-zinc-500">
                    Clipper <span className="mx-1.5 text-zinc-700">/</span> Analytics
                </div>
                {error ? (
                    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-200">
                        <strong>Unable to load analytics:</strong> {error}
                    </div>
                ) : null}

                {/* Hero */}
                <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] p-8">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                                <Play size={11} className="fill-violet-300" />
                                Clipper Analytics
                            </span>

                            <h1 className="mt-5 font-mono text-[13px] uppercase tracking-[0.2em] text-zinc-500">
                                Clip Insights — {selectedFilter}
                            </h1>

                            {/* Timecode-style hero number */}
                            <div className="mt-2 flex items-baseline gap-4">
                                <span className="font-mono text-6xl font-bold tabular-nums tracking-tight lg:text-7xl">
                                    {fmtCompact(analytics.totalViews)}
                                </span>
                                <span className="pb-2 text-sm text-zinc-500">total views</span>
                            </div>

                            <p className="mt-4 max-w-xl leading-7 text-zinc-400">
                            performance tracking for all your clips. See what performs, what converts, and identify your next viral hit.
                            </p>
                        </div>

                        <div className="flex flex-col items-start gap-3 lg:items-end">
                            <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setSelectedFilter(f)}
                                        className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                                            selectedFilter === f
                                                ? "bg-violet-600 text-white"
                                                : "text-zinc-400 hover:text-white"
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => exportCSV(sortedClips)}
                                disabled={!hasClips}
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition hover:border-violet-500/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:bg-white/5"
                            >
                                <Download size={16} />
                                Export Report
                            </button>
                        </div>
                    </div>
                </section>

                {/* KPI row */}
                <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4">
                    <KpiCard
                        icon={<Eye size={20} className="text-sky-400" />}
                        label="Total views"
                        value={fmtCompact(analytics.totalViews)}
                        spark={analytics.performance.map((d) => d.views)}
                        color="#38bdf8"
                    />
                    <KpiCard
                        icon={<Heart size={20} className="text-rose-400" />}
                        label="Engagement rate"
                        value={`${analytics.engagementRate}%`}
                        spark={[5.1, 5.9, 6.4, 6.8, 7.1, 7.4, 7.8]}
                        color="#fb7185"
                        neutral
                    />
                    <KpiCard
                        icon={<Clapperboard size={20} className="text-violet-400" />}
                        label="Total clips"
                        value={analytics.totalClips}
                        delta={0}
                        spark={[30, 33, 36, 39, 42, 45, 47]}
                        color="#c084fc"
                        neutral
                    />
                    <KpiCard
                        icon={<TrendingUp size={20} className="text-amber-400" />}
                        label="Avg views / clip"
                        value={fmtCompact(analytics.averageViews)}
                        spark={[112, 128, 140, 155, 168, 178, 189]}
                        color="#fbbf24"
                        neutral
                    />
                </section>

                {/* Chart + platform split */}
                <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
                    <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Views over time</h3>
                                <p className="mt-0.5 text-xs text-zinc-500">Current period vs. previous</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" />Current</span>
                                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-600" />Previous</span>
                            </div>
                        </div>
                        {hasPerformanceData ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={analytics.performance} margin={{ left: -20, right: 10 }}>
                                    <defs>
                                        <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={fmtCompact} />
                                    <Tooltip
                                        contentStyle={{ background: "#131316", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
                                        labelStyle={{ color: "#a1a1aa" }}
                                        formatter={(v) => fmtCompact(v)}
                                    />
                                    <Area dataKey="previousViews" stroke="#3f3f46" strokeWidth={1.5} fill="transparent" strokeDasharray="4 4" />
                                    <Area dataKey="views" stroke="#a78bfa" strokeWidth={2.5} fill="url(#viewsFill)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <ChartEmptyState
                                icon={TrendingUp}
                                title="No views yet"
                                description="Your view trends will appear here once your submitted clips start generating views."
                                height={260}
                            />
                        )}
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
                        <h3 className="text-sm font-semibold text-white">Views by platform</h3>
                        <p className="mt-0.5 text-xs text-zinc-500">Where clips are landing</p>
                        {hasPlatformData ? (
                            <div className="mt-5 space-y-4">
                                {analytics.platforms.map((p) => {
                                    const pct = analytics.totalViews ? (p.value / analytics.totalViews) * 100 : 0;
                                    return (
                                        <div key={p.name}>
                                            <div className="mb-1.5 flex items-center justify-between text-xs">
                                                <span className="font-medium text-zinc-300">{p.name}</span>
                                                <span className="font-mono tabular-nums text-zinc-500">{fmtCompact(p.value)}</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${pct}%`, backgroundColor: PLATFORM_COLOR[p.name] }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <ChartEmptyState
                                icon={PieChart}
                                title="No platform data yet"
                                description="Submit clips across YouTube, Instagram, and more to see  your analysis."
                                height={200}
                            />
                        )}
                    </div>
                </section>

                {/* Clip performance table */}
                <section className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-white">Clip performance</h3>
                            <p className="mt-0.5 text-xs text-zinc-500">Sort by any column — click a header</p>
                        </div>
                    </div>

                    {hasClips ? (
                        <div className="custom-scrollbar -mx-2 max-h-[360px] overflow-x-auto overflow-y-auto px-2 sm:mx-0 sm:px-0">
                            <table className="w-full min-w-[720px] border-collapse text-sm">
                                <thead className="sticky top-0 z-10 bg-[#0c0c0e]">
                                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-zinc-500">
                                        <th className="px-4 py-3 font-medium">Clip</th>
                                        <th className="px-4 py-3 font-medium">Platform</th>
                                        <SortableHeader label="Views" active={sortKey === "views"} dir={sortDir} onClick={() => toggleSort("views")} />
                                        <SortableHeader label="Engagement" active={sortKey === "engagement"} dir={sortDir} onClick={() => toggleSort("engagement")} />
                                        <th className="px-4 py-3 text-right font-medium">Trend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedClips.map((c) => (
                                        <tr key={c.id} className="border-b border-white/5 last:border-0">
                                            <td className="px-4 py-3.5">
                                                <div className="min-w-0">
                                                    <p className="max-w-[260px] truncate font-medium text-zinc-200">{c.title}</p>
                                                    <p className="max-w-[260px] truncate font-mono text-[11px] text-zinc-600">{c.id}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium"
                                                    style={{
                                                        color: PLATFORM_COLOR[c.platform] || "#a1a1aa",
                                                        backgroundColor: `${PLATFORM_COLOR[c.platform] || "#a1a1aa"}1a`,
                                                    }}
                                                >
                                                    {c.platform}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono tabular-nums text-zinc-300">{fmtCompact(c.views)}</td>
                                            <td className="px-4 py-3.5 font-mono tabular-nums text-zinc-300">{c.engagement}%</td>
                                            <td className="px-4 py-3.5 text-right">
                                                <span
                                                    className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
                                                        c.trend >= 0 ? "text-emerald-400" : "text-rose-400"
                                                    }`}
                                                >
                                                    {c.trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                                    {Math.abs(c.trend)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <ClipsEmptyState />
                    )}
                </section>

            </div>
        </div>
    );
}

function SortableHeader({ label, active, dir, onClick }) {
    return (
        <th className="px-4 py-3 font-medium">
            <button
                onClick={onClick}
                className={`inline-flex items-center gap-1 transition ${active ? "text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
            >
                {label}
                <ChevronDown size={12} className={`transition-transform ${active && dir === "asc" ? "rotate-180" : ""}`} />
            </button>
        </th>
    );
}

function KpiCard({ icon, label, value, delta, spark, color, neutral }) {
    const safeSpark = spark && spark.length ? spark : [0];
    const max = Math.max(...safeSpark);
    const min = Math.min(...safeSpark);
    const points = safeSpark
        .map((v, i) => {
            const x = (i / (safeSpark.length - 1 || 1)) * 100;
            const y = 28 - ((v - min) / (max - min || 1)) * 26;
            return `${x},${y}`;
        })
        .join(" ");

    return (
        <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition hover:border-white/[0.15]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">{icon}</div>
                {!neutral && delta !== null && delta !== undefined && (
                    <span
                        className={`inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            delta >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}
                    >
                        <ArrowUpRight size={11} className={delta < 0 ? "rotate-90" : ""} />
                        {Math.abs(delta)}%
                    </span>
                )}
            </div>

            <p className="mt-4 text-xs text-zinc-500">{label}</p>
            <h3 className="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight">{value}</h3>

            <svg viewBox="0 0 100 28" className="mt-3 h-7 w-full" preserveAspectRatio="none">
                <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            </svg>
        </div>
    );
}

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";


import AnalyticsTooltip from "./AnalyticsTooltip";

const CHART_COLOR = "#3B82F6";
const GRADIENT_ID = "analytics-gradient";

const formatViews = (value) => {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
    }

    return value;
};

const analytics = {
    // =========================
    // KPI Cards
    // =========================

    totalViews: 8900000,
    engagementRate: 7.8,
    totalClips: 47,
    averageViews: 189000,

    // =========================
    // Performance Chart
    // =========================

    performance: [
        {
            month: "Jan",
            views: 620000,
        },
        {
            month: "Feb",
            views: 790000,
            previousViews: 620000,
        },
        {
            month: "Mar",
            views: 910000,
            previousViews: 790000,
        },
        {
            month: "Apr",
            views: 1050000,
            previousViews: 910000,
        },
        {
            month: "May",
            views: 1180000,
            previousViews: 1050000,
        },
        {
            month: "Jun",
            views: 1320000,
            previousViews: 1180000,
        },
        {
            month: "Jul",
            views: 1480000,
            previousViews: 1320000,
        },
    ],

    // =========================
    // Platform Performance
    // =========================

    platforms: [
        {
            platform: "Instagram",
            views: 4900000,
            percentage: 55,
            clips: 21,
            engagementRate: 8.6,
            color: "#E1306C",
        },
        {
            platform: "YouTube",
            views: 2140000,
            percentage: 24,
            clips: 13,
            engagementRate: 7.4,
            color: "#FF0000",
        },
        {
            platform: "TikTok",
            views: 1250000,
            percentage: 14,
            clips: 8,
            engagementRate: 9.1,
            color: "#14B8A6",
        },
        {
            platform: "X",
            views: 610000,
            percentage: 7,
            clips: 5,
            engagementRate: 5.8,
            color: "#60A5FA",
        },
    ],

    // =========================
    // Engagement Breakdown
    // =========================

    engagement: [
        {
            type: "Likes",
            value: 356000,
        },
        {
            type: "Comments",
            value: 28700,
        },
        {
            type: "Shares",
            value: 42300,
        },
        {
            type: "Saves",
            value: 51400,
        },
    ],

    // =========================
    // Top Campaigns (Phase 3)
    // =========================

    campaigns: [
        {
            id: 1,
            title: "Podcast Shorts",
            platform: "Instagram",
            clips: 9,
            views: 890000,
            engagementRate: 8.4,
        },
        {
            id: 2,
            title: "AI Productivity",
            platform: "YouTube",
            clips: 7,
            views: 620000,
            engagementRate: 7.9,
        },
        {
            id: 3,
            title: "Finance Challenge",
            platform: "TikTok",
            clips: 11,
            views: 1400000,
            engagementRate: 9.2,
        },
        {
            id: 4,
            title: "Startup Hacks",
            platform: "Instagram",
            clips: 6,
            views: 540000,
            engagementRate: 7.1,
        },
    ],

    // =========================
    // Top Clips (Phase 3)
    // =========================

    clips: [
        {
            id: 1,
            title: "How AI Changed My Workflow",
            thumbnail:
                "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600",
            platform: "Instagram",
            views: 890000,
            likes: 43000,
            comments: 1200,
            shares: 3600,
            saves: 5100,
        },
        {
            id: 2,
            title: "Morning Productivity Routine",
            thumbnail:
                "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600",
            platform: "YouTube",
            views: 720000,
            likes: 36200,
            comments: 910,
            shares: 2800,
            saves: 4200,
        },
        {
            id: 3,
            title: "5 Startup Mistakes",
            thumbnail:
                "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600",
            platform: "TikTok",
            views: 610000,
            likes: 28400,
            comments: 720,
            shares: 2400,
            saves: 3100,
        },
    ],
};
export default function AnalyticsAreaChart({ data }) {
    return (
        <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: -20,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient
                            id={GRADIENT_ID}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor={CHART_COLOR}
                                stopOpacity={0.35}
                            />

                            <stop
                                offset="75%"
                                stopColor={CHART_COLOR}
                                stopOpacity={0.08}
                            />

                            <stop
                                offset="100%"
                                stopColor={CHART_COLOR}
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        vertical={false}
                        stroke="#27272A"
                        strokeOpacity={0.35}
                    />

                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={12}
                        tick={{
                            fill: "#A1A1AA",
                            fontSize: 12,
                            fontWeight: 500,
                        }}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        tick={{
                            fill: "#A1A1AA",
                            fontSize: 12,
                        }}
                        tickFormatter={formatViews}
                    />

                    <Tooltip
                        content={<AnalyticsTooltip />}
                        cursor={{
                            stroke: CHART_COLOR,
                            strokeWidth: 1,
                            strokeOpacity: 0.4,
                        }}
                    />

                    <Area
                        type="natural"
                        dataKey="views"
                        stroke={CHART_COLOR}
                        strokeWidth={3}
                        fill={`url(#${GRADIENT_ID})`}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        dot={false}
                        activeDot={{
                            r: 6,
                            fill: CHART_COLOR,
                            stroke: "#18181B",
                            strokeWidth: 3,
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
            {/* Insights */}

            <section className="mt-8 grid gap-8 xl:grid-cols-2">
                {/* Platform Performance */}

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                    <h2 className="text-2xl font-semibold">
                        Platform Performance
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                        See where your audience engagement is coming from.
                    </p>

                    <div className="mt-8 space-y-6">
                        {analytics.platforms.map((platform) => (
                            <div key={platform.platform}>
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-medium">
                                        {platform.platform}
                                    </span>

                                    <span className="text-sm text-zinc-400">
                                        {platform.percentage}%
                                    </span>
                                </div>

                                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${platform.percentage}%`,
                                            backgroundColor: platform.color,
                                        }}
                                    />
                                </div>

                                <p className="mt-2 text-sm text-zinc-500">
                                    {(platform.views / 1000000).toFixed(1)}M Views
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Engagement Breakdown */}

                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                    <h2 className="text-2xl font-semibold">
                        Engagement Breakdown
                    </h2>

                    <p className="mt-2 text-sm text-zinc-400">
                        Understand how users interact with your content.
                    </p>

                    <div className="mt-8 space-y-6">
                        {analytics.engagement.map((item) => (
                            <div key={item.type}>
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-medium">
                                        {item.type}
                                    </span>

                                    <span className="text-sm text-zinc-400">
                                        {item.value.toLocaleString()}
                                    </span>
                                </div>

                                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                                    <div
                                        className="h-full rounded-full bg-violet-500 transition-all"
                                        style={{
                                            width: `${(item.value /
                                                    analytics.engagement[0].value) *
                                                100
                                                }%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            {/* Top Campaigns */}

<section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
    <div className="mb-8">
        <h2 className="text-2xl font-semibold">
            Top Performing Campaigns
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
            Your highest-performing campaigns based on views and engagement.
        </p>
    </div>

    <div className="overflow-x-auto">
        <table className="w-full">
            <thead>
                <tr className="border-b border-white/10 text-left text-sm text-zinc-500">
                    <th className="pb-4">Campaign</th>
                    <th className="pb-4">Platform</th>
                    <th className="pb-4">Clips</th>
                    <th className="pb-4">Views</th>
                    <th className="pb-4">Engagement</th>
                </tr>
            </thead>

            <tbody>
                {analytics.campaigns.map((campaign) => (
                    <tr
                        key={campaign.id}
                        className="border-b border-white/5 transition hover:bg-white/[0.02]"
                    >
                        <td className="py-5 font-medium">
                            {campaign.title}
                        </td>

                        <td className="py-5">
                            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-sm text-violet-300">
                                {campaign.platform}
                            </span>
                        </td>

                        <td className="py-5">
                            {campaign.clips}
                        </td>

                        <td className="py-5">
                            {(campaign.views / 1000).toFixed(0)}K
                        </td>

                        <td className="py-5 text-emerald-400">
                            {campaign.engagementRate}%
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</section>
{/* Top Clips */}

<section className="mt-8">
    <div className="mb-8">
        <h2 className="text-2xl font-semibold">
            Top Performing Clips
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
            Your most successful clips across every campaign.
        </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {analytics.clips.map((clip) => (
            <div
                key={clip.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
            >
                <img
                    src={clip.thumbnail}
                    alt={clip.title}
                    className="h-48 w-full object-cover"
                />

                <div className="p-6">
                    <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                        {clip.platform}
                    </span>

                    <h3 className="mt-4 text-lg font-semibold">
                        {clip.title}
                    </h3>

                    <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-zinc-500">
                                Views
                            </p>

                            <p className="font-semibold">
                                {(clip.views / 1000).toFixed(0)}K
                            </p>
                        </div>

                        <div>
                            <p className="text-zinc-500">
                                Likes
                            </p>

                            <p className="font-semibold">
                                {(clip.likes / 1000).toFixed(1)}K
                            </p>
                        </div>

                        <div>
                            <p className="text-zinc-500">
                                Comments
                            </p>

                            <p className="font-semibold">
                                {clip.comments}
                            </p>
                        </div>

                        <div>
                            <p className="text-zinc-500">
                                Shares
                            </p>

                            <p className="font-semibold">
                                {(clip.shares / 1000).toFixed(1)}K
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ))}
    </div>
</section>
        </div>
    );
}
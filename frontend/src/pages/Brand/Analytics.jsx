import { useEffect, useState } from "react";
import {
  Eye,
  Users,
  Clock3,
  IndianRupee,
  Wallet,
  Trophy,
  Sparkles,
  BarChart3,
  LineChart,
  PieChart,
  ClipboardList,
  Medal,
  PlusCircle,
} from "lucide-react";
import { FaYoutube, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router-dom";
import ViewsChart from "./Components/ViewsChart";
import PayoutChart from "./Components/PayoutChart";
import { api } from "../../lib/api";

/*
  Two real bugs fixed from the original:
  1. ViewsChart was imported and activeViewsData was computed, but the
     chart was never actually rendered anywhere — a second <section>
     for payout data was nested inside the "Views Overview" section
     instead, under the wrong heading.
  2. Chart imports pointed at "../Creator/ViewsChart" / "../Creator/
     PayoutChart" — likely a copy-paste from a different folder. Fixed
     to "./components/..." to match every other Brand page. Confirm the
     real components actually live there before shipping.

  Empty-state calls to action share the registered campaign-creation route.
*/

const CREATE_CAMPAIGN_ROUTE = "/brand/campaigns/create";

const platformColorMap = {
  YouTube: { icon: FaYoutube, color: "text-red-500", bar: "bg-red-500" },
  Instagram: { icon: FaInstagram, color: "text-pink-500", bar: "bg-pink-500" },
  Facebook: { icon: FaFacebook, color: "text-blue-500", bar: "bg-blue-500" },
  X: { icon: FaXTwitter, color: "text-zinc-300", bar: "bg-zinc-400" },
  TikTok: { icon: FaInstagram, color: "text-violet-500", bar: "bg-violet-500" },
};

const formatCompact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n) || 0);

const RANK_STYLES = [
  "bg-amber-400/15 text-amber-300", // #1
  "bg-zinc-400/15 text-zinc-300", // #2
  "bg-orange-700/15 text-orange-400", // #3
];

const FILTERS = ["7D", "30D", "6M", "ALL"];

/* ---------- Small building blocks ---------- */

function StatHalf({ icon: Icon, iconBg, iconText, value, label }) {
  return (
    <div className="flex-1 p-6">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={20} className={iconText} />
      </div>
      <h2 className="mt-6 text-4xl font-bold text-white">{value}</h2>
      <p className="mt-2 text-zinc-500">{label}</p>
    </div>
  );
}

function ComingSoonHalf({ icon: Icon, iconBg, iconText, label }) {
  return (
    <div className="flex-1 p-6">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={20} className={iconText} />
        </div>
        <span className="relative inline-flex items-center gap-1 overflow-hidden rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-300">
          <span className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_2.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-violet-400/30 to-transparent" />
          <Sparkles size={11} className="animate-pulse" />
          Coming Soon
        </span>
      </div>
      <h2 className="mt-6 text-2xl font-bold text-zinc-600">Not available</h2>
      <p className="mt-2 text-zinc-500">{label}</p>
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, ctaLabel, ctaTo, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${compact ? "py-10" : "py-16"}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <Icon size={24} className="text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="max-w-sm text-sm text-zinc-500">{description}</p>
      {ctaLabel && ctaTo ? (
        <Link
          to={ctaTo}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          <PlusCircle size={16} />
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

/* ---------- Page ---------- */

export default function Analytics() {
  const [filter, setFilter] = useState("7D");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api("/api/content/campaigns/analytics/");
        if (!isMounted) return;
        setAnalytics(data || null);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Unable to load analytics right now.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeViewsData = analytics?.views_by_period?.[filter] || [];
  const activePayoutData = analytics?.payout_by_period?.[filter] || [];
  const totalViews = activeViewsData.reduce((sum, d) => sum + Number(d.views || 0), 0) || Number(analytics?.total_views || 0);
  const totalPayout = activePayoutData.reduce((sum, d) => sum + Number(d.payout || 0), 0) || Number(analytics?.total_earnings || 0);

  const platformStats = (analytics?.platform_breakdown || []).map((item) => {
    const platformMeta = platformColorMap[item.platform] || { icon: FaInstagram, color: "text-violet-500", bar: "bg-violet-500" };
    return {
      ...item,
      icon: platformMeta.icon,
      color: platformMeta.color,
      bar: platformMeta.bar,
      views: `${formatCompact(Number(item.views || 0))}`,
      percent: Number(item.percent || 0),
    };
  });

  const topCampaigns = (analytics?.top_campaigns || []).map((campaign) => ({
    ...campaign,
    views: formatCompact(Number(campaign.views || 0)),
    payout: `₹${formatCompact(Number(campaign.payout || 0))}`,
  }));

  const hasCampaigns = topCampaigns.length > 0;
  const hasPlatformData = platformStats.length > 0;
  const hasViewsData = activeViewsData.length > 0;
  const hasPayoutData = activePayoutData.length > 0;
  const hasClippers = (analytics?.top_clippers?.length || 0) > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">Analytics</h1>
        <p className="mt-2 text-zinc-400">Track campaign performance and audience growth.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div> : null}

      {/* Stat cards: Total Views + Revenue grouped on the left,
          Unique Viewers + Avg Watch Time (Coming Soon) grouped on the right */}
      {loading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="grid grid-cols-2 divide-x divide-white/10 rounded-3xl border border-white/10 bg-[#11111A]">
              {[0, 1].map((j) => (
                <div key={j} className="p-6">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-white/10" />
                  <div className="mt-6 h-8 w-20 animate-pulse rounded bg-white/10" />
                  <div className="mt-3 h-4 w-24 animate-pulse rounded bg-white/10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid grid-cols-2 divide-x divide-white/10 rounded-3xl border border-white/10 bg-[#11111A] transition hover:border-violet-500/30">
            <StatHalf
              icon={Eye}
              iconBg="bg-violet-500/10"
              iconText="text-violet-400"
              value={(analytics?.total_views ?? 0).toLocaleString()}
              label="Total Views"
            />
            <StatHalf
              icon={IndianRupee}
              iconBg="bg-emerald-500/10"
              iconText="text-emerald-400"
              value={`₹${Number(analytics?.total_earnings ?? 0).toLocaleString()}`}
              label="Revenue Generated"
            />
          </div>

          <div className="grid grid-cols-2 divide-x divide-white/10 rounded-3xl border border-white/10 bg-[#11111A] transition hover:border-cyan-500/30">
            <ComingSoonHalf icon={Users} iconBg="bg-cyan-500/10" iconText="text-cyan-400" label="Unique Viewers" />
            <ComingSoonHalf icon={Clock3} iconBg="bg-amber-500/10" iconText="text-amber-400" label="Avg Watch Time" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Performance Over Time</h2>
        <div className="flex gap-2">
          {FILTERS.map((period) => (
            <button
              key={period}
              onClick={() => setFilter(period)}
              className={`rounded-xl px-4 py-2 text-sm transition ${
                filter === period
                  ? "bg-violet-600 text-white"
                  : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-violet-500/10 bg-gradient-to-br from-violet-600/10 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Views Overview</p>
              <h3 className="mt-3 text-4xl font-bold text-white">{formatCompact(totalViews)}</h3>
              <p className="mt-2 text-sm text-zinc-500">Total views for {filter}</p>
            </div>
            <Eye size={28} className="text-violet-400" />
          </div>

          <div className="mt-6 rounded-2xl border border-violet-500/20 bg-[#0B0B12] p-4">
            {hasViewsData ? (
              <ViewsChart data={activeViewsData} xKey="period" dataKey="views" />
            ) : (
              <EmptyState
                icon={LineChart}
                title="No views yet"
                description={`No view data for ${filter}. Views will show up here once your campaigns start getting clips.`}
                ctaLabel="Create a Campaign"
                ctaTo={CREATE_CAMPAIGN_ROUTE}
                compact
              />
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-600/10 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Payout Overview</p>
              <h3 className="mt-3 text-4xl font-bold text-white">₹{formatCompact(totalPayout)}</h3>
              <p className="mt-2 text-sm text-zinc-500">Rewards distributed for {filter}</p>
            </div>
            <Wallet size={28} className="text-emerald-400" />
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-[#0B0B12] p-4">
            {hasPayoutData ? (
              <PayoutChart data={activePayoutData} xKey="period" dataKey="payout" />
            ) : (
              <EmptyState
                icon={Wallet}
                title="No payouts yet"
                description={`Nothing paid out for ${filter}. Rewards will show up here once clippers start earning.`}
                ctaLabel="Create a Campaign"
                ctaTo={CREATE_CAMPAIGN_ROUTE}
                compact
              />
            )}
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Platform Breakdown</h2>

        {hasPlatformData ? (
          <div className="mt-8 space-y-6">
            {platformStats.map(({ platform, icon: Icon, color, bar, views, percent }) => (
              <div key={platform}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-white">
                    <Icon size={16} className={color} />
                    {platform}
                  </span>
                  <span className="text-zinc-400">{views} ({percent}%)</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/5">
                  <div
                    style={{ width: `${percent}%` }}
                    className={`h-full rounded-full ${bar} transition-all duration-500`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={PieChart}
            title="No platform data yet"
            description="Once clips start coming in across YouTube, Instagram, and more, their share of views will show up here."
            ctaLabel="Create a Campaign"
            ctaTo={CREATE_CAMPAIGN_ROUTE}
          />
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Campaign Performance</h2>

        {hasCampaigns ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 text-left text-zinc-500">Campaign</th>
                  <th className="pb-4 text-left text-zinc-500">Views</th>
                  <th className="pb-4 text-left text-zinc-500">Submissions</th>
                  <th className="pb-4 text-left text-zinc-500">Payout</th>
                </tr>
              </thead>

              <tbody>
                {topCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-white/5">
                    <td className="py-5 text-white">{campaign.name}</td>
                    <td className="py-5 text-white">{campaign.views}</td>
                    <td className="py-5 text-white">{campaign.submissions}</td>
                    <td className="py-5 font-semibold text-violet-400">{campaign.payout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No campaigns yet"
            description="Launch your first campaign to start collecting clips, views, and payouts here."
            ctaLabel="Create a Campaign"
            ctaTo={CREATE_CAMPAIGN_ROUTE}
          />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" />
            <h2 className="text-2xl font-bold text-white">Top Campaigns</h2>
          </div>

          {hasCampaigns ? (
            <div className="mt-6 space-y-3">
              {topCampaigns.map((campaign, i) => (
                <Link
                  key={campaign.id}
                  to={`/brand/campaigns/${campaign.accessKey}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 p-4 transition hover:border-violet-500/30 hover:bg-white/[0.02]"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${RANK_STYLES[i] ?? "bg-white/5 text-zinc-400"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">{campaign.name}</h3>
                    <p className="mt-1 text-violet-400">{campaign.views} views</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No campaigns to rank"
              description="Your best-performing campaigns will be ranked here by views."
              ctaLabel="Create a Campaign"
              ctaTo={CREATE_CAMPAIGN_ROUTE}
              compact
            />
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-amber-400" />
            <h2 className="text-2xl font-bold text-white">Top Clippers</h2>
          </div>

          {hasClippers ? (
            <div className="mt-6 space-y-3">
              {analytics.top_clippers.map((clipper, i) => (
                <div key={`${clipper.username}-${i}`} className="flex items-center gap-4 rounded-2xl border border-white/10 p-4">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${RANK_STYLES[i] ?? "bg-white/5 text-zinc-400"}`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">{clipper.username}</h3>
                    <p className="mt-1 text-zinc-400">{formatCompact(Number(clipper.views || 0))} views</p>
                  </div>
                  <p className="shrink-0 font-semibold text-violet-400">₹{formatCompact(Number(clipper.earnings || 0))}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Medal}
              title="No clipper activity yet"
              description="Once clippers start submitting clips to your campaigns, your top earners will show up here."
              ctaLabel="Create a Campaign"
              ctaTo={CREATE_CAMPAIGN_ROUTE}
              compact
            />
          )}
        </section>
      </div>
    </div>
  );
}

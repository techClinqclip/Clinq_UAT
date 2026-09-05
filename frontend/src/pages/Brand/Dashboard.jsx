import {
  Plus,
  ArrowRight,
  Megaphone,
  Eye,
  IndianRupee,
  Users,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { resolveImageUrl } from "../../lib/media";

const formatCompact = (n) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n) || 0);

const formatMoney = (n) => `₹${formatCompact(n)}`;

const STATUS_STYLE = {
  active: "bg-emerald-500/10 text-emerald-400",
  live: "bg-emerald-500/10 text-emerald-400",
  completed: "bg-sky-500/10 text-sky-400",
  paused: "bg-amber-500/10 text-amber-400",
  draft: "bg-zinc-500/10 text-zinc-400",
};
const statusClass = (status) =>
  STATUS_STYLE[String(status || "").toLowerCase()] || "bg-violet-500/10 text-violet-400";

// A .5rem/1.5rem skeleton block — used wherever a KPI/campaign card would
// otherwise render "0" or blank text while data is still loading.
function SkeletonBlock({ className }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [creatorsWorkedWith, setCreatorsWorkedWith] = useState(0);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoadingCampaigns(true);
    setCampaignsError(null);

    api("/api/content/campaigns/")
      .then((data) => {
        if (!mounted) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setCampaigns(list);
        // fetch dashboard aggregates in a single request
        api("/api/content/campaigns/dashboard/")
          .then((metrics) => {
            if (!mounted) return;
            setDashboardMetrics(metrics || null);
            if (metrics && typeof metrics.creators_worked_with !== "undefined") {
              setCreatorsWorkedWith(Number(metrics.creators_worked_with) || 0);
            }
          })
          .catch(() => {
            // ignore dashboard fetch errors
          });
      })
      .catch((err) => {
        if (!mounted) return;
        setCampaignsError(err.message || "Unable to load campaigns.");
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoadingCampaigns(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    api("/api/auth/profile/me/", { cache: "no-store" })
      .then((data) => {
        if (mounted) setProfile(data);
      })
      .catch(() => {
        if (mounted) setProfile(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Hero now shows ONLY brand/company name + manager's first name — no
  // description, no separate company-vs-brand line, no role. Keep the
  // computation minimal to match: nothing derived here that isn't
  // actually rendered.
  const brandName =
    profile?.brand_name ||
    profile?.company_name ||
    profile?.onboarding_data?.brandName ||
    profile?.onboarding_data?.companyName ||
    "your brand";
  const managerFirstName =
    profile?.manager_first_name || profile?.onboarding_data?.managerFirstName || "";
  const coverImage = resolveImageUrl(profile?.cover || null);
  const avatarImage = resolveImageUrl(profile?.avatar || profile?.photo || null);
  const showAvatarImage = avatarImage && !avatarFailed;

  const totalCampaigns = dashboardMetrics?.total_campaigns ?? campaigns.length;
  const totalViews =
    dashboardMetrics?.views_generated ?? campaigns.reduce((sum, c) => sum + Number(c.views || 0), 0);
  const totalBudget =
    dashboardMetrics?.total_budget ?? campaigns.reduce((sum, c) => sum + Number(c.budget || 0), 0);
  const effectiveViews = Number(totalViews) > 0 ? totalViews : Number(profile?.views_generated || 0);

  const stats = [
    { title: "Total Campaigns", value: String(totalCampaigns), icon: Megaphone, link: "/brand/campaigns" },
    { title: "Views Generated", value: formatCompact(effectiveViews), icon: Eye, link: "/brand/analytics" },
    { title: "Total Budget", value: formatMoney(totalBudget), icon: IndianRupee, link: "/brand/budget" },
    { title: "Creators Worked With", value: String(creatorsWorkedWith || 0), icon: Users, link: "/brand/campaigns" },
  ];

  const sortedTop = [...campaigns].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 3);
  const sortedRecent = [...campaigns]
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {campaignsError && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-3 text-sm text-rose-300">
          <AlertTriangle size={16} className="shrink-0" />
          {campaignsError}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
        {coverImage ? (
          <img
            src={coverImage}
            alt="Brand cover"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.25em] text-violet-400">Brand Workspace</p>
            <h1 className="mt-3 text-4xl font-bold text-white">Welcome back 👋</h1>

            {/* Identity chip — logo + brand name + manager's first name,
                nothing else. inline-flex + w-fit (instead of a fixed
                max-w-md block) means the box hugs its own content, so
                the padding reads consistently whether the text is
                short ("Clinq · Jonny") or long, rather than a fixed
                width leaving inconsistent whitespace either way. */}
            <div className="mt-6 inline-flex w-fit items-center gap-4 rounded-2xl border border-white/10 bg-black/30 px-5 py-3.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#11111A]">
                {showAvatarImage ? (
                  <img
                    src={avatarImage}
                    alt={`${brandName} logo`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <Building2 size={22} className="text-zinc-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">{brandName}</p>
                {managerFirstName && (
                  <p className="mt-0.5 truncate text-sm text-zinc-400">{managerFirstName}</p>
                )}
              </div>
            </div>
          </div>

          <Link
            to="/brand/campaigns/create"
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Create Campaign
          </Link>
        </div>
      </section>

      {/* KPI Section */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              to={stat.link}
              className="group block rounded-2xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Icon size={18} className="text-violet-400" />
              </div>

              {isLoadingCampaigns ? (
                <SkeletonBlock className="mt-6 h-9 w-20" />
              ) : (
                <h2 className="mt-6 font-mono text-3xl font-bold tabular-nums text-white">{stat.value}</h2>
              )}

              <p className="mt-2 text-sm text-zinc-400">{stat.title}</p>
            </Link>
          );
        })}
      </div>

      {/* Top Performing Campaigns */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Top Performing Campaigns</h2>
          <Link to="/brand/campaigns" className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        {isLoadingCampaigns ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="mt-4 h-6 w-3/4" />
                <SkeletonBlock className="mt-4 h-8 w-16" />
              </div>
            ))}
          </div>
        ) : sortedTop.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">No campaigns yet — create one to see performance here.</p>
            <Link
              to="/brand/campaigns/create"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300"
            >
              <Plus size={14} />
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {sortedTop.map((campaign) => (
              <Link
                key={campaign.id}
                to={`/brand/campaigns/${campaign.accessKey}`}
                className="group block rounded-2xl border border-white/10 bg-black/20 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-white/[0.02]"
              >
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(campaign.status)}`}>
                  {campaign.status}
                </span>

                <h3 className="mt-4 truncate text-xl font-semibold text-white">{campaign.name}</h3>

                <p className="mt-4 font-mono text-3xl font-bold tabular-nums text-violet-400">
                  {formatCompact(campaign.views)}
                </p>
                <p className="text-sm text-zinc-500">Views Generated</p>

                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors group-hover:text-violet-400">
                  View Details
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Campaign Showcase */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#11111A] to-[#0B0B12] p-8">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Campaign Showcase</h2>
          <Link to="/brand/campaigns" className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300">
            View All Campaigns
            <ArrowRight size={16} />
          </Link>
        </div>

        {isLoadingCampaigns ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonBlock key={i} className="h-[76px] w-full" />
            ))}
          </div>
        ) : sortedRecent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">Nothing here yet — campaigns you create will show up in this list.</p>
            <Link
              to="/brand/campaigns/create"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300"
            >
              <Plus size={14} />
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRecent.map((campaign) => (
              <Link
                key={campaign.id}
                to={`/brand/campaigns/${campaign.accessKey}`}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:bg-white/[0.02] md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">{campaign.name}</h3>
                  <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-8">
                  <div>
                    <p className="font-mono text-lg font-semibold tabular-nums text-white">
                      {formatCompact(campaign.views)}
                    </p>
                    <p className="text-sm text-zinc-500">Views</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors group-hover:text-violet-400">
                    Open
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
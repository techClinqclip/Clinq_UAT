import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Plus,
  Search,
  Eye,
  Users,
  Wallet,
  TrendingUp,
  Mic,
  Dumbbell,
  LineChart,
  Play,
  Video,
  Maximize2,
  AlertTriangle,
} from "lucide-react";
import CampaignCardSkeleton from "../../shared/ui/CampaignCardSkeleton";
import useToast from "../../hooks/useToast";

const ACCENTS = {
  violet: {
    text: "text-violet-400",
    iconBg: "bg-violet-500/10",
    cover: "from-violet-500/25 via-violet-500/5 to-transparent",
    border: "hover:border-violet-500/50",
    glow: "hover:shadow-violet-500/20",
    bar: "from-violet-500 to-fuchsia-400",
    solidBtn: "bg-violet-600 hover:bg-violet-500",
    chip: "bg-violet-500/10 text-violet-300",
  },
  emerald: {
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
    cover: "from-emerald-500/25 via-emerald-500/5 to-transparent",
    border: "hover:border-emerald-500/50",
    glow: "hover:shadow-emerald-500/20",
    bar: "from-emerald-500 to-teal-400",
    solidBtn: "bg-emerald-600 hover:bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-300",
  },
  amber: {
    text: "text-amber-400",
    iconBg: "bg-amber-500/10",
    cover: "from-amber-500/25 via-amber-500/5 to-transparent",
    border: "hover:border-amber-500/50",
    glow: "hover:shadow-amber-500/20",
    bar: "from-amber-500 to-orange-400",
    solidBtn: "bg-amber-500 hover:bg-amber-400",
    chip: "bg-amber-500/10 text-amber-300",
  },
};

const formatCompact = (n) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const formatMoney = (n) => `₹${formatCompact(n)}`;

const CATEGORY_ICON_MAP = {
  Podcast: Mic,
  Finance: LineChart,
  Fitness: Dumbbell,
  Gaming: Play,
  Entertainment: Video,
  Technology: TrendingUp,
  Lifestyle: Users,
};

const CATEGORY_ACCENT_MAP = {
  Podcast: "violet",
  Finance: "emerald",
  Fitness: "amber",
  Gaming: "cyan",
  Entertainment: "violet",
  Technology: "emerald",
  Lifestyle: "amber",
};

const capitalize = (value) =>
  typeof value === "string" && value.length > 0
    ? `${value[0].toUpperCase()}${value.slice(1)}`
    : value;

function CampaignCard({ campaign, onTogglePause }) {
  const { name, category, status, thumbnail, views, submissions, budget, paidOut } = campaign;
  const navigate = useNavigate();
  const categoryLabel = capitalize(category);
  const Icon = campaign.icon || CATEGORY_ICON_MAP[categoryLabel] || Mic;
  const accent = campaign.accent || CATEGORY_ACCENT_MAP[categoryLabel] || "violet";
  const a = ACCENTS[accent] || ACCENTS.violet;
  const numericBudget = Number(budget) || 0;
  const numericPaidOut = Number(paidOut) || 0;
  const progress = numericBudget ? Math.min(100, Math.round((numericPaidOut / numericBudget) * 100)) : 0;
  const isActive = String(status).toLowerCase() === "active";
  const statusLabel = capitalize(status);
  const title = name || "Untitled campaign";
  const remainingBudget = Number(
    campaign.remainingBudget ??
      campaign.remaining_budget ??
      Math.max(numericBudget - numericPaidOut, 0)
  );
  const needsSettlement = Boolean(
    campaign.needsRemainingSettlement ??
      (String(status || "").toLowerCase() === "closed" && remainingBudget > 0 && !campaign.remainingFundsSettled && (campaign.closureReason || campaign.closure_reason) !== 'budget')
  );

  const openCampaign = () => navigate(`/brand/campaigns/${campaign.accessKey}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openCampaign}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openCampaign();
        }
      }}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11111A] shadow-2xl shadow-transparent transition-all duration-300 ease-out hover:z-10 hover:-translate-y-3 hover:scale-[1.03] hover:shadow-black/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${a.border} ${a.glow}`}
    >
      {/* Cover */}
      <div className="relative h-36 overflow-hidden sm:h-40">
        {thumbnail ? (
          <>
            <img
              src={thumbnail}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
            <div
              className={`absolute inset-0 bg-gradient-to-t ${a.cover} opacity-0 transition-opacity duration-300 group-hover:opacity-60`}
            />
            <div className="absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
                <Play size={16} className="ml-0.5 fill-white text-white" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${a.cover}`} />
            <Icon
              size={110}
              strokeWidth={1}
              className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"
            />
          </>
        )}

        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${a.chip}`}>
              <Icon size={12} />
              {category}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                isActive ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
              }`}
            >
              {status}
            </span>
          </div>
          {needsSettlement && (
            <div className="mt-3 flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-300">
              <AlertTriangle size={12} />
              Settlement required
            </div>
          )}
          <h3 className="text-lg font-bold leading-tight text-white drop-shadow-sm">{title}</h3>
        </div>

        <div className="absolute bottom-3 right-3 z-20 flex h-8 w-8 scale-75 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <Maximize2 size={13} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-5">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
            <Eye size={15} className={a.text} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Views</p>
            <p className="truncate text-base font-bold text-white">{formatCompact(views)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
            <Users size={15} className={a.text} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Submissions</p>
            <p className="truncate text-base font-bold text-white">{submissions}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}>
            <Wallet size={15} className={a.text} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Budget</p>
            <p className="truncate text-base font-bold text-white">{formatMoney(budget)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingUp size={15} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Paid out</p>
            <p className="truncate text-base font-bold text-emerald-400">{formatMoney(paidOut)}</p>
          </div>
        </div>
      </div>

      {/* Payout progress = paid out / budget */}
      <div className="px-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            {formatMoney(paidOut)} of {formatMoney(budget)} paid out
          </span>
          <span className="font-semibold text-white">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${a.bar} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-within:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 p-5 pt-5">
            <Link
              to={`/brand/campaigns/${campaign.accessKey}`}
              onClick={(e) => e.stopPropagation()}
              className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white transition ${a.solidBtn}`}
            >
              Open Campaign
            </Link>
            <Link
              to={`/brand/campaigns/${campaign.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white transition hover:border-white/30"
            >
              Edit
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePause(campaign.id);
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm transition ${
                isActive
                  ? "border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                  : "border-green-500/20 text-green-400 hover:bg-green-500/10"
              }`}
            >
              {isActive ? "Pause" : "Resume"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    const loadCampaigns = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api("/api/content/campaigns/?summary=true");
        setCampaigns(Array.isArray(data) ? data : data?.results || []);
      } catch (err) {
        console.error("Failed to load campaigns", err);
        setError(err.message || "Unable to load campaigns.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const handleTogglePause = async (id) => {
    const previous = campaigns;
    const updated = campaigns.map((campaign) =>
      campaign.id === id
        ? { ...campaign, status: campaign.status === "active" ? "paused" : "active" }
        : campaign
    );

    setCampaigns(updated);

    const campaign = updated.find((item) => item.id === id);
    const nextStatus = campaign?.status || "active";

    try {
      await api(`/api/content/campaigns/${id}/`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
    } catch (err) {
      console.error("Failed to update campaign status", err);
      setCampaigns(previous);
      showToast({
        type: "error",
        message: err.message || "Unable to update campaign status.",
      });
    }
  };

  const filtered = campaigns.filter((c) => {
    const normalizedStatus = String(c.status || "").toLowerCase();
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    if (search && !matchesSearch) return false;
    if (filter === "All") return true;
    if (filter === "Active") return normalizedStatus === "active";
    if (filter === "Paused") return normalizedStatus === "paused";
    if (filter === "Closed") return normalizedStatus === "closed";
    return true;
  });

  // Header + Create button rendered up front so they stay visible during
  // loading instead of the whole page disappearing behind plain text.
  const header = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-4xl font-bold text-white">Campaigns</h1>
        <p className="mt-2 text-zinc-400">Manage all your clipping campaigns.</p>
      </div>

      <Link
        to="/brand/campaigns/create"
        className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500"
      >
        <Plus size={18} />
        Create Campaign
      </Link>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        {header}
        <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        {header}
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search campaigns..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-[#11111A] py-3 pl-11 pr-4 text-white outline-none focus:border-violet-500"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {["All", "Active", "Paused", "Closed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-violet-600 text-white"
                : "border border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Campaign grid */}
          {/* Campaign grid */}
          <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length > 0 ? (
          filtered.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} onTogglePause={handleTogglePause} />
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#11111A] py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.03]">
              <Wallet size={28} className="text-zinc-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-white">
              {search || filter !== "All" ? "No Campaigns Found" : "No Campaigns Yet"}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              {search || filter !== "All"
                ? "Try adjusting your search or filter."
                : "Create a campaign to start putting your budget to work."}
            </p>
            {!search && filter === "All" && (
              <Link
                to="/brand/campaigns/create"
                className="mt-6 flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500"
              >
                <Plus size={18} />
                Create Campaign
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

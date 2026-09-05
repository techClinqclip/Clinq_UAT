import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Wallet,
  TrendingUp,
  FileVideo,
  Mic,
  Megaphone,
  FilterX,
  Play,
  Maximize2,
  AlertTriangle,
} from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";

const initialGigs = [];

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

const FILTERS = ["All", "Active", "Paused", "Closed"];

function GigCard({ gig, onTogglePause }) {
  const { title, category, icon: Icon, accent, status, thumbnail, views, submissions, budget, paidOut } = gig;
  const navigate = useNavigate();
  const a = ACCENTS[accent];
  const progress = Math.min(100, Math.round((paidOut / budget) * 100));
  const isActive = status === "Active";
  const isCompleted = status === "Completed";
  const isClosed = String(status || "").toLowerCase() === "closed";
  const actionLocked = isClosed;
  const needsSettlement = Boolean(gig.needsRemainingSettlement ?? (isClosed && Number(gig.remainingBudget ?? 0) > 0 && !gig.remainingFundsSettled && (gig.closureReason || gig.closure_reason) !== 'budget'));

  const openGig = () => navigate(`/creator/gigs/${gig.accessKey}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openGig}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openGig();
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
                isActive ? "bg-green-500/15 text-green-400" : isClosed ? "bg-yellow-500/15 text-yellow-400" : "bg-zinc-500/15 text-zinc-400"
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
            <FileVideo size={15} className={a.text} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">Clips</p>
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

      {/* Actions — collapsed by default on desktop, expands on hover/focus */}
      <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out lg:grid-rows-[0fr] lg:group-hover:grid-rows-[1fr] lg:group-focus-within:grid-rows-[1fr]">
        <div className="overflow-hidden">
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 p-5 pt-5">
            <Link
              to={`/creator/gigs/${gig.accessKey}`}
              onClick={(e) => e.stopPropagation()}
              className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white transition ${a.solidBtn}`}
            >
              Open Gig
            </Link>
            <Link
              to={`/creator/gigs/${gig.id}/edit`}
              onClick={(e) => {
                if (actionLocked) {
                  e.preventDefault();
                  return;
                }
                e.stopPropagation();
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm transition ${actionLocked ? "pointer-events-none cursor-not-allowed border-white/10 text-zinc-500" : "border-white/10 text-white hover:border-white/30"}`}
            >
              Edit
            </Link>
            {!isCompleted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!actionLocked) onTogglePause(gig.id);
                }}
                disabled={actionLocked}
                className={`rounded-xl border px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? "border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                    : "border-green-500/20 text-green-400 hover:bg-green-500/10"
                } ${actionLocked ? "border-white/10 text-zinc-500" : ""}`}
              >
                {actionLocked ? "Closed" : isActive ? "Pause" : "Resume"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Two distinct empty states:
// - The creator genuinely has zero gigs → nudge them to create one.
// - They have gigs, but the current search/filter matched none → offer
//   to clear the filters instead of a dead-end "create" CTA.
function EmptyGigsState({ hasAnyGigs, onClearFilters }) {
  if (!hasAnyGigs) {
    return (
      <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-[#11111A] px-8 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
          <Megaphone size={36} className="text-violet-400" />
        </div>

        <h2 className="mt-6 text-2xl font-bold text-white">No Gigs Yet</h2>

        <p className="mx-auto mt-3 max-w-md text-zinc-400">
          You haven't created any gigs yet. Launch your first one to start
          collecting clips, views, and submissions.
        </p>

        <Link
          to="/creator/gigs/create"
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
        >
          <Plus size={18} />
          Create Gig
        </Link>
      </div>
    );
  }

  return (
    <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-[#11111A] px-8 py-20 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
        <Search size={36} className="text-violet-400" />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-white">No Gigs Found</h2>

      <p className="mx-auto mt-3 max-w-md text-zinc-400">
        We couldn't find any gigs matching your search or filters. Try
        adjusting them or clear everything to see all your gigs again.
      </p>

      <button
        type="button"
        onClick={onClearFilters}
        className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
      >
        <FilterX size={18} />
        Clear Filters
      </button>
    </div>
  );
}

export default function CreatorGigs() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const [gigs, setGigs] = useState(initialGigs);
  const [filter, setFilter] = useState(FILTERS.includes(statusFilter) ? statusFilter : "All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setFilter(FILTERS.includes(statusFilter) ? statusFilter : "All");
  }, [statusFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadGigs = async () => {
      try {
        setLoading(true);
        setError("");
        // Use the new unified endpoint for creator gigs
        const data = await api("/api/content/campaigns/my-gigs/?summary=true");
        if (!isMounted) return;

        const normalized = (data?.results || data || []).map((gig) => ({
          id: gig.id,
          accessKey: gig.accessKey,
          title: gig.name || gig.title || "",  // API returns 'name' not 'title'
          category: gig.category || "General",
          icon: Mic,
          accent: "violet",
          status: gig.status?.charAt(0).toUpperCase() + gig.status?.slice(1) || "Draft",
          thumbnail: gig.thumbnailUrl || gig.thumbnail_url || null,
          views: gig.views || 0,
          submissions: gig.submissions || 0,  // API returns 'submissions' not 'submissions_count'
          budget: Number(gig.budget || 0),
          paidOut: Number(gig.paidOut || 0),  // API returns camelCase 'paidOut'
          remainingBudget: Number(gig.remainingBudget ?? gig.remaining_budget ?? Math.max(Number(gig.budget || 0) - Number(gig.paidOut || 0), 0)),
          remainingFundsSettled: Boolean(gig.remainingFundsSettled ?? gig.remaining_funds_settled ?? false),
          needsRemainingSettlement: Boolean(
            gig.needsRemainingSettlement ??
              (String(gig.status || "").toLowerCase() === "closed" && Number(gig.remainingBudget ?? gig.remaining_budget ?? Math.max(Number(gig.budget || 0) - Number(gig.paidOut || 0), 0)) > 0 && !Boolean(gig.remainingFundsSettled ?? gig.remaining_funds_settled ?? false))
          ),
        }));
        setGigs(normalized);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Unable to load your gigs right now.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadGigs();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePause = (id) => {
    setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, status: g.status === "Active" ? "Paused" : "Active" } : g)));
  };

  const handleClearFilters = () => {
    setFilter("All");
    setSearch("");
  };

  const filtered = gigs.filter((g) => {
    const matchesFilter = filter === "All" || g.status === filter;
    const matchesSearch = (g.title || "").toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Breadcrumbs overrides={{ Campaigns: "Gigs" }} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">My Gigs</h1>
            <p className="mt-2 text-zinc-400">Manage all your active and completed  gigs.</p>
          </div>

          <Link
            to="/creator/gigs/create"
            className="flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Create Gig
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gigs..."
          className="w-full rounded-2xl border border-white/10 bg-[#11111A] py-3 pl-11 pr-4 text-white outline-none focus:border-violet-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-violet-600 text-white"
                : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div> : null}

      {/* Gig Cards */}
      <div className="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
              <div className="h-36 animate-pulse rounded-2xl bg-white/10" />
              <div className="mt-4 h-4 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-6 w-32 animate-pulse rounded bg-white/10" />
            </div>
          ))
        ) : filtered.length > 0 ? (
          filtered.map((gig) => <GigCard key={gig.id} gig={gig} onTogglePause={handleTogglePause} />)
        ) : (
          <EmptyGigsState hasAnyGigs={gigs.length > 0} onClearFilters={handleClearFilters} />
        )}
      </div>
    </div>
  );
}
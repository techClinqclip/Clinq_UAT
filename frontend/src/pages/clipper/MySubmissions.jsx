import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock3,
  XCircle,
  Search,
  FileVideo,
  IndianRupee,
  Trash2,
  Eye,
  Download,
  PlayCircle,
  Wallet,
  AlertTriangle,
  X,
  Sparkles,
  Trophy,
  Percent,
} from "lucide-react";
import { FaInstagram, FaYoutube, FaFacebook } from "react-icons/fa";
import { api } from "../../lib/api";
import MarketplaceLoadingSkeleton from "../../components/MarketplaceLoadingSkeleton";

// ----------------------------------------------------------------------
// Platform Icon Component
// ----------------------------------------------------------------------
const PlatformIcon = ({ platform }) => {
  const iconProps = { size: 16, className: "mr-1.5 inline-block" };
  switch (platform?.toLowerCase()) {
    case "instagram":
      return <FaInstagram {...iconProps} className={`${iconProps.className} text-pink-400`} />;
    case "youtube":
      return <FaYoutube {...iconProps} className={`${iconProps.className} text-red-400`} />;
    case "facebook":
      return <FaFacebook {...iconProps} className={`${iconProps.className} text-sky-400`} />;
    default:
      return <FileVideo {...iconProps} className={`${iconProps.className} text-zinc-500`} />;
  }
};

// ----------------------------------------------------------------------
// Delete Confirmation Modal — self-contained so it always renders
// correctly on this dark theme (previously relied on an external
// component that wasn't showing up / wasn't themed for dark mode).
// ----------------------------------------------------------------------
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, clipTitle }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#131316] p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/10">
              <AlertTriangle className="text-rose-400" size={20} />
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <h3 className="mt-4 text-lg font-semibold text-white">Delete submission</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Are you sure you want to delete "{clipTitle}"? This action cannot be undone.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const INSIGHT_ICON_STYLE = {
  violet: "bg-violet-500/10 text-violet-400",
  sky: "bg-sky-500/10 text-sky-400",
  amber: "bg-amber-500/10 text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
};

const STATUS_STYLE = {
  Approved: { badge: "bg-emerald-500/10 text-emerald-400", icon: CheckCircle2 },
  Pending: { badge: "bg-amber-500/10 text-amber-400", icon: Clock3 },
  Rejected: { badge: "bg-rose-500/10 text-rose-400", icon: XCircle },
};

function exportSubmissionsCSV(rows) {
  const header = "id,campaign,clipTitle,platform,status,views,earnings,submittedAt\n";
  const body = rows
    .map(
      (s) =>
        `${s.id},"${s.campaign}","${s.clipTitle}",${s.platform},${s.status},${s.views ?? ""},${s.earnings},${s.submittedAt}`
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-submissions.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const normalizeText = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeStatus = (value) => {
  const text = normalizeText(value, "Pending").toLowerCase();
  if (text === "approved") return "Approved";
  if (text === "rejected") return "Rejected";
  return "Pending";
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function MySubmissions() {
  // ---------- State (backend wired) ----------
  const [joinedCampaigns, setJoinedCampaigns] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [sortBy, setSortBy] = useState("Latest");
  const [expandedCampaigns, setExpandedCampaigns] = useState({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  // ---------- Derived Global Stats ----------
  const total = displayRows.length;
  const approved = displayRows.filter((s) => s.status === "Approved").length;
  const pending = displayRows.filter((s) => s.status === "Pending").length;
  const rejected = displayRows.filter((s) => s.status === "Rejected").length;
  const totalEarnings = displayRows.reduce((sum, s) => sum + s.earnings, 0);

  const activity = useMemo(() => {
    return displayRows.slice(0, 4).map((submission) => ({
      id: submission.id,
      title: submission.isJoinedCampaign ? `Joined • ${submission.campaign}` : `${submission.status} • ${submission.campaign}`,
      date: submission.submittedAt,
      status: submission.isJoinedCampaign ? "pending" : submission.status.toLowerCase() === "approved" ? "completed" : "pending",
      icon: submission.isJoinedCampaign ? Clock3 : submission.status.toLowerCase() === "approved" ? CheckCircle2 : Clock3,
    }));
  }, [displayRows]);

  const joinedCampaignRows = useMemo(() => {
    return (Array.isArray(joinedCampaigns) ? joinedCampaigns : []).map((campaign) => ({
      id: `campaign-${campaign.id}`,
      campaign: normalizeText(campaign.name || campaign.title || "Unknown campaign", "Unknown campaign"),
      clipTitle: normalizeText(campaign.name || campaign.title || "Unknown campaign", "Unknown campaign"),
      platform: Array.isArray(campaign.platforms) && campaign.platforms.length ? campaign.platforms[0] : "Campaign",
      handle: "",
      status: normalizeStatus(campaign.status || "Active"),
      views: normalizeNumber(campaign.totalViews || 0, 0),
      earnings: normalizeNumber(campaign.myEarnings || 0, 0),
      pendingPayout: normalizeNumber(campaign.pendingPayout || 0, 0),
      submittedAt: campaign.deadline ? new Date(campaign.deadline).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) : "Not submitted yet",
      thumbnail: campaign.thumbnail || null,
      isJoinedCampaign: true,
    }));
  }, [joinedCampaigns]);

  const displayRows = useMemo(() => {
    return [...joinedCampaignRows, ...submissions];
  }, [joinedCampaignRows, submissions]);

  // ---------- Filtering & Sorting (unchanged) ----------
  const filteredSubmissions = useMemo(() => {
    let filtered = [...displayRows];
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.clipTitle.toLowerCase().includes(query) ||
          s.campaign.toLowerCase().includes(query) ||
          (s.platform || "").toLowerCase().includes(query)
      );
    }
    if (status !== "All") filtered = filtered.filter((s) => s.status === status);
    switch (sortBy) {
      case "Oldest":
        filtered.reverse();
        break;
      case "Highest Views":
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case "Highest Earnings":
        filtered.sort((a, b) => b.earnings - a.earnings);
        break;
      default:
        break;
    }
    return filtered;
  }, [displayRows, search, status, sortBy]);

  // ---------- Group by Campaign (unchanged) ----------
  const campaignGroups = useMemo(() => {
    const groups = {};
    filteredSubmissions.forEach((sub) => {
      const key = sub.campaign || "Unknown campaign";
      if (!groups[key]) groups[key] = [];
      groups[key].push(sub);
    });
    return Object.entries(groups).map(([name, subs]) => ({
      name,
      submissions: subs,
      totalSubmissions: subs.length,
      approved: subs.filter((s) => s.status === "Approved").length,
      pending: subs.filter((s) => s.status === "Pending").length,
      totalEarnings: subs.reduce((sum, s) => sum + (s.earnings || 0), 0),
      lastSubmission: subs.reduce(
        (latest, s) => {
          if (!s.submittedAt || s.submittedAt === "Not submitted yet") return latest;
          return s.submittedAt > latest ? s.submittedAt : latest;
        },
        subs[0]?.submittedAt || ""
      ),
    }));
  }, [filteredSubmissions]);

  // ---------- Handlers (unchanged) ----------
  useEffect(() => {
    let mounted = true;

    const loadSubmissions = async () => {
      setLoading(true);
      setError("");

      try {
        const [joinedData, submissionsData] = await Promise.all([
          api("/api/content/campaigns/clipper-gigs/"),
          api("/api/content/clipper-submissions/"),
        ]);

        if (!mounted) return;

        setJoinedCampaigns(Array.isArray(joinedData) ? joinedData : []);
        setSubmissions(
          Array.isArray(submissionsData)
            ? submissionsData.map((item) => {
                const handle = normalizeText(item.handle, "");
                const campaign = normalizeText(item.campaign, "Unknown campaign");
                const platform = normalizeText(item.platform, "Unknown");
                const submissionStatus = normalizeStatus(item.status);

                return {
                  id: item.id,
                  campaign,
                  clipTitle:
                    handle !== ""
                      ? `${handle} clip`
                      : campaign !== "Unknown campaign"
                        ? `${campaign} clip`
                        : `Submission ${item.id}`,
                  platform,
                  handle,
                  status: submissionStatus,
                  views: normalizeNumber(item.views, 0),
                  earnings: normalizeNumber(item.earned, 0),
                  pendingPayout: normalizeNumber(item.pendingPayout, 0),
                  submittedAt: item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "Unknown",
                  thumbnail: item.thumbnail || null,
                };
              })
            : []
        );
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Unable to load submissions.");
        setJoinedCampaigns([]);
        setSubmissions([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadSubmissions();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleCampaign = (campaignName) => {
    setExpandedCampaigns((prev) => ({
      ...prev,
      [campaignName]: !prev[campaignName],
    }));
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("All");
    setSortBy("Latest");
  };

  const handleDeleteClick = (submission) => {
    setSelectedSubmission(submission);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedSubmission?.isJoinedCampaign) {
      setJoinedCampaigns((prev) => prev.filter((campaign) => campaign.id !== selectedSubmission.id));
    } else {
      setSubmissions((prev) => prev.filter((s) => s.id !== selectedSubmission.id));
    }
    setDeleteModalOpen(false);
    setSelectedSubmission(null);
  };

  // ---------- Submission Insights — analysis, not raw totals, so it never
  // repeats what the top KPI cards already show. ----------
  const insights = useMemo(() => {
    const approvedSubs = displayRows.filter((s) => s.status === "Approved");
    const approvalRate = total ? Math.round((approved / total) * 100) : 0;

    const platformCounts = displayRows.reduce((acc, s) => {
      acc[s.platform] = (acc[s.platform] || 0) + 1;
      return acc;
    }, {});
    const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];

    const byCampaignEarnings = displayRows.reduce((acc, s) => {
      acc[s.campaign] = (acc[s.campaign] || 0) + s.earnings;
      return acc;
    }, {});
    const bestCampaign = Object.entries(byCampaignEarnings).sort((a, b) => b[1] - a[1])[0];

    const avgEarningsPerApproved = approvedSubs.length
      ? Math.round(totalEarnings / approvedSubs.length)
      : 0;

    return [
      {
        icon: Percent,
        color: "violet",
        label: "Approval Rate",
        value: `${approvalRate}%`,
        detail: `${approved} of ${total} submissions approved`,
      },
      {
        icon: Sparkles,
        color: "sky",
        label: "Most Used Platform",
        value: topPlatform ? topPlatform[0] : "—",
        detail: topPlatform ? `${topPlatform[1]} submissions` : "No data yet",
      },
      {
        icon: Trophy,
        color: "amber",
        label: "Best Earning Campaign",
        value: bestCampaign ? bestCampaign[0] : "—",
        detail: bestCampaign ? `₹${bestCampaign[1].toLocaleString()} earned` : "No data yet",
      },
      {
        icon: IndianRupee,
        color: "emerald",
        label: "Avg. Earnings / Approved Clip",
        value: `₹${avgEarningsPerApproved.toLocaleString()}`,
        detail: `${approvedSubs.length} approved clip${approvedSubs.length === 1 ? "" : "s"}`,
      },
    ];
  }, [displayRows, total, approved, totalEarnings]);

  if (loading) {
    return <MarketplaceLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#08080a] font-[system-ui] text-white">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 9999px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.22); }
      `}</style>

      {/* Subtle page-level accent — the hero no longer carries its own background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-violet-500/[0.06] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-[1920px] px-6 py-10 sm:px-8">
        {/* ================= HERO ================= */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Link to="/dashboard" className="transition hover:text-violet-300">
              Dashboard
            </Link>
            <ChevronRight size={14} className="text-zinc-700" />
            <span className="font-medium text-zinc-300">My Submissions</span>
          </div>

          {error ? (
            <div className="mt-6 rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-100">
              <strong>Unable to load submissions:</strong> {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            {/* LEFT */}
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300">
                <FileVideo size={12} />
                Creator Workspace
              </span>

              <h1 className="mt-6 text-5xl font-bold leading-[1.1] tracking-tight text-white lg:text-6xl">
                Manage every submission from one place.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
                Track approvals, monitor campaign performance, and review earnings
                across all your campaigns.
              </p>
            </div>

            {/* RIGHT — the only visual accent on the hero */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
            >
              <Upload size={16} />
              Submit New Clip
            </motion.button>
          </div>
        </motion.section>

        {/* ========== KPI CARDS — the single source of truth for these numbers ========== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          {[
            { label: "Total Submissions", value: total, icon: FileVideo, color: "violet" },
            { label: "Approved", value: approved, icon: CheckCircle2, color: "emerald" },
            { label: "Pending", value: pending, icon: Clock3, color: "amber" },
            { label: "Lifetime Earnings", value: `₹${totalEarnings.toLocaleString()}`, icon: IndianRupee, color: "emerald" },
          ].map((card) => (
            <div
              key={card.label}
              className="flex h-full flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                <card.icon className={`text-${card.color}-400`} size={18} />
              </div>
              <div className="mt-5">
                <p className="text-sm text-zinc-500">{card.label}</p>
                <h3 className="mt-1.5 font-mono text-3xl font-bold tabular-nums tracking-tight text-white">
                  {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                </h3>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ========== GLOBAL FILTERS — compact toolbar, kept visually quiet ========== */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input
                type="text"
                placeholder="Search submissions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              >
                <option value="All">All Status</option>
                <option>Approved</option>
                <option>Pending</option>
                <option>Rejected</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              >
                <option>Latest</option>
                <option>Oldest</option>
                <option>Highest Views</option>
                <option>Highest Earnings</option>
              </select>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClearFilters}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                Clear Filters
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => exportSubmissionsCSV(filteredSubmissions)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                <Download size={13} />
                Export
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ========== CAMPAIGN CARDS — primary content on this page ========== */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold text-white">Campaigns</h2>

          <div className="mt-5 space-y-4">
        {campaignGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-6 py-20 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
              <FileVideo className="h-9 w-9 text-violet-300" />
            </div>
            <h3 className="text-xl font-semibold text-white">No matching campaigns</h3>
            <p className="mx-auto mt-3 max-w-md text-zinc-500">
              No campaigns match your current filters. Try adjusting your search or status.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-6 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          campaignGroups.map((camp, index) => {
            const isExpanded = expandedCampaigns[camp.name] || false;
            return (
              <motion.div
                key={camp.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition hover:border-white/[0.12]"
              >
                {/* Clickable Header */}
                <div
                  onClick={() => toggleCampaign(camp.name)}
                  className="cursor-pointer p-7 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/5 sm:flex">
                        <FileVideo className="h-6 w-6 text-violet-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white">{camp.name}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <FileVideo size={13} className="text-violet-400" />
                            {camp.totalSubmissions} submissions
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-400" />
                            {camp.approved} approved
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock3 size={13} className="text-amber-400" />
                            {camp.pending} pending
                          </span>
                          <span className="flex items-center gap-1.5 font-mono tabular-nums">
                            <IndianRupee size={13} className="text-emerald-400" />
                            {camp.totalEarnings.toLocaleString()}
                          </span>
                          <span className="text-zinc-600">Last: {camp.lastSubmission}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to campaign view (optional)
                        }}
                        className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] sm:inline-flex"
                      >
                        View Submissions
                      </motion.button>
                      <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown size={18} className="text-zinc-500" />
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Expandable Submissions Table */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden border-t border-white/[0.08]"
                    >
                      {camp.submissions.length > 0 ? (
                        <div className="custom-scrollbar max-h-[360px] overflow-x-auto overflow-y-auto">
                          <table className="w-full min-w-[900px] border-collapse text-sm">
                            <thead className="sticky top-0 z-10 bg-[#0c0c0e]">
                              <tr className="border-b border-white/10 text-left text-sm text-zinc-400">
                                <th className="px-6 py-3.5 font-medium">Clip</th>
                                <th className="px-6 py-3.5 font-medium">Platform</th>
                                <th className="px-6 py-3.5 font-medium">Status</th>
                                <th className="px-6 py-3.5 text-right font-medium">Views</th>
                                <th className="px-6 py-3.5 text-right font-medium">Reward</th>
                                <th className="px-6 py-3.5 font-medium">Submitted</th>
                                <th className="px-6 py-3.5 text-right font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {camp.submissions.map((sub) => {
                                const st = STATUS_STYLE[sub.status];
                                const StatusIcon = st.icon;
                                return (
                                  <motion.tr
                                    key={sub.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]"
                                  >
                                    <td className="px-6 py-4">
                                      <p className="font-medium text-zinc-200">{sub.clipTitle}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className="inline-flex items-center text-sm text-zinc-300">
                                        <PlatformIcon platform={sub.platform} />
                                        {sub.platform}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${st.badge}`}
                                      >
                                        <StatusIcon size={12} />
                                        {sub.status}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono tabular-nums text-zinc-300">
                                      {sub.views ? sub.views.toLocaleString() : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <span className="font-mono tabular-nums text-emerald-400">
                                        ₹{sub.earnings.toLocaleString()}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">{sub.submittedAt}</td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Link
                                          to={`/submissions/${sub.id}`}
                                          title="View submission"
                                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-violet-500/10 hover:text-violet-300"
                                        >
                                          <Eye size={16} />
                                        </Link>
                                        {!sub.isJoinedCampaign && (
                                          <button
                                            onClick={() => handleDeleteClick(sub)}
                                            title="Delete submission"
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </motion.tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-6 py-12 text-center">
                          <p className="text-zinc-500">No submissions in this campaign match the current filters.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
          </div>
        </div>

        {/* ========== ACTIVITY TIMELINE + INSIGHTS — secondary info, kept compact ========== */}
        <div className="mt-14 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="flex items-center gap-2.5">
              <Clock3 className="text-violet-400" size={16} />
              <h2 className="text-base font-semibold text-white">Activity Timeline</h2>
            </div>

            <div className="relative mt-5">
              {activity.map((item, index) => {
                const Icon = item.icon;
                const completed = item.status === "completed";
                return (
                  <div key={item.id} className="relative flex gap-4 pb-7 last:pb-0">
                    {index !== activity.length - 1 && (
                      <span className="absolute left-[15px] top-9 h-[calc(100%-1.25rem)] w-px bg-white/10" />
                    )}
                    <div
                      className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        completed
                          ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-zinc-200">{item.title}</h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            completed ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {completed ? "Completed" : "Pending"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{item.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Submission Insights — analysis derived from your data, not a repeat of the top cards */}
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
            <div className="flex items-center gap-2.5">
              <Sparkles className="text-violet-400" size={16} />
              <h2 className="text-base font-semibold text-white">Submission Insights</h2>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {insights.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${INSIGHT_ICON_STYLE[item.color]}`}>
                    <item.icon size={15} />
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">{item.label}</p>
                  <p className="mt-1 truncate text-lg font-semibold text-white">{item.value}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          clipTitle={selectedSubmission?.clipTitle}
        />
      </div>
    </div>
  );
}
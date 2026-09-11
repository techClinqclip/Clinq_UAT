import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  CircleDollarSign,
  Wallet,
  PlayCircle,
  MessageSquare,
  ExternalLink,
  FileText,
  Eye,
  Trash2,
  Copy,
  Check,
  Play,
  CalendarDays,
  Clock,
  Plus,
  AlertTriangle,
  RefreshCw,
  FileQuestion,
  Loader2,
  Send,
  XCircle,
  Hourglass,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { FaInstagram, FaYoutube, FaTiktok, FaFacebook, FaGlobe } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { api } from "../../lib/api";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import SubmitClipDialog from "./SubmitClipDialog";
import ConfirmModal from "../../shared/ui/ComfirmModal";

const STATUS_STYLES = {
  pending: "bg-yellow-500/10 text-yellow-400",
  approved: "bg-green-500/10 text-green-400",
  active: "bg-green-500/10 text-green-400",
  paused: "bg-amber-500/10 text-amber-300",
  closed: "bg-zinc-500/10 text-zinc-300",
  rejected: "bg-red-500/10 text-red-400",
  paid: "bg-violet-500/10 text-violet-400",
};

function formatCompactNumber(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

// Indian-style currency shorthand: thousand -> k, lakh -> L, crore -> Cr
function formatINR(value) {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return "₹0";
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);

  const trim = (n) => {
    const fixed = n.toFixed(2);
    return fixed.replace(/\.?0+$/, "");
  };

  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

const PLATFORM_COLORS = {
  instagram: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600",
  "instagram reels": "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600",
  youtube: "bg-red-600",
  "youtube shorts": "bg-red-600",
  tiktok: "bg-black border border-white/20",
  facebook: "bg-blue-600",
  x: "bg-black border border-white/20",
  twitter: "bg-black border border-white/20",
};

function getPlatformColor(platform) {
  const key = String(platform || "").toLowerCase().trim();
  return PLATFORM_COLORS[key] || "bg-zinc-700";
}

function PlatformIconBadge({ Icon, platform, size = "md" }) {
  const dims = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? 13 : 16;
  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center rounded-lg text-white ${getPlatformColor(
        platform
      )}`}
    >
      {Icon ? <Icon size={iconSize} /> : <FaGlobe size={iconSize} />}
    </div>
  );
}

function PageShell({ children }) {
  return (
    <div className="min-h-screen w-full bg-black text-white">
      <div className="w-full px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
        {children}
      </div>
    </div>
  );
}

function BackLink({ to = "/creator/submissions" }) {
  return (
    <Link
      to={to}
      className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
    >
      <ArrowLeft size={18} />
      Back to Submissions
    </Link>
  );
}

/* ---------------------------------- Loading skeleton ---------------------------------- */

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.06] ${className}`} />;
}

function LoadingState() {
  return (
    <PageShell>
      <BackLink />

      <div className="max-w-3xl">
        <SkeletonBlock className="h-6 w-24 rounded-full" />
        <SkeletonBlock className="mt-5 h-10 w-2/3" />
        <SkeletonBlock className="mt-3 h-4 w-40" />
        <SkeletonBlock className="mt-5 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-5/6" />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
            <SkeletonBlock className="h-8 w-8 rounded-xl" />
            <SkeletonBlock className="mt-4 h-8 w-20" />
            <SkeletonBlock className="mt-2 h-4 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <SkeletonBlock className="h-6 w-48" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr]">
          <SkeletonBlock className="mx-auto aspect-[9/16] w-full max-w-[240px] rounded-[28px] lg:mx-0" />
          <div className="grid gap-8 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="mt-3 h-5 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
        <Loader2 size={16} className="animate-spin" />
        Loading submission details…
      </div>
    </PageShell>
  );
}

/* ------------------------------------ Error state ------------------------------------- */

function ErrorState({ message, onRetry }) {
  return (
    <PageShell>
      <BackLink />
      <div className="flex flex-col items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/[0.04] px-8 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="text-red-400" size={26} />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">
          Something went wrong
        </h2>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          {message || "We couldn't load this submission. Please try again."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium transition hover:bg-violet-500"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    </PageShell>
  );
}

/* ---------------------------------- Not-found / empty ---------------------------------- */

function NotFoundState() {
  return (
    <PageShell>
      <BackLink />
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          <FileQuestion className="text-zinc-500" size={26} />
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">
          Submission not found
        </h2>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          This submission may have been removed, or the link you followed is
          no longer valid.
        </p>
        <Link
          to="/creator/submissions"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/5"
        >
          <ArrowLeft size={16} />
          Back to Submissions
        </Link>
      </div>
    </PageShell>
  );
}

/* --------------------------------- Small UI building blocks --------------------------------- */

function KpiCard({ icon: Icon, iconClass, iconBg, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11111A] px-5 py-4">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={14} className={iconClass} />
      </div>
      <p className="mt-3 text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function PerformanceCard({ icon: Icon, iconClass, label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <Icon size={18} className={iconClass} />
      <p className="mt-3 text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function CircularGauge({ percent = 0, label, value }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x="32"
          y="34"
          textAnchor="middle"
          transform="rotate(90 32 32)"
          fontSize="13"
          fontWeight="600"
          fill="white"
        >
          {safePercent}%
        </text>
      </svg>
      <div>
        <p className="text-sm text-zinc-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

function BudgetRing({ percent = 0 }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  const ringColor =
    safePercent >= 90 ? "#f87171" : safePercent >= 65 ? "#fbbf24" : "#8b5cf6";

  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <defs>
          <linearGradient id="budgetRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ringColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={ringColor} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="url(#budgetRingGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: `drop-shadow(0 0 6px ${ringColor}80)`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white">{safePercent}%</span>
        <span className="mt-1 text-xs text-zinc-500">Used Budget</span>
      </div>
    </div>
  );
}

/* ------------------------------------ Main component ------------------------------------ */

export default function SubmissionDetails() {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const platformIcons = {
    instagram: FaInstagram,
    "instagram reels": FaInstagram,
    youtube: FaYoutube,
    "youtube shorts": FaYoutube,
    tiktok: FaTiktok,
    facebook: FaFacebook,
    x: FaXTwitter,
  };

  const getPlatformIcon = (platform) => {
    const key = String(platform || "").toLowerCase().trim();
    if (platformIcons[key]) return platformIcons[key];
    if (key.includes("instagram")) return FaInstagram;
    if (key.includes("youtube")) return FaYoutube;
    if (key.includes("tiktok")) return FaTiktok;
    if (key.includes("facebook")) return FaFacebook;
    if (key === "x" || key.includes("twitter")) return FaXTwitter;
    return null;
  };

  const fetchSubmission = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api(`/api/creator/submissions/${id}/`);
      setSubmission(data);
    } catch (err) {
      setError(err?.message || "Unable to load submission details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api(`/api/creator/submissions/${id}/`);
        if (!mounted) return;
        setSubmission(data);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Unable to load submission details.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleCopyLink = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable in some browser contexts.
    }
  };

  const handleSubmitContent = async ({ platform, username, url }) => {
    const response = await api(`/api/creator/submissions/${id}/submit-content/`, {
      method: "POST",
      body: {
        platform,
        platformUsername: username,
        contentUrl: url,
      },
    });
    setSubmission(response);
    setIsModalOpen(false);
    showToast({
      type: "success",
      title: "Submission Added",
      message: "Your content was submitted successfully.",
    });
  };

  const handleDeleteSubmission = async (submissionId) => {
    setDeletingId(submissionId);
    try {
      const response = await api(`/api/creator/submissions/${id}/delete-content/`, {
        method: "DELETE",
        body: { submissionId },
      });
      setSubmission(response);
      showToast({ type: "success", message: "Submission deleted successfully." });
    } catch (err) {
      showToast({
        type: "error",
        title: "Delete failed",
        message: err?.message || "Unable to delete submission.",
      });
    } finally {
      setDeletingId(null);
      setDeleteTargetId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  /* ----- Guard states: loading / error / not found (unchanged) ----- */

  if (loading && !submission) {
    return <LoadingState />;
  }

  if (error && !submission) {
    return <ErrorState message={error} onRetry={fetchSubmission} />;
  }

  if (!submission) {
    return <NotFoundState />;
  }

  /* ----- Derived values ----- */

  const status = submission.status || "submitted";
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusStyle =
    STATUS_STYLES[String(status).toLowerCase()] || "bg-sky-500/10 text-sky-400";

  const publishedList = submission.published_submissions || [];

  const totalViews =
    submission.total_views ??
    publishedList.reduce((sum, entry) => sum + Number(entry.views || 0), 0);

  const totalActiveEarning =
    submission.total_earning ??
    publishedList.reduce(
      (sum, entry) =>
        sum +
        Number(entry.earning ?? entry.activeEarning ?? entry.active_earning ?? 0),
      0
    );

  const pendingRewardsTotal =
    submission.total_pending_earning ??
    publishedList.reduce(
      (sum, entry) =>
        sum +
        Number(
          entry.pending_earning ??
            entry.pending_reward ??
            entry.pendingReward ??
            entry.pendingEarning ??
            0
        ),
      0
    );

  const maxEarnings = Number(submission.campaign_max_earnings || 0);
  const capReached = maxEarnings > 0 && totalActiveEarning >= maxEarnings;

  const isClosedCampaign =
    String(submission.campaign_status || submission.status || "").toLowerCase() ===
    "closed";

  const firstPublished = publishedList[0] || null;
  const PlatformIcon = getPlatformIcon(firstPublished?.platform);
  void PlatformIcon; // kept for wiring parity; not used in this layout

  const submittedDate =
    submission.submitted_on ||
    submission.submittedOn ||
    submission.created_at ||
    submission.createdAt ||
    submission.campaign_start_date ||
    "";
  void submittedDate; // kept for wiring parity; not used in this layout

  // My Performance counts
  const performanceCounts = publishedList.reduce(
    (acc, entry) => {
      const key = String(entry.status || "").toLowerCase();
      if (key === "approved") acc.approved += 1;
      else if (key === "rejected") acc.rejected += 1;
      else acc.pending += 1;
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0 }
  );
  const submittedCount = publishedList.length;

  // Budget utilization
  const campaignBudget = Number(submission.campaign_budget || 0);
  const usedBudgetPercent =
    campaignBudget > 0 ? Math.min(100, Math.round((totalActiveEarning / campaignBudget) * 100)) : 0;

  // Earnings vs cap
  const earningsVsCapPercent =
    maxEarnings > 0 ? Math.min(100, Math.round((totalActiveEarning / maxEarnings) * 100)) : 0;

  const earningRate = Number(submission.campaign_reward_per_1k || 0);

  return (
    <PageShell>
      <Breadcrumbs
        overrides={{
          Gig: submission.title,
          Submission: submission.title,
        }}
      />

      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="mt-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold">{submission.title}</h1>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}
            >
              {statusLabel}
            </span>
          </div>

          <p className="mt-3 text-zinc-400">{submission.brand_name || "Brand"}</p>
        </div>

        {!isClosedCampaign && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-3 font-medium transition hover:bg-violet-500"
          >
            <Plus size={18} />
            Add Submission
          </button>
        )}
      </div>

      {/* KPI row */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          iconBg="bg-violet-500/10"
          iconClass="text-violet-400"
          label="Campaign Budget"
          value={formatINR(campaignBudget)}
        />
        <KpiCard
          icon={Wallet}
          iconBg="bg-emerald-500/10"
          iconClass="text-emerald-400"
          label="My Earnings"
          value={formatINR(totalActiveEarning)}
        />
        <KpiCard
          icon={Hourglass}
          iconBg="bg-sky-500/10"
          iconClass="text-sky-400"
          label="Pending Payout"
          value={formatINR(pendingRewardsTotal)}
        />
        <KpiCard
          icon={CalendarDays}
          iconBg="bg-amber-500/10"
          iconClass="text-amber-400"
          label="Deadline"
          value={submission.campaign_end_date ? formatDate(submission.campaign_end_date) : "No deadline"}
        />
      </div>

      {isClosedCampaign && (
        <div className="mt-8 rounded-3xl border border-zinc-500/30 bg-zinc-500/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-300">
            Campaign Closed
          </p>
          <p className="mt-3 text-lg font-semibold">
            This campaign has ended and is no longer accepting new submissions.
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            You can still view submitted content, but no additional published
            posts may be created.
          </p>
        </div>
      )}

      {capReached && !isClosedCampaign && (
        <div className="mt-8 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Campaign Cap Reached
          </p>
          <p className="mt-3 text-lg font-semibold">
            You have reached the maximum earnings for this campaign.
          </p>
          <p className="mt-2 text-sm text-emerald-200">
            No further earnings will be added beyond {formatINR(maxEarnings)}.
          </p>
        </div>
      )}

      {/* My Performance + Budget Utilization */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <h2 className="text-lg font-semibold text-white">My Performance</h2>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <PerformanceCard
              icon={Send}
              iconClass="text-violet-400"
              label="Submitted"
              value={submittedCount}
            />
            <PerformanceCard
              icon={CheckCircle}
              iconClass="text-emerald-400"
              label="Approved"
              value={performanceCounts.approved}
            />
            <PerformanceCard
              icon={Clock}
              iconClass="text-amber-400"
              label="Pending"
              value={performanceCounts.pending}
            />
            <PerformanceCard
              icon={XCircle}
              iconClass="text-red-400"
              label="Rejected"
              value={performanceCounts.rejected}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <h2 className="text-lg font-semibold text-white">Budget Utilization</h2>

          <div className="mt-6 flex flex-col items-center text-center">
            <BudgetRing percent={usedBudgetPercent} />
            <p className="mt-4 text-xs text-zinc-500">
              {formatINR(totalActiveEarning)} used of {formatINR(campaignBudget)}
            </p>
          </div>
        </section>
      </div>

      {/* Campaign Information */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-lg font-semibold text-white">Campaign Information</h2>

        <div className="mt-6">
          <p className="text-sm font-medium text-zinc-400">Description</p>
          <p className="mt-2 leading-7 text-zinc-300">
            {submission.campaign_description || "No description provided."}
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-zinc-400">Requirements</p>
          <p className="mt-2 whitespace-pre-line leading-7 text-zinc-300">
            {submission.campaign_requirements || "No requirements listed."}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-6 rounded-2xl bg-black/20 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Earning Rate</p>
            <p className="mt-2 text-lg font-semibold text-white">
              You earn ₹{earningRate.toFixed(2)} for every 1,000 valid views on your content.
            </p>
          </div>

          <CircularGauge
            percent={earningsVsCapPercent}
            label="Your Earnings vs Cap"
            value={`${formatINR(totalActiveEarning)} / ${formatINR(maxEarnings)}`}
          />
        </div>
      </section>

      {/* Resources */}
      {submission.campaign_resources?.length > 0 && (
        <section className="mt-8 rounded-3xl border border-white/10 bg-[#11111A] p-8">
          <h2 className="text-lg font-semibold text-white">Resources</h2>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full">
              <thead className="bg-black/40">
                <tr className="border-b border-white/10">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Resource
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Link
                  </th>
                </tr>
              </thead>

              <tbody>
                {submission.campaign_resources.map((resource, index) => {
                  const resourceIcon =
                    resource.url?.includes("drive.google.com") ||
                    resource.name?.toLowerCase().includes("video")
                      ? PlayCircle
                      : resource.url?.includes("notion") ||
                        resource.name?.toLowerCase().includes("guideline")
                      ? FileText
                      : ExternalLink;

                  const ResourceIcon = resourceIcon;

                  return (
                    <tr
                      key={resource.id ?? `${resource.name}-${index}`}
                      className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                            <ResourceIcon size={16} className="text-violet-400" />
                          </div>
                          <p className="font-medium">
                            {resource.name || "Campaign resource"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-5 text-right">
                        <a
                          href={resource.url || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
                        >
                          Open Link
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* My Submissions */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-lg font-semibold text-white">My Submissions</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Manage your submitted clips, monitor review status and track your earnings.
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full">
            <thead className="bg-black/40">
              <tr className="border-b border-white/10">
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  ID
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Username
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Platform
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Views
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Earned
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Pending Payout
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {publishedList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/10">
                        <Send size={22} className="text-violet-400" />
                      </div>
                      <h3 className="mt-5 text-base font-semibold text-white">
                        No submissions yet
                      </h3>
                      <p className="mt-2 max-w-sm text-sm text-zinc-500">
                        You haven't submitted any content for this campaign. Add your
                        first submission to start tracking views and earnings.
                      </p>
                      {!isClosedCampaign && (
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium transition hover:bg-violet-500"
                        >
                          <Plus size={16} />
                          Add Submission
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                publishedList.map((entry, index) => {
                  const EntryIcon = getPlatformIcon(entry.platform);
                  const entryStatusStyle =
                    STATUS_STYLES[String(entry.status || "").toLowerCase()] ||
                    "bg-white/10 text-white";
                  const earning = Number(
                    entry.earning ?? entry.activeEarning ?? entry.active_earning ?? 0
                  );
                  const pending = Number(
                    entry.pending_earning ??
                      entry.pending_reward ??
                      entry.pendingReward ??
                      entry.pendingEarning ??
                      0
                  );
                  const username =
                    entry.platformUsername || entry.username || entry.platform_username || "—";

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-5 text-sm text-zinc-400">{index + 1}</td>

                      <td className="px-5 py-5 text-sm text-white">{username}</td>

                      <td className="px-5 py-5">
                        <PlatformIconBadge Icon={EntryIcon} platform={entry.platform} size="sm" />
                      </td>

                      <td className="px-5 py-5 text-right text-sm font-semibold text-white">
                        {formatCompactNumber(entry.views)}
                      </td>

                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${entryStatusStyle}`}
                        >
                          {entry.status || "Submitted"}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-right text-sm font-semibold text-white">
                        {formatINR(earning)}
                      </td>

                      <td className="px-5 py-5 text-right text-sm font-semibold text-white">
                        {formatINR(pending)}
                      </td>

                      <td className="px-5 py-5">
                        <div className="flex justify-end gap-2">
                          {entry.contentUrl && (
                            <a
                              href={entry.contentUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10"
                            >
                              <ExternalLink size={13} />
                              View
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(entry.id)}
                            disabled={deletingId === entry.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 size={13} />
                            {deletingId === entry.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SubmitClipDialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaignId={id?.replace(/^campaign-/, "")}
        onSubmit={handleSubmitContent}
      />

      <ConfirmModal
        open={Boolean(deleteTargetId)}
        title="Delete this submission?"
        description="This will remove the submitted clip from this campaign. You can submit another clip later."
        icon={Trash2}
        color="red"
        confirmText="Delete submission"
        loading={Boolean(deletingId)}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => handleDeleteSubmission(deleteTargetId)}
      />
    </PageShell>
  );
}

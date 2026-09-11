import { useState, useEffect } from "react";
import { ArrowLeft, Download, Trash2, X, AlertCircle, Globe2 } from "lucide-react";
import { FaYoutube, FaInstagram, FaFacebook, FaTiktok, FaXTwitter } from "react-icons/fa6";
import { Link, useParams } from "react-router-dom";
import ViewsChart from "../Brand/Components/ViewsChart";
import PayoutChart from "../Brand/Components/PayoutChart";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";
import useToast from "../../hooks/useToast";

const clipper = {
  username: "@rahul_editz",
  campaign: "Podcast Clips Campaign",
};

const clipperStats = {
  totalViews: "125K",
  earnings: "₹2,500",
  approved: 6,
  pending: 2,
};

const initialSubmissions = [
  { id: 1, title: "Podcast Highlight #1", platform: "YouTube", views: "25K", payout: "₹500", status: "Approved", contentUrl: "https://youtube.com/watch?v=example1" },
  { id: 2, title: "Podcast Highlight #2", platform: "Instagram", views: "12K", payout: "₹240", status: "Pending", contentUrl: "https://instagram.com/p/example2" },
  { id: 3, title: "Podcast Highlight #3", platform: "YouTube", views: "18K", payout: "₹360", status: "Pending", contentUrl: "https://youtube.com/watch?v=example3" },
];

const topClips = [
  { id: 1, title: "Podcast Highlight #4", views: "72K", payout: "₹1,440", platform: "YouTube" },
  { id: 2, title: "Podcast Highlight #2", views: "45K", payout: "₹900", platform: "Instagram" },
  { id: 3, title: "Podcast Highlight #1", views: "30K", payout: "₹600", platform: "YouTube" },
];

const FILTERS = ["7D", "30D", "6M", "ALL"];

const clipperViewsData = {
  "7D": [
    { period: "Mon", views: 8000 },
    { period: "Tue", views: 12000 },
    { period: "Wed", views: 15000 },
    { period: "Thu", views: 18000 },
    { period: "Fri", views: 22000 },
    { period: "Sat", views: 24000 },
    { period: "Sun", views: 26000 },
  ],
  "30D": [
    { period: "Week 1", views: 22000 },
    { period: "Week 2", views: 31000 },
    { period: "Week 3", views: 34000 },
    { period: "Week 4", views: 38000 },
  ],
  "6M": [
    { period: "Jan", views: 18000 },
    { period: "Feb", views: 26000 },
    { period: "Mar", views: 42000 },
    { period: "Apr", views: 61000 },
    { period: "May", views: 82000 },
    { period: "Jun", views: 125000 },
  ],
  ALL: [
    { period: "2024", views: 45000 },
    { period: "2025", views: 92000 },
    { period: "2026", views: 125000 },
  ],
};

const clipperPayoutData = {
  "7D": [
    { period: "Mon", payout: 160 },
    { period: "Tue", payout: 240 },
    { period: "Wed", payout: 300 },
    { period: "Thu", payout: 360 },
    { period: "Fri", payout: 440 },
    { period: "Sat", payout: 480 },
    { period: "Sun", payout: 520 },
  ],
  "30D": [
    { period: "Week 1", payout: 440 },
    { period: "Week 2", payout: 620 },
    { period: "Week 3", payout: 680 },
    { period: "Week 4", payout: 760 },
  ],
  "6M": [
    { period: "Jan", payout: 360 },
    { period: "Feb", payout: 520 },
    { period: "Mar", payout: 840 },
    { period: "Apr", payout: 1220 },
    { period: "May", payout: 1640 },
    { period: "Jun", payout: 2500 },
  ],
  ALL: [
    { period: "2024", payout: 900 },
    { period: "2025", payout: 1840 },
    { period: "2026", payout: 2500 },
  ],
};

const STATUS_STYLES = {
  Approved: "bg-green-500/10 text-green-400",
  Pending: "bg-yellow-500/10 text-yellow-400",
};

const PLATFORM_STYLES = {
  youtube: { name: "YouTube", icon: FaYoutube, textColor: "text-red-500" },
  instagram: { name: "Instagram", icon: FaInstagram, textColor: "text-pink-500" },
  facebook: { name: "Facebook", icon: FaFacebook, textColor: "text-blue-500" },
  x: { name: "X", icon: FaXTwitter, textColor: "text-white" },
  "x (twitter)": { name: "X", icon: FaXTwitter, textColor: "text-white" },
  "twitter/x": { name: "X", icon: FaXTwitter, textColor: "text-white" },
  twitter: { name: "X", icon: FaXTwitter, textColor: "text-white" },
  tiktok: { name: "TikTok", icon: FaTiktok, textColor: "text-slate-200" },
};

const PlatformBadge = ({ platform }) => {
  const platformName = String(platform || "Platform").trim();
  const style = PLATFORM_STYLES[platformName.toLowerCase()] || {
    name: platformName,
    icon: Globe2,
    textColor: "text-zinc-400",
  };
  const Icon = style.icon;

  return (
    <span
      title={style.name}
      aria-label={style.name}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]"
    >
      <Icon size={17} className={style.textColor} aria-hidden="true" />
      <span className="sr-only">{style.name}</span>
    </span>
  );
};

function DeleteConfirmModal({ count, onCancel, onConfirm, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11111A] p-6">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <h3 className="mt-4 text-lg font-bold text-white">
          Delete {count > 1 ? `${count} submissions` : "this submission"}?
        </h3>
        <p className="mt-1.5 text-sm text-zinc-400">
          This can't be undone, and the clipper won't be notified automatically.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Skeleton shown while the participant/submissions data is loading.
// Mirrors the real layout below (header, KPI row, table) using pulsing
// placeholder blocks — same pattern as CreatorGigs.jsx's card skeletons —
// instead of a plain spinner + text that blanks out the whole page.
function SubmissionDetailsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
        <div className="mt-6 h-4 w-40 animate-pulse rounded bg-white/10" />
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="h-3 w-36 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-9 w-56 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-40 animate-pulse rounded bg-white/10" />
          </div>
          <div className="h-10 w-44 animate-pulse rounded-xl bg-white/10" />
        </div>
      </div>

      {/* KPI skeletons */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-[#11111A] p-6">
            <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-8 w-16 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-3 w-24 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="h-6 w-52 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-white/10" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CreatorSubmissionDetails() {
  const { gigId, participantId } = useParams();
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [campaignInfo, setCampaignInfo] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // null | { ids: number[] }
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState("7D");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/content/campaigns/${gigId}/clippers/${participantId}/submissions/`;
      console.log('📥 Loading submissions from:', url);
      const data = await api(url);
      console.log('📦 Loaded data:', data);

      setCampaignInfo(data.participant?.campaignInfo || null);
      setSubmissions(
        Array.isArray(data.submissions)
          ? data.submissions.map((submission) => ({
              ...submission,
              title: submission.platformUsername || submission.contentUrl || `Submission #${submission.id}`,
              payout: submission.earning || submission.pendingEarning || 0,
              views: Number(submission.views || 0),
              earning: Number(submission.earning || 0),
              pendingEarning: Number(submission.pendingEarning || 0),
            }))
          : []
      );
    } catch (err) {
      setError(err?.message || 'Unable to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  // Load submissions from API
  useEffect(() => {
    let isMounted = true;

    const fetchSubmissions = async () => {
      if (!gigId || !participantId) {
        setError('Missing campaign or participant ID.');
        setLoading(false);
        return;
      }

      if (!isMounted) return;
      await loadSubmissions();
    };

    fetchSubmissions();

    return () => {
      isMounted = false;
    };
  }, [gigId, participantId]);

  // Skeleton while loading, instead of an early-return spinner that
  // blanks out the whole page.
  if (loading) {
    return <SubmissionDetailsSkeleton />;
  }

  const allSelected = selectedIds.length > 0 && selectedIds.length === submissions.length;
  const activeViewsData = clipperViewsData[filter];
  const activePayoutData = clipperPayoutData[filter];


  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : submissions.map((s) => s.id));
  };

  const toggleSelect = (id) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const payload = deleteReason.trim() ? { reason: deleteReason.trim() } : {};

      console.log('🔴 DELETE DEBUG INFO:');
      console.log('  gigId:', gigId);
      console.log('  participantId:', participantId);
      console.log('  deleteTarget.ids:', deleteTarget.ids);
      console.log('  deleteReason:', deleteReason.trim());

      // Delete each submission individually using the correct endpoint
      const deletePromises = deleteTarget.ids.map((submissionId) => {
        const url = `/api/content/campaigns/${gigId}/clippers/${participantId}/submissions/${submissionId}/`;
        console.log('  calling URL:', url);
        return api(url, {
          method: "DELETE",
          body: payload,
        });
      });

      const results = await Promise.all(deletePromises);
      console.log('✅ Delete API response:', results);

      await loadSubmissions();
      setSelectedIds((sel) => sel.filter((id) => !deleteTarget.ids.includes(id)));

      // Show success message
      showToast({
        type: "success",
        title: "Submissions Deleted",
        message: `${deleteTarget.ids.length} submission${deleteTarget.ids.length > 1 ? "s" : ""} deleted successfully.`,
      });

      // Reset modal state
      setDeleteTarget(null);
      setDeleteReason("");
    } catch (error) {
      console.error('❌ Delete submission error:', error);
      console.error('  Error message:', error?.message);
      showToast({
        type: "error",
        title: "Delete Failed",
        message: error?.message || "Unable to delete submission(s). Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const header = ["Title", "Platform", "Views", "Payout", "Status"];
    const rows = submissions.map((s) => [s.title, s.platform, s.views, s.payout, s.status]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${clipper.username.replace("@", "")}-submissions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {deleteTarget && (
        <DeleteConfirmModal
          count={deleteTarget.ids.length}
          isDeleting={isDeleting}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteReason("");
          }}
          onConfirm={confirmDelete}
        />
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!error && submissions.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-[#11111A] p-8 text-center">
          <p className="text-zinc-400">No submissions yet.</p>
        </div>
      )}

      {!error && submissions.length > 0 && (
        <>
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

        <div className="relative z-10">
          <Breadcrumbs
            overrides={{
              Gig: clipper.campaign,
              Submission: `${clipper.username}`,
            }}
          />
          <Link
            to={`/creator/gigs/${gigId}`}
            className="inline-flex items-center gap-2 text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Gig
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-violet-400">
                Clipper Performance
              </p>
              <h1 className="mt-3 text-4xl font-bold text-white">{clipper.username}</h1>
              <p className="mt-3 text-zinc-400">{clipper.campaign}</p>
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 self-start rounded-xl bg-violet-600 px-4 py-2 text-white transition hover:bg-violet-500"
            >
              <Download size={16} />
              Export Submissions
            </button>
          </div>
        </div>
      </section>

      {/* Campaign Status Alert */}
      {campaignInfo?.isClosed && (
        <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-400">Campaign Closed</h3>
              <p className="mt-1 text-sm text-red-300/80">
                This campaign has ended and is no longer accepting new submissions.
                {campaignInfo?.endDate && ` It ended on ${new Date(campaignInfo.endDate).toLocaleDateString()}.`}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Campaign Earnings Cap Info */}
      {campaignInfo?.maxEarnings > 0 && (
        <section className="rounded-3xl border border-violet-500/20 bg-violet-500/5 p-6">
          <h3 className="text-lg font-semibold text-white">Campaign Earnings Cap</h3>
          <p className="mt-2 text-sm text-zinc-400">
            This campaign has a maximum earnings limit. Below is the current status.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Max Earnings</p>
              <p className="mt-2 text-2xl font-bold text-white">₹{campaignInfo.maxEarnings?.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Your Earnings</p>
              <p className="mt-2 text-2xl font-bold text-violet-400">₹{campaignInfo.currentEarnings?.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Remaining Capacity</p>
              <p className={`mt-2 text-2xl font-bold ${campaignInfo.remainingCapacity <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                ₹{campaignInfo.remainingCapacity?.toLocaleString()}
              </p>
            </div>
          </div>
          {campaignInfo.remainingCapacity <= 0 && (
            <p className="mt-4 text-sm text-orange-400">
              ⚠️ Maximum earnings capacity has been reached. No new submissions can be added to this campaign.
            </p>
          )}
        </section>
      )}

      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Total Views</p>
          <h2 className="mt-3 text-4xl font-bold text-white">{clipperStats.totalViews}</h2>
          <p className="mt-2 text-sm text-green-400">+18% this month</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Total Earnings</p>
          <h2 className="mt-3 text-4xl font-bold text-white">{clipperStats.earnings}</h2>
          <p className="mt-2 text-sm text-violet-400">Lifetime earnings</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Approved Clips</p>
          <h2 className="mt-3 text-4xl font-bold text-white">{clipperStats.approved}</h2>
          <p className="mt-2 text-sm text-green-400">Successfully approved</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Pending Review</p>
          <h2 className="mt-3 text-4xl font-bold text-white">{clipperStats.pending}</h2>
          <p className="mt-2 text-sm text-yellow-400">Awaiting approval</p>
        </div>
      </div>

      {/* Submission Management */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Submission Management</h2>
            <p className="mt-1 text-zinc-500">
              Approval happens automatically on the platform — remove a submission here if it
              shouldn't be part of this campaign.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <span className="text-sm text-zinc-500">{selectedIds.length} selected</span>
            )}
            <button
              onClick={() => setDeleteTarget({ ids: selectedIds })}
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 px-4 py-2 text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="w-10 pb-4">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-white/20 accent-violet-500"
                  />
                </th>
                <th className="pb-4 text-left text-zinc-500">Clip</th>
                <th className="pb-4 text-left text-zinc-500">Platform</th>
                <th className="pb-4 text-left text-zinc-500">Views</th>
                <th className="pb-4 text-left text-zinc-500">Payout</th>
                <th className="pb-4 text-left text-zinc-500">Status</th>
                <th className="pb-4 text-left text-zinc-500">Actions</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                  <td className="py-5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(submission.id)}
                      onChange={() => toggleSelect(submission.id)}
                      className="h-4 w-4 rounded border-white/20 accent-violet-500"
                    />
                  </td>

                  <td className="py-5">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{submission.title}</p>
                      <p className="text-sm text-zinc-500">Submission #{submission.id}</p>
                    </div>
                  </td>

                  <td className="py-5">
                    <PlatformBadge platform={submission.platform} />
                  </td>
                  <td className="py-5 text-white">{submission.views}</td>
                  <td className="py-5 text-white">₹{submission.payout}</td>

                  <td className="py-5">
                    <span className={`rounded-full px-3 py-1 text-sm ${STATUS_STYLES[submission.status]}`}>
                      {submission.status}
                    </span>
                  </td>

                  <td className="py-5">
                    <div className="flex flex-wrap gap-2">
                      {submission.contentUrl ? (
                        <a
                          href={submission.contentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white transition hover:border-violet-500/30 hover:bg-violet-500/10"
                        >
                          View Clip
                        </a>
                      ) : (
                        <button
                          disabled
                          className="cursor-not-allowed rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-600 opacity-50"
                        >
                          View Clip
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteTarget({ ids: [submission.id] })}
                        className="flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Performing Clips */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Top Performing Clips</h2>
          <p className="mt-1 text-zinc-500">Highest performing content from this clipper.</p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {topClips.map((clip) => (
            <div
              key={clip.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 transition hover:border-violet-500/30"
            >
              <div className="h-40 bg-gradient-to-br from-violet-600/20 to-transparent" />
              <div className="p-5">
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-400">
                  {clip.platform}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{clip.title}</h3>
                <div className="mt-5 flex justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">Views</p>
                    <p className="text-xl font-bold text-white">{clip.views}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Earned</p>
                    <p className="text-xl font-bold text-green-400">{clip.payout}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Performance Analytics */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
            <p className="mt-1 text-zinc-500">Track views and earnings generated by this clipper.</p>
          </div>

          <div className="flex gap-2">
            {FILTERS.map((period) => (
              <button
                key={period}
                onClick={() => setFilter(period)}
                className={`rounded-xl px-4 py-2 text-sm transition ${filter === period
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
                  }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-violet-500/10 bg-gradient-to-br from-violet-600/10 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Views Generated</p>
                <h3 className="mt-3 text-5xl font-bold text-white">125K</h3>
                <p className="mt-2 text-green-400">+18% vs previous period</p>
              </div>
            </div>
            <div className="mt-8 h-[250px] rounded-2xl border border-violet-500/20 p-2">
              <ViewsChart data={activeViewsData} xKey="period" dataKey="views" />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-emerald-500/10 bg-gradient-to-br from-emerald-600/10 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">Earnings Generated</p>
                <h3 className="mt-3 text-5xl font-bold text-white">₹2,500</h3>
                <p className="mt-2 text-green-400">+12% vs previous period</p>
              </div>
            </div>
            <div className="mt-8 h-[250px] rounded-2xl border border-emerald-500/20 p-2">
              <PayoutChart data={activePayoutData} xKey="period" dataKey="payout" />
            </div>
          </div>
        </div>
      </section>

      {/* Clipper Insights */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Clipper Insights</h2>
          <p className="mt-1 text-zinc-500">Performance indicators and engagement quality.</p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Approval Rate</p>
            <h3 className="mt-3 text-5xl font-bold text-green-400">75%</h3>
            <p className="mt-2 text-sm text-zinc-500">6 of 8 clips approved</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Best Platform</p>
            <h3 className="mt-3 text-3xl font-bold text-white">YouTube</h3>
            <p className="mt-2 text-sm text-zinc-500">95K views generated</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Avg Views / Clip</p>
            <h3 className="mt-3 text-4xl font-bold text-white">15.6K</h3>
            <p className="mt-2 text-sm text-zinc-500">Across all submissions</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Clinq Score</p>
            <h3 className="mt-3 text-5xl font-bold text-violet-400">A+</h3>
            <p className="mt-2 text-sm text-zinc-500">Top performing clipper</p>
          </div>
        </div>
      </section>
        </>
      )}
    </div>
  );
}

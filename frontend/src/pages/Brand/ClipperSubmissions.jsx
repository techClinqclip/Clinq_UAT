import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Trash2,
  X,
  Inbox,
  Trophy,
  Sparkles,
} from "lucide-react";
import {
  FaYoutube,
  FaInstagram,
  FaFacebook,
  FaXTwitter,
  FaTiktok,
} from "react-icons/fa6";
import { Link, useParams } from "react-router-dom";
import ViewsChart from "./Components/ViewsChart";
import PayoutChart from "./Components/PayoutChart";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";
import SubmissionsLoadingSkeleton from "../../shared/ui/SubmissionsLoadingSkeleton";
 
/*
  Approve/Reject removed from this page on purpose: approval is a
  platform-side decision, not something the brand does here. The brand's
  only moderation power on this page is deleting a bad submission
  outright — which is why "Reject" became "Delete" (removes the row)
  instead of just flipping a status field.
*/
 
const initialSubmissions = [];
 
const topClips = [];
 
const FILTERS = ["7D", "30D", "6M", "ALL"];
 
const buildPeriodBuckets = (filter, submissionList) => {
  const today = new Date();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
 
  const labelDefinitions = [];
 
  if (filter === "7D") {
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      labelDefinitions.push({
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }
  } else if (filter === "30D") {
    for (let i = 3; i >= 0; i -= 1) {
      const end = new Date(today);
      end.setDate(today.getDate() - (i * 7));
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      labelDefinitions.push({
        key: `${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}`,
        label: `W${4 - i}`,
      });
    }
  } else if (filter === "6M") {
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labelDefinitions.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: months[date.getMonth()],
      });
    }
  } else {
    const years = [...new Set(submissionList
      .map((item) => new Date(item.createdAt).getFullYear())
      .filter((year) => Number.isFinite(year)))].sort((a, b) => a - b);
 
    if (years.length === 0) {
      years.push(new Date().getFullYear());
    }
 
    years.forEach((year) => {
      labelDefinitions.push({ key: String(year), label: String(year) });
    });
  }
 
  const bucketMap = new Map(labelDefinitions.map((entry) => [entry.key, { views: 0, payout: 0 }]));
 
  submissionList.forEach((submission) => {
    const createdAt = submission.createdAt || submission.submittedAt;
    if (!createdAt) return;
 
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return;
 
    let bucketKey = "";
    if (filter === "7D") {
      bucketKey = date.toISOString().slice(0, 10);
    } else if (filter === "30D") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 6);
      bucketKey = `${weekStart.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}`;
    } else if (filter === "6M") {
      bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    } else {
      bucketKey = String(date.getFullYear());
    }
 
    if (!bucketMap.has(bucketKey)) return;
 
    const views = Number(submission.views || 0);
    const payout = Number(submission.earning || submission.pendingEarning || 0);
    const current = bucketMap.get(bucketKey);
    current.views += views;
    current.payout += payout;
  });
 
  return labelDefinitions.map((entry) => ({
    period: entry.label,
    views: bucketMap.get(entry.key)?.views || 0,
    payout: bucketMap.get(entry.key)?.payout || 0,
  }));
};
 
const STATUS_STYLES = {
  Approved: "bg-green-500/10 text-green-400",
  Pending: "bg-yellow-500/10 text-yellow-400",
};
 
const PLATFORM_STYLES = {
  YouTube: { color: "bg-red-500", name: "YouTube", icon: FaYoutube },
  Instagram: { color: "bg-pink-500", name: "Instagram", icon: FaInstagram },
  Facebook: { color: "bg-blue-500", name: "Facebook", icon: FaFacebook },
  "X": { color: "bg-gray-500", name: "X", icon: FaXTwitter },
  "X (Twitter)": { color: "bg-gray-500", name: "X", icon: FaXTwitter },
  TikTok: { color: "bg-purple-500", name: "TikTok", icon: FaTiktok },
};
 
const PlatformBadge = ({ platform }) => {
  const style = PLATFORM_STYLES[platform] || { color: "bg-gray-500", name: platform };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${style.color}`} />
      <span className="text-xs font-medium text-white">{style.name}</span>
    </div>
  );
};
 
// Small "nothing here yet" state used inside cards/tables/grids so empty
// data reads as an expected, calm state rather than a broken one.
const EmptyState = ({ icon: Icon = Inbox, title, description }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-black/20 py-14 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
      <Icon size={20} className="text-violet-400" />
    </div>
    <p className="font-medium text-white">{title}</p>
    {description && <p className="max-w-xs text-sm text-zinc-500">{description}</p>}
  </div>
);
 
function DeleteConfirmModal({ count, onCancel, onConfirm, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11111A] p-6">
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
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-white transition hover:border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-medium text-white transition hover:bg-red-400 disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
export default function ClipperSubmissions() {
  const { campaignId, clipperId, gigId, participantId } = useParams();
  // Support both Brand (/brand/campaigns/:campaignId/clippers/:clipperId/submissions)
  // and Creator (/creator/gigs/:gigId/participants/:participantId) routes
  const actualCampaignId = campaignId || gigId;
  const actualClipperId = clipperId || participantId;
  const isCreatorRoute = !!gigId;
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [participantInfo, setParticipantInfo] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // null | { ids: number[] }
  const [isDeleting, setIsDeleting] = useState(false);
  const [filter, setFilter] = useState("7D");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  const allSelected = selectedIds.length > 0 && selectedIds.length === submissions.length;
 
  const totalViews = Number(participantInfo?.totalViews ?? submissions.reduce((sum, submission) => sum + Number(submission.views || 0), 0));
  const totalEarnings = Number(participantInfo?.totalEarnings ?? submissions.reduce((sum, submission) => sum + Number(submission.earning || submission.pendingEarning || 0), 0));
  const approvedCount = Number(participantInfo?.approvedSubmissions ?? submissions.filter((submission) => String(submission.status).toLowerCase() === "approved").length);
  const pendingCount = Number(participantInfo?.pendingSubmissions ?? submissions.filter((submission) => String(submission.status).toLowerCase() === "pending").length);
  const totalSubmissionCount = Number(participantInfo?.totalSubmissions ?? (submissions.length || 1));
  const approvalRate = Number(participantInfo?.approvalRate ?? (totalSubmissionCount ? Math.round((approvedCount / totalSubmissionCount) * 100) : 0));
 
  const platformStats = participantInfo?.platformBreakdown
    ? Object.fromEntries(
        participantInfo.platformBreakdown.map((item) => [item.platform, Number(item.views || 0)])
      )
    : Object.fromEntries(
        Object.entries(
          submissions.reduce((acc, submission) => {
            const key = submission.platform || "Other";
            acc[key] = (acc[key] || 0) + Number(submission.views || 0);
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])
      );
 
  // Treat any "empty" value the backend might send (null, "", "N/A", "n/a",
  // etc.) as no data — otherwise a literal "N/A" string from the API would
  // slip past a plain `|| null` check and render as-is.
  const rawBestPlatform = participantInfo?.bestPlatform || Object.entries(platformStats)[0]?.[0] || null;
  const bestPlatform = rawBestPlatform && !/^(n\/?a|null|undefined|unknown)$/i.test(rawBestPlatform.trim())
    ? rawBestPlatform
    : null;
  const avgViewsPerClip = Number(participantInfo?.avgViewsPerClip ?? (totalSubmissionCount ? Math.round(totalViews / totalSubmissionCount) : 0));
  // Clip Score is temporarily hidden (see "Clipper Insights" below) but the
  // calculation stays in case we bring it back.
  const clipScore = Number(participantInfo?.clipScore ?? Math.min(100, Math.max(0, Math.round((approvalRate * 0.7) + (Math.min(totalViews / 10000, 100) * 0.3)))));
 
  const chartSource = participantInfo?.analyticsSubmissions && participantInfo.analyticsSubmissions.length > 0
    ? participantInfo.analyticsSubmissions
    : submissions;
 
  const activeViewsData = buildPeriodBuckets(filter, chartSource);
  const activePayoutData = buildPeriodBuckets(filter, chartSource).map(({ period, views, payout }) => ({
    period,
    payout,
    views,
  }));
 
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : submissions.map((s) => s.id));
  };
 
  const toggleSelect = (id) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  };
 
  useEffect(() => {
    let isMounted = true;
 
    const loadSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api(`/api/content/campaigns/${actualCampaignId}/clippers/${actualClipperId}/submissions/`);
        if (!isMounted) return;
 
        setParticipantInfo(data.participant || null);
 
        setSubmissions(
          Array.isArray(data.submissions)
            ? data.submissions.map((submission) => ({
                ...submission,
                views: Number(submission.views || 0),
                earning: Number(submission.earning || 0),
                pendingEarning: Number(submission.pendingEarning || 0),
              }))
            : []
        );
      } catch (err) {
        setError(err?.message || 'Unable to load submissions.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
 
    if (actualCampaignId && actualClipperId) {
      loadSubmissions();
    } else {
      setError('Missing campaign or clipper ID.');
      setLoading(false);
    }
 
    return () => {
      isMounted = false;
    };
  }, [actualCampaignId, actualClipperId]);
 
  const confirmDelete = async () => {
    if (!deleteTarget) return;
 
    setIsDeleting(true);
    try {
      console.log('🔴 DELETE: called with ids:', deleteTarget.ids);
      console.log('🔴 DELETE: Campaign ID:', actualCampaignId);
      console.log('🔴 DELETE: Clipper ID:', actualClipperId);
 
      const deletePromises = deleteTarget.ids.map((submissionId) => {
        const url = `/api/content/campaigns/${actualCampaignId}/clippers/${actualClipperId}/submissions/${submissionId}/`;
        console.log('🔴 DELETE: calling URL:', url);
        return api(url, {
          method: "DELETE",
        });
      });
 
      const results = await Promise.all(deletePromises);
      console.log('✅ DELETE: Success, responses:', results);
      
      // Remove deleted submissions from state
      setSubmissions((subs) => subs.filter((s) => !deleteTarget.ids.includes(s.id)));
      setSelectedIds((sel) => sel.filter((id) => !deleteTarget.ids.includes(id)));
      
      // Reset state
      setIsDeleting(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('❌ DELETE: Error:', error?.message || error);
      setIsDeleting(false);
    }
  };
 
  const handleExport = () => {
    const header = ["Title", "Platform", "Views", "Payout", "Status"];
    const rows = submissions.map((s) => [s.platformUsername || s.contentUrl || "Clip", s.platform, s.views, s.earning || s.pendingEarning || 0, s.status]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${participantInfo?.username?.replace("@", "") || "submissions"}-submissions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
 
 
 
  if (error) {
    return (
      <div className="p-8 text-center text-red-400">
        <p>{error}</p>
      </div>
    );
  }
  if (loading) {
    return <SubmissionsLoadingSkeleton />;
  }
 
  return (
    <div className="space-y-8">
      {deleteTarget && (
        <DeleteConfirmModal
          count={deleteTarget.ids.length}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
 
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />
 
        <div className="relative z-10">
        <Breadcrumbs overrides={{ Campaign: participantInfo?.campaign || "Campaign", Submissions: participantInfo?.username || "@clipper" }} />
          <Link
            to={isCreatorRoute ? `/creator/gigs/${actualCampaignId}` : `/brand/campaigns/${actualCampaignId}`}
            className="inline-flex items-center gap-2 text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to {isCreatorRoute ? "Gig" : "Campaign"}
          </Link>
 
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-violet-400">
                Clipper Performance
              </p>
              <h1 className="mt-3 text-4xl font-bold text-white">
                {participantInfo?.username || "@clipper"}
              </h1>
            </div>
 
            <button
              onClick={handleExport}
              disabled={submissions.length === 0}
              className="flex items-center gap-2 self-start rounded-xl bg-violet-600 px-4 py-2 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download size={16} />
              Export Submissions
            </button>
          </div>
        </div>
      </section>
 
      {/* KPI Cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Total Views</p>
          <h2 className="mt-3 text-4xl font-bold text-white">{totalViews.toLocaleString()}</h2>
          <p className="mt-2 text-sm text-green-400">{approvalRate}% approval rate</p>
        </div>
 
        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Total Earnings</p>
          <h2 className="mt-3 text-4xl font-bold text-white">₹{totalEarnings.toLocaleString()}</h2>
          <p className="mt-2 text-sm text-violet-400">Lifetime earnings</p>
        </div>
 
        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Approved Clips</p>
          <h2 className="mt-3 text-4xl font-bold text-white">{approvedCount}</h2>
          <p className="mt-2 text-sm text-green-400">Successfully approved</p>
        </div>
 
        <div className="rounded-2xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
          <p className="text-zinc-500">Pending Review</p>
          <h2 className="mt-3 text-4xl font-bold text-white">{pendingCount}</h2>
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
 
        {submissions.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Inbox}
              title="No submissions yet"
              description="Clips this clipper submits to the campaign will show up here."
            />
          </div>
        ) : (
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
                    <div className="flex items-center gap-4">
                      <Link to={isCreatorRoute ? `/creator/gigs/${actualCampaignId}/participants/${actualClipperId}/clips/${submission.id}` : `/brand/clips/${submission.id}`}>
                        <div className="h-14 w-24 rounded-xl bg-violet-500/10 transition hover:border hover:border-violet-500/30" />
                      </Link>
                      <div>
                        <p className="font-medium text-white">{submission.platformUsername || submission.contentUrl || `Submission #${submission.id}`}</p>
                        <p className="text-sm text-zinc-500">Submission #{submission.id}</p>
                      </div>
                    </div>
                  </td>
 
                  <td className="py-5">
                    <PlatformBadge platform={submission.platform} />
                  </td>
                  <td className="py-5 text-white">{submission.views}</td>
                  <td className="py-5 text-white">₹{(submission.earning || submission.pendingEarning || 0).toLocaleString()}</td>
 
                  <td className="py-5">
                    <span className={`rounded-full px-3 py-1 text-sm ${STATUS_STYLES[submission.status]}`}>
                      {submission.status}
                    </span>
                  </td>
 
                  <td className="py-5">
                    <div className="flex flex-wrap gap-2">
                      {submission.contentUrl || submission.postUrl ? (
                        <a
                          href={submission.contentUrl || submission.postUrl}
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
        )}
      </section>
 
      {/* Top Performing Clips */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Top Performing Clips</h2>
          <p className="mt-1 text-zinc-500">Highest performing content from this clipper.</p>
        </div>
 
        <div className="mt-8">
          {topClips.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No top clips yet"
              description="Once submissions start earning views, the best performers will show up here."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
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
          )}
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
 
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-violet-500/10 bg-gradient-to-br from-violet-600/10 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Views Generated</p>
                <h3 className="mt-3 text-5xl font-bold text-white">{totalViews.toLocaleString()}</h3>
                <p className="mt-2 text-green-400">{approvalRate}% approval rate</p>
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
                <h3 className="mt-3 text-5xl font-bold text-white">₹{totalEarnings.toLocaleString()}</h3>
                <p className="mt-2 text-green-400">{pendingCount} pending review</p>
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
 
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Approval Rate</p>
            <h3 className="mt-3 text-5xl font-bold text-green-400">{approvalRate}%</h3>
            <p className="mt-2 text-sm text-zinc-500">{approvedCount} of {totalSubmissionCount} clips approved</p>
          </div>
 
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Best Platform</p>
            {bestPlatform ? (
              <div className="mt-3 flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    PLATFORM_STYLES[bestPlatform]?.color || "bg-zinc-600"
                  }`}
                >
                  {(() => {
                    const PlatformIcon = PLATFORM_STYLES[bestPlatform]?.icon || Sparkles;
                    return <PlatformIcon size={18} className="text-white" />;
                  })()}
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {PLATFORM_STYLES[bestPlatform]?.name || bestPlatform}
                </h3>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
                  <Sparkles size={18} className="text-zinc-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-500">No data yet</h3>
              </div>
            )}
            <p className="mt-2 text-sm text-zinc-500">
              {bestPlatform ? `${(platformStats[bestPlatform] || 0).toLocaleString()} views generated` : "The best platform by views will be shown here"}
            </p>
          </div>
 
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Avg Views / Clip</p>
            <h3 className="mt-3 text-4xl font-bold text-white">{avgViewsPerClip.toLocaleString()}</h3>
            <p className="mt-2 text-sm text-zinc-500">Across all submissions</p>
          </div>
 
          {/* Clinq Score — hidden for now, revisit once the scoring model is finalized.
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <p className="text-zinc-500">Clinq Score</p>
            <h3 className="mt-3 text-5xl font-bold text-violet-400">{clipScore >= 90 ? "A+" : clipScore >= 80 ? "A" : clipScore >= 70 ? "B+" : clipScore >= 60 ? "B" : "C"}</h3>
            <p className="mt-2 text-sm text-zinc-500">Performance consistency</p>
          </div>
          */}
        </div>
      </section>
    </div>
  );
}
 
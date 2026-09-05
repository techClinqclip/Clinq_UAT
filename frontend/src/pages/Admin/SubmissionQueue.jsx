import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  Search,
  Clock3,
  UserPlus,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  ChevronLeft,
  Layers,
} from "lucide-react";
import { FaYoutube, FaInstagram, FaTiktok, FaXTwitter } from "react-icons/fa6";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import SubmissionReviewModal from "./components/SubmissionReviewModal";
import { api } from "../../lib/api";

const PLATFORM_ICONS = {
  YouTube: { icon: FaYoutube, color: "text-red-400" },
  Instagram: { icon: FaInstagram, color: "text-pink-400" },
  TikTok: { icon: FaTiktok, color: "text-zinc-200" },
  X: { icon: FaXTwitter, color: "text-zinc-300" },
};

const STATUS_STYLES = {
  Pending: "bg-amber-500/10 text-amber-400",
  Approved: "bg-emerald-500/10 text-emerald-400",
  Rejected: "bg-red-500/10 text-red-400",
};

const PAGE_SIZE = 10;

const initialSubmissions = [
  { id: 1, clipperName: "Rohan Verma", clipperUsername: "rohanclips", campaignId: "c1", campaignTitle: "Podcast Shorts Challenge", brandName: "Ali Abdaal", platform: "YouTube", clipUrl: "https://youtube.com/shorts/example1", submittedAt: "2 hours ago", isFirstSubmission: true, reportedViews: 12400, status: "Pending" },
  { id: 2, clipperName: "Priya Nair", clipperUsername: "priyaedits", campaignId: "c2", campaignTitle: "AI Productivity Sprint", brandName: "Thomas Frank", platform: "Instagram", clipUrl: "https://instagram.com/reel/example2", submittedAt: "4 hours ago", isFirstSubmission: false, reportedViews: 5800, status: "Pending" },
  { id: 3, clipperName: "Arjun Mehta", clipperUsername: "arjun.cuts", campaignId: "c3", campaignTitle: "Finance Creator Challenge", brandName: "Mark Tilbury", platform: "YouTube", clipUrl: "https://youtube.com/shorts/example3", submittedAt: "6 hours ago", isFirstSubmission: true, reportedViews: 31200, status: "Pending" },
  { id: 4, clipperName: "Sana Khan", clipperUsername: "sana.clips", campaignId: "c4", campaignTitle: "Morning Routine Challenge", brandName: "Matt D'Avella", platform: "TikTok", clipUrl: "https://tiktok.com/@sana.clips/video/example4", submittedAt: "Yesterday", isFirstSubmission: false, reportedViews: 8900, status: "Pending" },
  { id: 5, clipperName: "Devika Rao", clipperUsername: "devika.edits", campaignId: "c3", campaignTitle: "Study With Me Clips", brandName: "Mariana's Study Corner", platform: "Instagram", clipUrl: "https://instagram.com/reel/example5", submittedAt: "Yesterday", isFirstSubmission: false, reportedViews: 3100, status: "Approved" },
  { id: 6, clipperName: "Yash Kapoor", clipperUsername: "yash.k", campaignId: "c4", campaignTitle: "Fitness Motivation", brandName: "Chris Heria", platform: "X", clipUrl: "https://x.com/yash_k/status/example6", submittedAt: "2 days ago", isFirstSubmission: true, reportedViews: 1200, status: "Rejected" },
];

const TYPE_OPTIONS = ["All", "First submission", "Repeat submission"];
const PLATFORM_OPTIONS = ["All", "YouTube", "Instagram", "TikTok", "X"];
const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "All"];

export default function SubmissionQueue() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [campaignPage, setCampaignPage] = useState(1);
  // Per-campaign pagination for the submissions list inside each campaign section.
  const [submissionPageByCampaign, setSubmissionPageByCampaign] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    api("/api/content/campaign-submissions/?page_size=100")
      .then((response) => {
        const items = response.results || response || [];
        setSubmissions(items.map((item) => ({
          ...item,
          campaignId: item.campaignId,
          campaignTitle: item.campaignTitle || "Campaign",
          brandName: item.brandName || "Brand",
          clipperName: item.clipperEmail || "Clipper",
          clipperUsername: item.clipperUsername || item.clipperEmail || "clipper",
          platform: item.platform === "Twitter/X" ? "X" : item.platform,
          clipUrl: item.contentUrl,
          submittedAt: new Date(item.createdAt).toLocaleString(),
          isFirstSubmission: Boolean(item.isFirstSubmission),
          reportedViews: Number(item.views || 0),
          status: String(item.status || "pending").replace(/^./, (value) => value.toUpperCase()),
        })));
      })
      .catch((error) => showToast({ type: "error", message: error.message }));
  }, [showToast]);

  const selected = submissions.find((s) => s.id === selectedId) || null;

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      if (typeFilter === "First submission" && !s.isFirstSubmission) return false;
      if (typeFilter === "Repeat submission" && s.isFirstSubmission) return false;
      if (platformFilter !== "All" && s.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${s.clipperName} ${s.clipperUsername} ${s.campaignTitle} ${s.brandName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [submissions, search, typeFilter, platformFilter, statusFilter]);

  // Group the filtered results by campaign so the queue reads as
  // per-campaign sections instead of one flat list.
  const groupedByCampaign = useMemo(() => {
    const map = new Map();
    for (const s of filtered) {
      if (!map.has(s.campaignId)) {
        map.set(s.campaignId, {
          campaignId: s.campaignId,
          campaignTitle: s.campaignTitle,
          brandName: s.brandName,
          items: [],
        });
      }
      map.get(s.campaignId).items.push(s);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Reset campaign pagination and per-campaign submission pagination
  // whenever the filters/search change the underlying result set.
  useEffect(() => {
    setCampaignPage(1);
    setSubmissionPageByCampaign({});
  }, [search, typeFilter, platformFilter, statusFilter]);

  const totalCampaignPages = Math.max(1, Math.ceil(groupedByCampaign.length / PAGE_SIZE));
  const currentCampaignPage = Math.min(campaignPage, totalCampaignPages);
  const paginatedCampaigns = groupedByCampaign.slice(
    (currentCampaignPage - 1) * PAGE_SIZE,
    currentCampaignPage * PAGE_SIZE
  );

  const getSubmissionPage = (campaignId) => submissionPageByCampaign[campaignId] || 1;
  const setSubmissionPage = (campaignId, nextPage) =>
    setSubmissionPageByCampaign((prev) => ({ ...prev, [campaignId]: nextPage }));

  const pendingCount = submissions.filter((s) => s.status === "Pending").length;
  const firstTimeCount = submissions.filter((s) => s.status === "Pending" && s.isFirstSubmission).length;
  const approvedTodayCount = submissions.filter((s) => s.status === "Approved").length;
  const rejectedTodayCount = submissions.filter((s) => s.status === "Rejected").length;
  const totalCampaignsCount = new Set(submissions.map((s) => s.campaignId)).size;

  // Order: Pending -> Approved -> Rejected -> Total Campaigns -> rest (First-time Clippers)
  const kpiCards = [
    { label: "Pending Review", value: pendingCount, icon: Clock3, accent: "amber" },
    { label: "Approved", value: approvedTodayCount, icon: CheckCircle2, accent: "emerald" },
    { label: "Rejected", value: rejectedTodayCount, icon: XCircle, accent: "rose" },
    { label: "Total Campaigns", value: totalCampaignsCount, icon: Layers, accent: "cyan" },
    { label: "First-time Clippers", value: firstTimeCount, icon: UserPlus, accent: "violet" },
  ];

  const KPI_ACCENTS = {
    cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
    amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
    violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
    emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
    rose: { iconBg: "bg-rose-500/10", iconText: "text-rose-400" },
  };

  const handleApprove = async (id, { checks, notes }) => {
    try {
      const updated = await api(`/api/content/campaign-submissions/${id}/approve/`, {
        method: "POST",
        body: { checks, notes },
      });
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated, status: "Approved" } : s)));
      setSelectedId(null);
      showToast({ type: "success", message: "Submission approved and clipper stats updated." });
    } catch (error) {
      showToast({ type: "error", message: error.message });
    }
  };

  const handleReject = async (id, { reason }) => {
    try {
      const updated = await api(`/api/content/campaign-submissions/${id}/reject/`, {
        method: "POST",
        body: { reason },
      });
      setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated, status: "Rejected", rejectReason: reason } : s)));
      setSelectedId(null);
      showToast({ type: "success", message: "Submission rejected. The clipper has been notified." });
    } catch (error) {
      showToast({ type: "error", message: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      {/* Hero */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
          Admin Panel
        </span>
        <h1 className="mt-5 text-4xl font-bold">Submission Verification Queue</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Review every clip submitted against a campaign before it counts toward a clipper's stats or payout.
          First-time clippers get three extra one-off checks; every submission gets checked for content
          requirements, account uniqueness, and length.
        </p>
      </section>

      {/* KPI Cards */}
      <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map(({ label, value, icon: Icon, accent }) => {
          const a = KPI_ACCENTS[accent];
          return (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                <Icon size={17} className={a.iconText} />
              </div>
              <h3 className="mt-3 text-3xl font-bold">{value}</h3>
              <p className="mt-1 text-sm text-zinc-500">{label}</p>
            </div>
          );
        })}
      </section>

      {/* Filters */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Search</label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by clipper, campaign, or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Type</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none">
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Platform</label>
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none">
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none">
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Queue — segregated by campaign, paginated */}
      <div className="mt-8 space-y-6">
        {groupedByCampaign.length === 0 ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="flex flex-col items-center justify-center py-20">
              <CheckCircle2 size={48} className="mb-4 text-zinc-600" />
              <h3 className="text-xl font-semibold">Nothing to review</h3>
              <p className="mt-2 text-sm text-zinc-500">No submissions match your current filters.</p>
            </div>
          </section>
        ) : (
          <>
            {paginatedCampaigns.map((group) => {
              const subPage = getSubmissionPage(group.campaignId);
              const subTotalPages = Math.max(1, Math.ceil(group.items.length / PAGE_SIZE));
              const currentSubPage = Math.min(subPage, subTotalPages);
              const paginatedItems = group.items.slice(
                (currentSubPage - 1) * PAGE_SIZE,
                currentSubPage * PAGE_SIZE
              );

              return (
                <section key={group.campaignId} className="rounded-3xl border border-white/10 bg-white/[0.03]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-5">
                    <div>
                      <Link to={`/admin/campaigns/${group.campaignId}`} className="text-lg font-semibold text-white hover:text-violet-300 hover:underline">
                        {group.campaignTitle}
                      </Link>
                      <p className="mt-0.5 text-sm text-zinc-400">{group.brandName}</p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">
                      {group.items.length} submission{group.items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="divide-y divide-white/5">
                    {paginatedItems.map((submission) => {
                      const { icon: PlatformIcon, color } = PLATFORM_ICONS[submission.platform] || {};
                      return (
                        <button key={submission.id} onClick={() => setSelectedId(submission.id)} className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-white/[0.03]">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5">
                            {PlatformIcon && <PlatformIcon size={18} className={color} />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-white">{submission.clipperName}</h4>
                              <span className="text-sm text-zinc-500">@{submission.clipperUsername}</span>
                              {submission.isFirstSubmission && (
                                <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
                                  First submission
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="hidden shrink-0 items-center gap-1.5 text-sm text-zinc-400 sm:flex">
                            <Eye size={14} />
                            {submission.reportedViews.toLocaleString()}
                          </div>

                          <span className="hidden shrink-0 text-xs text-zinc-500 md:block">{submission.submittedAt}</span>

                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[submission.status]}`}>
                            {submission.status}
                          </span>

                          <ChevronRight size={16} className="shrink-0 text-zinc-600" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Per-campaign submissions pagination */}
                  {subTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
                      <p className="text-sm text-zinc-500">
                        Page {currentSubPage} of {subTotalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSubmissionPage(group.campaignId, Math.max(1, currentSubPage - 1))}
                          disabled={currentSubPage === 1}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                          Prev
                        </button>
                        <button
                          onClick={() => setSubmissionPage(group.campaignId, Math.min(subTotalPages, currentSubPage + 1))}
                          disabled={currentSubPage === subTotalPages}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}

            {/* Campaign-level pagination (10 campaign sections per page) */}
            {totalCampaignPages > 1 && (
              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-4">
                <p className="text-sm text-zinc-500">
                  Campaigns — page {currentCampaignPage} of {totalCampaignPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCampaignPage((p) => Math.max(1, p - 1))}
                    disabled={currentCampaignPage === 1}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </button>
                  <button
                    onClick={() => setCampaignPage((p) => Math.min(totalCampaignPages, p + 1))}
                    disabled={currentCampaignPage === totalCampaignPages}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <SubmissionReviewModal
            submission={selected}
            onClose={() => setSelectedId(null)}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Clock3, CheckCircle, Wallet, Eye, Search, Clapperboard, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";
import SubmissionCard from "./SubmissionCard";

const initialSubmissions = [];

// Full status vocabulary used by SubmissionCard's STATUS_STYLES, so every
// status a submission can actually have is filterable — not just a subset.
const filters = ["All", "Active", "Paused", "Closed"];

const parseRupees = (str) => Number(str.replace(/[₹,]/g, ""));

export default function CreatorSubmissions() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadSubmissions = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api("/api/creator/submissions/?summary=true");
        if (!isMounted) return;

        const normalized = (data?.results || data || []).map((submission) => {
          const isCampaign = typeof submission.id === 'string' && submission.id.startsWith('campaign-');

          // Determine status: closed campaigns should show closed, active campaigns with approved posts should show active
          let statusRaw = submission.status || 'pending';
          if (isCampaign) {
            if (submission.campaign_status === 'closed') {
              statusRaw = 'closed';
            } else if (submission.campaign_status === 'paused') {
              statusRaw = 'paused';
            } else if ((submission.approved_posts || 0) > 0) {
              statusRaw = 'active';
            } else {
              statusRaw = submission.status || 'pending';
            }
          }

          const formattedStatus = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

          // Reward and views: prefer campaign-level totals when available
          const totalReward = isCampaign ? (Number(submission.total_reward || 0)) : (Number(submission.reward || 0));
          const totalViews = isCampaign ? (Number(submission.total_views || 0)) : (Number(submission.views || 0));

          const submittedRaw = submission.submitted_at || submission.joined_at || null;

          // We want the CAMPAIGN's own thumbnail (set by the brand when
          // launching it) — not anything derived from the creator's own
          // submitted video. As of the current API response, no such field
          // is actually sent (checked a live sample — every other campaign
          // detail comes through as campaign_description, campaign_category,
          // etc., but there's no campaign_thumbnail/campaign_image key).
          // These guesses are here in case the backend adds it under one of
          // these names; until then this will just stay empty and
          // SubmissionCard falls back to a category icon instead.
          const thumbnailUrl =
            submission.campaign_thumbnail ||
            submission.campaign_thumbnail_url ||
            submission.campaign_image ||
            submission.campaign_cover_image ||
            submission.campaign_image_url ||
            '';

          return {
            id: submission.id,
            title: submission.title || 'Campaign Participation',
            brand: submission.brand_name || 'Brand',
            status: formattedStatus,
            reward: `₹${totalReward.toLocaleString()}`,
            // Show "Not specified" instead of a raw N/A when we genuinely
            // don't have a submission date, rather than silently defaulting
            // to "today" via Date.now().
            submittedAt: submittedRaw
              ? new Date(submittedRaw).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })
              : 'Not specified',
            views: totalViews,
            contentUrl: submission.content_url || '',
            thumbnailUrl,
            category: submission.campaign_category || '',
            feedback: submission.feedback || '',
            // preserve campaign-specific metadata for later use
            _isCampaign: isCampaign,
            _totalReward: totalReward,
            _totalViews: totalViews,
            _approvedPosts: submission.approved_posts || 0,
          };
        });
        setSubmissions(normalized);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "Unable to load submissions.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSubmissions();
    return () => {
      isMounted = false;
    };
  }, []);

  const pendingCount = submissions.filter((s) => s.status === "Pending").length;
  const approvedCount = submissions.filter((s) => s.status === "Active").length;
  const rejectedCount = submissions.filter((s) => s.status === "Rejected").length;
  // Total earned: include campaign participation totals and individual submission rewards
  const totalEarned = submissions.reduce((sum, s) => {
    const amount = s._isCampaign ? s._totalReward : parseRupees(s.reward);
    return sum + (Number(amount) || 0);
  }, 0);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const matchesFilter = filter === "All" || s.status === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || s.title.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [submissions, filter, search]);

  const totalSubmissions = submissions.length;

  return (
    <div className="space-y-8">
      <Breadcrumbs />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white">My Content</h1>
        <p className="mt-2 text-zinc-400">Track every piece of content you've made for brands.</p>
      </div>

      {/* Stats — genuinely derived from the submissions array */}
    {/* KPI Cards */}
<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
  {/* Total Submissions */}
  <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6 transition hover:border-violet-500/30">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
      <Eye size={18} className="text-violet-400" />
    </div>

    <h2 className="mt-4 text-4xl font-bold text-white">
      {totalSubmissions}
    </h2>

    <p className="mt-2 text-zinc-500">Content Submitted</p>
  </div>

  {/* Pending */}
  <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6 transition hover:border-yellow-500/30">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
      <Clock3 size={18} className="text-yellow-400" />
    </div>

    <h2 className="mt-4 text-4xl font-bold text-white">
      {pendingCount}
    </h2>

    <p className="mt-2 text-zinc-500">Pending</p>
  </div>

  {/* Active */}
  <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6 transition hover:border-green-500/30">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
      <CheckCircle size={18} className="text-green-400" />
    </div>

    <h2 className="mt-4 text-4xl font-bold text-white">
      {approvedCount}
    </h2>

    <p className="mt-2 text-zinc-500">Active</p>
  </div>

  {/* Total Earned */}
  <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6 transition hover:border-emerald-500/30">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
      <Wallet size={18} className="text-emerald-400" />
    </div>

    <h2 className="mt-4 text-4xl font-bold text-white">
      ₹{totalEarned.toLocaleString()}
    </h2>

    <p className="mt-2 text-zinc-500">Total Earned</p>
  </div>
</div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div> : null}

      {/* Filters — single row: search on the left, pill-style status
          filters on the right, matching the gigs-page filter bar. */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#0d0d12] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search gigs..."
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 text-white outline-none transition focus:border-violet-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === status
                  ? "bg-violet-600 text-white"
                  : "border border-white/10 bg-white/[0.02] text-zinc-300 hover:border-violet-500/30 hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Submission Cards */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
              <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
              <div className="mt-4 h-4 w-24 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </div>
      ) : (
        /* Empty state — same shape as MyGigs' "No Gigs Found" */
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#11111A] px-8 py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10">
            <Clapperboard size={36} className="text-violet-400" />
          </div>

          <h2 className="mt-6 text-2xl font-bold text-white">No Content Found</h2>

          <p className="mx-auto mt-3 max-w-md text-zinc-400">
            We couldn't find any content matching your search or filters. Try
            changing the filters or browse campaigns to start creating.
          </p>

          <Link
            to="/marketplace"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500"
          >
            Browse Campaigns
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
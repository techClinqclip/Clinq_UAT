import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  Search,
  Clock3,
  CircleDollarSign,
  CheckCircle2,
  Flag,
  ChevronRight,
  ChevronLeft,
  Layers,
} from "lucide-react";
import { FaYoutube, FaInstagram, FaTiktok, FaXTwitter } from "react-icons/fa6";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";
import PendingApprovalReviewModal from "./components/PendingApprovalReviewModal";
import { api } from "../../lib/api";

/*
  Admin — Pending Amount Approval queue. From the spec sheet:

    "Pending Amt. Approval"
      - cross check if the same content is earning on the platform
        in the meantime
      - are the pending amt stats correct according to the current stats
      - Verify if the amt lies under the CAP

  Same shape as SubmissionQueue.jsx on purpose — queue page here, the
  actual checklist lives in PendingApprovalReviewModal. Also segregated
  by campaign, same as SubmissionQueue, so an admin can see per-campaign
  pending totals rather than one flat list.

  This is now the sole payout-review surface — Payout Eligibility was
  folded in here since crossing the view threshold is really just an
  upstream gate on the same review, not a separate destination.
*/

const PLATFORM_ICONS = {
  YouTube: { icon: FaYoutube, color: "text-red-400" },
  Instagram: { icon: FaInstagram, color: "text-pink-400" },
  TikTok: { icon: FaTiktok, color: "text-zinc-200" },
  X: { icon: FaXTwitter, color: "text-zinc-300" },
};

const STATUS_STYLES = {
  Pending: "bg-amber-500/10 text-amber-400",
  Approved: "bg-emerald-500/10 text-emerald-400",
  Held: "bg-rose-500/10 text-rose-400",
};

const PAGE_SIZE = 10;

// cap is the max payout allowed for this campaign/submission — pulled
// from the campaign's own budget rules in a real integration.
const initialPending = [
  {
    id: 1,
    clipperName: "Rohan Verma",
    clipperUsername: "rohanclips",
    campaignId: "c1",
    campaignTitle: "Podcast Shorts Challenge",
    brandName: "Ali Abdaal",
    platform: "YouTube",
    clipUrl: "https://youtube.com/shorts/example1",
    submittedAt: "2 hours ago",
    reportedViews: 12400,
    liveViews: 12950,
    pendingAmount: 620,
    cap: 750,
    status: "Pending",
  },
  {
    id: 2,
    clipperName: "Priya Nair",
    clipperUsername: "priyaedits",
    campaignId: "c2",
    campaignTitle: "AI Productivity Sprint",
    brandName: "Thomas Frank",
    platform: "Instagram",
    clipUrl: "https://instagram.com/reel/example2",
    submittedAt: "4 hours ago",
    reportedViews: 5800,
    liveViews: 5810,
    pendingAmount: 290,
    cap: 300,
    status: "Pending",
  },
  {
    id: 3,
    clipperName: "Arjun Mehta",
    clipperUsername: "arjun.cuts",
    campaignId: "c3",
    campaignTitle: "Finance Creator Challenge",
    brandName: "Mark Tilbury",
    platform: "YouTube",
    clipUrl: "https://youtube.com/shorts/example3",
    submittedAt: "6 hours ago",
    reportedViews: 31200,
    liveViews: 29800,
    pendingAmount: 1560,
    cap: 1200,
    status: "Pending",
  },
  {
    id: 4,
    clipperName: "Sana Khan",
    clipperUsername: "sana.clips",
    campaignId: "c4",
    campaignTitle: "Morning Routine Challenge",
    brandName: "Matt D'Avella",
    platform: "TikTok",
    clipUrl: "https://tiktok.com/@sana.clips/video/example4",
    submittedAt: "Yesterday",
    reportedViews: 8900,
    liveViews: 8900,
    pendingAmount: 445,
    cap: 500,
    status: "Pending",
  },
  {
    id: 5,
    clipperName: "Devika Rao",
    clipperUsername: "devika.edits",
    campaignId: "c3",
    campaignTitle: "Study With Me Clips",
    brandName: "Mariana's Study Corner",
    platform: "Instagram",
    clipUrl: "https://instagram.com/reel/example5",
    submittedAt: "Yesterday",
    reportedViews: 3100,
    liveViews: 3100,
    pendingAmount: 155,
    cap: 200,
    status: "Approved",
  },
  {
    id: 6,
    clipperName: "Yash Kapoor",
    clipperUsername: "yash.k",
    campaignId: "c4",
    campaignTitle: "Fitness Motivation",
    brandName: "Chris Heria",
    platform: "X",
    clipUrl: "https://x.com/yash_k/status/example6",
    submittedAt: "2 days ago",
    reportedViews: 1200,
    liveViews: 400,
    pendingAmount: 60,
    cap: 60,
    status: "Held",
  },
];

const PLATFORM_OPTIONS = ["All", "YouTube", "Instagram", "TikTok", "X"];
const STATUS_OPTIONS = ["Pending", "Approved", "Held", "All"];

export default function PendingApprovals() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [campaignPage, setCampaignPage] = useState(1);
  // Per-campaign pagination for the items list inside each campaign section.
  const [itemPageByCampaign, setItemPageByCampaign] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    api("/api/content/campaign-submissions/?queue=payouts")
      .then((response) => setItems((response.results || response || []).map((item) => ({
        ...item,
        campaignId: item.campaignId,
        campaignTitle: item.campaignTitle || "Campaign",
        brandName: item.brandName || "Brand",
        clipperName: item.clipperEmail || "Clipper",
        clipperUsername: item.clipperUsername || item.clipperEmail || "clipper",
        platform: item.platform === "Twitter/X" ? "X" : item.platform,
        clipUrl: item.contentUrl,
        submittedAt: new Date(item.createdAt).toLocaleString(),
        reportedViews: Number(item.views || 0),
        liveViews: Number(item.views || 0),
        pendingAmount: item.payoutReviewStatus === "approved"
          ? Number(item.earning || 0)
          : Number(item.pendingEarning || 0),
        cap: Number(item.campaignMaxEarnings || 0),
        status: item.payoutReviewStatus === "held" ? "Held" : item.payoutReviewStatus === "approved" ? "Approved" : "Pending",
      }))))
      .catch((error) => showToast({ type: "error", message: error.message }));
  }, [showToast]);

  const selected = items.find((i) => i.id === selectedId) || null;

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter !== "All" && i.status !== statusFilter) return false;
      if (platformFilter !== "All" && i.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${i.clipperName} ${i.clipperUsername} ${i.campaignTitle} ${i.brandName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, platformFilter, statusFilter]);

  // Group the filtered results by campaign, same convention as
  // SubmissionQueue.jsx.
  const groupedByCampaign = useMemo(() => {
    const map = new Map();
    for (const i of filtered) {
      if (!map.has(i.campaignId)) {
        map.set(i.campaignId, {
          campaignId: i.campaignId,
          campaignTitle: i.campaignTitle,
          brandName: i.brandName,
          items: [],
        });
      }
      map.get(i.campaignId).items.push(i);
    }
    return Array.from(map.values());
  }, [filtered]);

  // Reset campaign pagination and per-campaign item pagination whenever
  // the filters/search change the underlying result set.
  useEffect(() => {
    setCampaignPage(1);
    setItemPageByCampaign({});
  }, [search, platformFilter, statusFilter]);

  const totalCampaignPages = Math.max(1, Math.ceil(groupedByCampaign.length / PAGE_SIZE));
  const currentCampaignPage = Math.min(campaignPage, totalCampaignPages);
  const paginatedCampaigns = groupedByCampaign.slice(
    (currentCampaignPage - 1) * PAGE_SIZE,
    currentCampaignPage * PAGE_SIZE
  );

  const getItemPage = (campaignId) => itemPageByCampaign[campaignId] || 1;
  const setItemPage = (campaignId, nextPage) =>
    setItemPageByCampaign((prev) => ({ ...prev, [campaignId]: nextPage }));

  const pendingItems = items.filter((i) => i.status === "Pending");
  const pendingCount = pendingItems.length;
  const totalPendingAmount = pendingItems.reduce((sum, i) => sum + i.pendingAmount, 0);
  const totalApprovedAmount = items
    .filter((i) => i.status === "Approved")
    .reduce((sum, i) => sum + i.pendingAmount, 0);
  const overCapCount = pendingItems.filter((i) => i.pendingAmount > i.cap).length;
  const approvedTodayCount = items.filter((i) => i.status === "Approved").length;
  const totalCampaignsCount = new Set(items.map((i) => i.campaignId)).size;

  const kpiCards = [
    { label: "Total Campaigns", value: totalCampaignsCount, icon: Layers, accent: "cyan" },
    { label: "Pending Review", value: pendingCount, icon: Clock3, accent: "amber" },
    { label: "Total Pending Amount", value: `₹${totalPendingAmount.toLocaleString()}`, icon: CircleDollarSign, accent: "violet" },
    { label: "Over CAP", value: overCapCount, icon: Flag, accent: "rose" },
    { label: "Approved Amount", value: `₹${totalApprovedAmount.toLocaleString()}`, icon: CheckCircle2, accent: "emerald" },
    { label: "Approved Count", value: approvedTodayCount, icon: CheckCircle2, accent: "cyan" },
  ];

  const KPI_ACCENTS = {
    cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
    amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
    violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
    emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
    rose: { iconBg: "bg-rose-500/10", iconText: "text-rose-400" },
  };

  const handleApprove = async (id, { notes }) => {
    try {
      const updated = await api(`/api/content/campaign-submissions/${id}/settle-pending/`, {
        method: "POST",
        body: { notes },
      });
      setItems((prev) => prev.filter((item) => item.id !== id || Number(updated.pendingEarning || 0) > 0));
      setSelectedId(null);
      showToast({ type: "success", message: "Payout approved and released." });
    } catch (error) {
      showToast({ type: "error", message: error.message });
    }
  };

  const handleHold = async (id, { reason }) => {
    try {
      const updated = await api(`/api/content/campaign-submissions/${id}/hold/`, {
        method: "POST",
        body: { reason },
      });
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updated, status: "Held", pendingAmount: Number(updated.pendingEarning || item.pendingAmount) } : item));
      setSelectedId(null);
      showToast({ type: "success", message: "Payout held. The clipper has been notified." });
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
        <h1 className="mt-5 text-4xl font-bold">Pending Amount Approval</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Review every payout before it's released. Confirm the content isn't still earning elsewhere,
          that the pending amount matches current stats, and that it falls within the campaign's CAP.
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
              <p className="mt-2 text-sm text-zinc-500">No pending amounts match your current filters.</p>
            </div>
          </section>
        ) : (
          <>
            {paginatedCampaigns.map((group) => {
              const groupPendingTotal = group.items
                .filter((i) => i.status === "Pending")
                .reduce((sum, i) => sum + i.pendingAmount, 0);

              const itemPage = getItemPage(group.campaignId);
              const itemTotalPages = Math.max(1, Math.ceil(group.items.length / PAGE_SIZE));
              const currentItemPage = Math.min(itemPage, itemTotalPages);
              const paginatedItems = group.items.slice(
                (currentItemPage - 1) * PAGE_SIZE,
                currentItemPage * PAGE_SIZE
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
                    <div className="flex items-center gap-2">
                      {groupPendingTotal > 0 && (
                        <span className="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-400">
                          ₹{groupPendingTotal.toLocaleString()} pending
                        </span>
                      )}
                      <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">
                        {group.items.length} item{group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-white/5">
                    {paginatedItems.map((item) => {
                      const { icon: PlatformIcon, color } = PLATFORM_ICONS[item.platform] || {};
                      const overCap = item.pendingAmount > item.cap;
                      return (
                        <button key={item.id} onClick={() => setSelectedId(item.id)} className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-white/[0.03]">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5">
                            {PlatformIcon && <PlatformIcon size={18} className={color} />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-white">{item.clipperName}</h4>
                              <span className="text-sm text-zinc-500">@{item.clipperUsername}</span>
                              {overCap && (
                                <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-300">
                                  Over CAP
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="hidden shrink-0 text-sm font-medium text-white sm:block">
                            ₹{item.pendingAmount.toLocaleString()}
                          </div>

                          <span className="hidden shrink-0 text-xs text-zinc-500 md:block">{item.submittedAt}</span>

                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}>
                            {item.status}
                          </span>

                          <ChevronRight size={16} className="shrink-0 text-zinc-600" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Per-campaign items pagination */}
                  {itemTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
                      <p className="text-sm text-zinc-500">
                        Page {currentItemPage} of {itemTotalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setItemPage(group.campaignId, Math.max(1, currentItemPage - 1))}
                          disabled={currentItemPage === 1}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ChevronLeft size={14} />
                          Prev
                        </button>
                        <button
                          onClick={() => setItemPage(group.campaignId, Math.min(itemTotalPages, currentItemPage + 1))}
                          disabled={currentItemPage === itemTotalPages}
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
          <PendingApprovalReviewModal
            item={selected}
            onClose={() => setSelectedId(null)}
            onApprove={handleApprove}
            onHold={handleHold}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
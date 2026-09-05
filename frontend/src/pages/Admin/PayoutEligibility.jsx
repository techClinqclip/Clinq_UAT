import { useEffect, useMemo, useState } from "react";
import { Search, Eye, IndianRupee, TrendingUp, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { FaYoutube, FaInstagram, FaTiktok, FaXTwitter } from "react-icons/fa6";
import Breadcrumbs from "../../components/Breadcrumbs";
import useToast from "../../hooks/useToast";

const VIEW_THRESHOLD = 1000;
const PAGE_SIZE = 10;

const PLATFORM_ICONS = {
  YouTube: { icon: FaYoutube, color: "text-red-400" },
  Instagram: { icon: FaInstagram, color: "text-pink-400" },
  TikTok: { icon: FaTiktok, color: "text-zinc-200" },
  X: { icon: FaXTwitter, color: "text-zinc-300" },
};

const initialItems = [
  { id: 1, clipperName: "Rohan Verma", clipperUsername: "rohanclips", campaignTitle: "Podcast Shorts Challenge", brandName: "Ali Abdaal", platform: "YouTube", views: 12950, estimatedPayout: 620, sentToApproval: false },
  { id: 2, clipperName: "Priya Nair", clipperUsername: "priyaedits", campaignTitle: "AI Productivity Sprint", brandName: "Thomas Frank", platform: "Instagram", views: 5810, estimatedPayout: 290, sentToApproval: false },
  { id: 3, clipperName: "Sana Khan", clipperUsername: "sana.clips", campaignTitle: "Morning Routine Challenge", brandName: "Matt D'Avella", platform: "TikTok", views: 890, estimatedPayout: 44, sentToApproval: false },
  { id: 4, clipperName: "Devika Rao", clipperUsername: "devika.edits", campaignTitle: "Study With Me Clips", brandName: "Mariana's Study Corner", platform: "Instagram", views: 610, estimatedPayout: 30, sentToApproval: false },
  { id: 5, clipperName: "Yash Kapoor", clipperUsername: "yash.k", campaignTitle: "Fitness Motivation", brandName: "Chris Heria", platform: "X", views: 1040, estimatedPayout: 52, sentToApproval: true },
];

const PLATFORM_OPTIONS = ["All", "YouTube", "Instagram", "TikTok", "X"];
const STATUS_OPTIONS = ["Eligible", "Not yet eligible", "Sent to approval", "All"];

export default function PayoutEligibility() {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Eligible");
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  const statusOf = (item) => {
    if (item.sentToApproval) return "Sent to approval";
    return item.views >= VIEW_THRESHOLD ? "Eligible" : "Not yet eligible";
  };

  const filtered = useMemo(() => {
    return items.filter((i) => {
      const status = statusOf(i);
      if (statusFilter !== "All" && status !== statusFilter) return false;
      if (platformFilter !== "All" && i.platform !== platformFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${i.clipperName} ${i.clipperUsername} ${i.campaignTitle} ${i.brandName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, platformFilter, statusFilter]);

  // Reset to page 1 whenever the filtered set changes shape (search/filter change)
  useEffect(() => {
    setPage(1);
  }, [search, platformFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const eligibleCount = items.filter((i) => !i.sentToApproval && i.views >= VIEW_THRESHOLD).length;
  const approachingCount = items.filter(
    (i) => !i.sentToApproval && i.views < VIEW_THRESHOLD && i.views >= VIEW_THRESHOLD * 0.75
  ).length;
  const sentCount = items.filter((i) => i.sentToApproval).length;
  const totalEligibleAmount = items
    .filter((i) => !i.sentToApproval && i.views >= VIEW_THRESHOLD)
    .reduce((sum, i) => sum + i.estimatedPayout, 0);

  const kpiCards = [
    { label: "Eligible Now", value: eligibleCount, icon: IndianRupee, accent: "emerald" },
    { label: "Approaching 1,000", value: approachingCount, icon: TrendingUp, accent: "amber" },
    { label: "Eligible Amount", value: `₹${totalEligibleAmount.toLocaleString()}`, icon: IndianRupee, accent: "violet" },
    { label: "Sent to Approval", value: sentCount, icon: Send, accent: "cyan" },
  ];

  const KPI_ACCENTS = {
    emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
    amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
    violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
    cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
  };

  const handleSendToApproval = (id) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, sentToApproval: true } : i)));
    showToast({ type: "success", message: "Sent to Pending Amt. Approval." });
    // TODO(backend): create/PATCH the corresponding pending-approval
    // record so it shows up in /admin/pending-approvals.
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      {/* Hero */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
          Admin Panel
        </span>
        <h1 className="mt-5 text-4xl font-bold">Payout Eligibility</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Clips become payout-eligible once they cross {VIEW_THRESHOLD.toLocaleString()} views. Send eligible
          clips to Pending Amt. Approval for the CAP and stats checks before release.
        </p>
      </section>

      {/* KPI Cards */}
      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by clipper, campaign, or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500"
            />
          </div>

          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Queue */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Clips</h2>
              <p className="mt-1 text-sm text-zinc-400">Progress toward the {VIEW_THRESHOLD.toLocaleString()}-view threshold.</p>
            </div>
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">{filtered.length} Results</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <IndianRupee size={48} className="mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold">Nothing here</h3>
            <p className="mt-2 text-sm text-zinc-500">No clips match your current filters.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/5">
              {paginated.map((item) => {
                const { icon: PlatformIcon, color } = PLATFORM_ICONS[item.platform] || {};
                const progress = Math.min(100, Math.round((item.views / VIEW_THRESHOLD) * 100));
                const status = statusOf(item);

                return (
                  <div key={item.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5">
                      {PlatformIcon && <PlatformIcon size={18} className={color} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-white">{item.clipperName}</h4>
                        <span className="text-sm text-zinc-500">@{item.clipperUsername}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-zinc-400">
                        {item.campaignTitle} · {item.brandName}
                      </p>

                      <div className="mt-3 max-w-xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-zinc-400">
                            <Eye size={12} />
                            {item.views.toLocaleString()} / {VIEW_THRESHOLD.toLocaleString()}
                          </span>
                          <span className="font-medium text-zinc-300">{progress}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full ${
                              status === "Sent to approval"
                                ? "bg-cyan-400"
                                : status === "Eligible"
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                      <span className="text-sm font-medium text-white">₹{item.estimatedPayout.toLocaleString()} est.</span>
                      {status === "Eligible" && (
                        <button
                          onClick={() => handleSendToApproval(item.id)}
                          className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-[#0A0A0F] transition hover:bg-emerald-400"
                        >
                          <Send size={12} />
                          Send to Approval
                        </button>
                      )}
                      {status === "Sent to approval" && (
                        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400">
                          Sent to Approval
                        </span>
                      )}
                      {status === "Not yet eligible" && (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-zinc-500">
                          Not yet eligible
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
                <p className="text-sm text-zinc-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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
      </section>
    </div>
  );
}
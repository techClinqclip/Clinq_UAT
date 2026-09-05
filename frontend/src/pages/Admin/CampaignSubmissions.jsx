import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Layers, Users, FileVideo, Wallet } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";

/*
  Admin — Campaign Submissions. Segregates the submission queue by
  campaign instead of a flat list, so an admin can answer "how many
  submissions has this campaign gotten in total" and "how many has
  this specific clipper sent to it" at a glance.

  Mock data kept local to this feature (same convention as
  PendingApprovals/PayoutEligibility having their own datasets) —
  wire this to real campaign + submission endpoints once they exist.
  Each campaign is tagged with ownerType ('brand' | 'creator') since
  campaigns can come from either side of the platform.
*/

const MOCK_CAMPAIGNS = [
  {
    id: "c1",
    title: "Podcast Shorts Challenge",
    ownerType: "brand",
    ownerName: "Ali Abdaal",
    category: "Podcast",
    budget: 50000,
    rewardPer1k: 20,
  },
  {
    id: "c2",
    title: "AI Productivity Sprint",
    ownerType: "brand",
    ownerName: "Thomas Frank",
    category: "Technology",
    budget: 30000,
    rewardPer1k: 25,
  },
  {
    id: "c3",
    title: "Finance Creator Challenge",
    ownerType: "creator",
    ownerName: "Mark Tilbury",
    category: "Finance",
    budget: 40000,
    rewardPer1k: 18,
  },
  {
    id: "c4",
    title: "Morning Routine Challenge",
    ownerType: "creator",
    ownerName: "Matt D'Avella",
    category: "Lifestyle",
    budget: 20000,
    rewardPer1k: 15,
  },
];

const MOCK_SUBMISSIONS = [
  { id: 1, campaignId: "c1", clipperName: "Rohan Verma", clipperUsername: "rohanclips", status: "Pending" },
  { id: 2, campaignId: "c1", clipperName: "Priya Nair", clipperUsername: "priyaedits", status: "Approved" },
  { id: 3, campaignId: "c1", clipperName: "Rohan Verma", clipperUsername: "rohanclips", status: "Approved" },
  { id: 4, campaignId: "c2", clipperName: "Priya Nair", clipperUsername: "priyaedits", status: "Pending" },
  { id: 5, campaignId: "c2", clipperName: "Sana Khan", clipperUsername: "sana.clips", status: "Rejected" },
  { id: 6, campaignId: "c3", clipperName: "Arjun Mehta", clipperUsername: "arjun.cuts", status: "Pending" },
  { id: 7, campaignId: "c3", clipperName: "Arjun Mehta", clipperUsername: "arjun.cuts", status: "Approved" },
  { id: 8, campaignId: "c3", clipperName: "Devika Rao", clipperUsername: "devika.edits", status: "Approved" },
  { id: 9, campaignId: "c4", clipperName: "Sana Khan", clipperUsername: "sana.clips", status: "Pending" },
];

const OWNER_STYLES = {
  brand: "bg-cyan-500/10 text-cyan-300",
  creator: "bg-violet-500/10 text-violet-300",
};

export default function CampaignSubmissions() {
  const [search, setSearch] = useState("");

  const campaignsWithStats = useMemo(() => {
    return MOCK_CAMPAIGNS.map((campaign) => {
      const subs = MOCK_SUBMISSIONS.filter((s) => s.campaignId === campaign.id);
      const uniqueClippers = new Set(subs.map((s) => s.clipperUsername)).size;
      return {
        ...campaign,
        totalSubmissions: subs.length,
        pending: subs.filter((s) => s.status === "Pending").length,
        approved: subs.filter((s) => s.status === "Approved").length,
        rejected: subs.filter((s) => s.status === "Rejected").length,
        uniqueClippers,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search) return campaignsWithStats;
    const q = search.toLowerCase();
    return campaignsWithStats.filter(
      (c) => c.title.toLowerCase().includes(q) || c.ownerName.toLowerCase().includes(q)
    );
  }, [campaignsWithStats, search]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      {/* Hero */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
          Admin Panel
        </span>
        <h1 className="mt-5 text-4xl font-bold">Campaign Submissions</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Submissions grouped by campaign — see totals per campaign and drill into a per-clipper breakdown.
        </p>
      </section>

      {/* Search */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Search</label>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by campaign or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500"
          />
        </div>
      </section>

      {/* Campaign list */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-semibold">Campaigns</h2>
          <p className="mt-1 text-sm text-zinc-400">Click a campaign to see its full submission breakdown.</p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Layers size={48} className="mb-4 text-zinc-600" />
            <h3 className="text-xl font-semibold">No campaigns found</h3>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/admin/campaigns/${c.id}`}
                className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.03] sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-white">{c.title}</h4>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${OWNER_STYLES[c.ownerType]}`}>
                      {c.ownerType}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {c.ownerName} · {c.category}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-sm">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <FileVideo size={14} className="text-zinc-500" />
                    {c.totalSubmissions} submissions
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Users size={14} className="text-zinc-500" />
                    {c.uniqueClippers} clippers
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Wallet size={14} className="text-zinc-500" />
                    ₹{c.budget.toLocaleString()} budget
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {c.pending > 0 && (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                      {c.pending} pending
                    </span>
                  )}
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    {c.approved} approved
                  </span>
                  {c.rejected > 0 && (
                    <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400">
                      {c.rejected} rejected
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
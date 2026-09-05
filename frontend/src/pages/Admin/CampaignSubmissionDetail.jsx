import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, FileVideo, Wallet, IndianRupee } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";

/*
  Admin — single campaign's submission breakdown. Two views stacked:
    1. Per-clipper totals — how many submissions each clipper has sent
       to THIS campaign, and their approve/pending/reject split.
    2. Full submission list for this campaign.

  Same mock dataset as CampaignSubmissions.jsx — split into its own
  file once a real API exists rather than duplicated here.
*/

const MOCK_CAMPAIGNS = [
  { id: "c1", title: "Podcast Shorts Challenge", ownerType: "brand", ownerName: "Ali Abdaal", category: "Podcast", budget: 50000, rewardPer1k: 20 },
  { id: "c2", title: "AI Productivity Sprint", ownerType: "brand", ownerName: "Thomas Frank", category: "Technology", budget: 30000, rewardPer1k: 25 },
  { id: "c3", title: "Finance Creator Challenge", ownerType: "creator", ownerName: "Mark Tilbury", category: "Finance", budget: 40000, rewardPer1k: 18 },
  { id: "c4", title: "Morning Routine Challenge", ownerType: "creator", ownerName: "Matt D'Avella", category: "Lifestyle", budget: 20000, rewardPer1k: 15 },
];

const MOCK_SUBMISSIONS = [
  { id: 1, campaignId: "c1", clipperName: "Rohan Verma", clipperUsername: "rohanclips", platform: "YouTube", views: 12400, status: "Pending", submittedAt: "2 hours ago" },
  { id: 2, campaignId: "c1", clipperName: "Priya Nair", clipperUsername: "priyaedits", platform: "Instagram", views: 5800, status: "Approved", submittedAt: "1 day ago" },
  { id: 3, campaignId: "c1", clipperName: "Rohan Verma", clipperUsername: "rohanclips", platform: "YouTube", views: 9100, status: "Approved", submittedAt: "3 days ago" },
  { id: 4, campaignId: "c2", clipperName: "Priya Nair", clipperUsername: "priyaedits", platform: "Instagram", views: 4200, status: "Pending", submittedAt: "4 hours ago" },
  { id: 5, campaignId: "c2", clipperName: "Sana Khan", clipperUsername: "sana.clips", platform: "TikTok", views: 1900, status: "Rejected", submittedAt: "2 days ago" },
  { id: 6, campaignId: "c3", clipperName: "Arjun Mehta", clipperUsername: "arjun.cuts", platform: "YouTube", views: 31200, status: "Pending", submittedAt: "6 hours ago" },
  { id: 7, campaignId: "c3", clipperName: "Arjun Mehta", clipperUsername: "arjun.cuts", platform: "YouTube", views: 8700, status: "Approved", submittedAt: "5 days ago" },
  { id: 8, campaignId: "c3", clipperName: "Devika Rao", clipperUsername: "devika.edits", platform: "Instagram", views: 3100, status: "Approved", submittedAt: "6 days ago" },
  { id: 9, campaignId: "c4", clipperName: "Sana Khan", clipperUsername: "sana.clips", platform: "TikTok", views: 8900, status: "Pending", submittedAt: "Yesterday" },
];

const STATUS_STYLES = {
  Pending: "bg-amber-500/10 text-amber-400",
  Approved: "bg-emerald-500/10 text-emerald-400",
  Rejected: "bg-rose-500/10 text-rose-400",
};

const OWNER_STYLES = {
  brand: "bg-cyan-500/10 text-cyan-300",
  creator: "bg-violet-500/10 text-violet-300",
};

export default function CampaignSubmissionDetail() {
  const { campaignId } = useParams();
  const campaign = MOCK_CAMPAIGNS.find((c) => c.id === campaignId);
  const submissions = useMemo(
    () => MOCK_SUBMISSIONS.filter((s) => s.campaignId === campaignId),
    [campaignId]
  );

  const byClipper = useMemo(() => {
    const map = new Map();
    for (const s of submissions) {
      if (!map.has(s.clipperUsername)) {
        map.set(s.clipperUsername, {
          clipperName: s.clipperName,
          clipperUsername: s.clipperUsername,
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          totalViews: 0,
        });
      }
      const entry = map.get(s.clipperUsername);
      entry.total += 1;
      entry.totalViews += s.views;
      if (s.status === "Approved") entry.approved += 1;
      if (s.status === "Pending") entry.pending += 1;
      if (s.status === "Rejected") entry.rejected += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [submissions]);

  const totalSubmissions = submissions.length;
  const totalApproved = submissions.filter((s) => s.status === "Approved").length;
  const totalPending = submissions.filter((s) => s.status === "Pending").length;
  const estimatedSpend = submissions
    .filter((s) => s.status === "Approved")
    .reduce((sum, s) => sum + (s.views / 1000) * (campaign?.rewardPer1k || 0), 0);

  if (!campaign) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <Breadcrumbs />
        <p className="mt-6 text-zinc-400">Campaign not found.</p>
        <Link to="/admin/campaigns" className="mt-3 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300">
          <ArrowLeft size={14} />
          Back to Campaign Submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      <Link
        to="/admin/campaigns"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft size={14} />
        All campaigns
      </Link>

      {/* Campaign header */}
      <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${OWNER_STYLES[campaign.ownerType]}`}>
            {campaign.ownerType}
          </span>
          <span className="text-sm text-zinc-500">{campaign.ownerName}</span>
        </div>
        <h1 className="mt-3 text-4xl font-bold">{campaign.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{campaign.category}</p>

        <div className="mt-6 flex flex-wrap gap-6 text-sm text-zinc-300">
          <div className="flex items-center gap-1.5">
            <Wallet size={15} className="text-zinc-500" />
            ₹{campaign.budget.toLocaleString()} total budget
          </div>
          <div className="flex items-center gap-1.5">
            <IndianRupee size={15} className="text-zinc-500" />
            ₹{campaign.rewardPer1k} / 1K views
          </div>
        </div>
      </section>

      {/* Campaign-level stats */}
      <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Submissions", value: totalSubmissions, icon: FileVideo, accent: "violet" },
          { label: "Unique Clippers", value: byClipper.length, icon: Users, accent: "cyan" },
          { label: "Pending Review", value: totalPending, icon: FileVideo, accent: "amber" },
          { label: "Est. Spend (Approved)", value: `₹${estimatedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: Wallet, accent: "emerald" },
        ].map(({ label, value, icon: Icon, accent }) => {
          const styles = {
            violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
            cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
            amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
            emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
          }[accent];
          return (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.iconBg}`}>
                <Icon size={17} className={styles.iconText} />
              </div>
              <h3 className="mt-3 text-3xl font-bold">{value}</h3>
              <p className="mt-1 text-sm text-zinc-500">{label}</p>
            </div>
          );
        })}
      </section>

      {/* Per-clipper breakdown */}
    {/* Per-clipper breakdown */}
<section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
  <div className="border-b border-white/10 px-6 py-5">
    <h2 className="text-xl font-semibold">By clipper</h2>
    <p className="mt-1 text-sm text-zinc-400">Every clipper's submission count for this campaign. Click a row to see their full history.</p>
  </div>
  <div className="divide-y divide-white/5">
    {byClipper.map((c) => (
      <Link key={c.clipperUsername} to={`/admin/clippers/${c.clipperUsername}`} className="flex flex-wrap items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03]">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{c.clipperName}</p>
          <p className="text-sm text-zinc-500">@{c.clipperUsername}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-zinc-300">{c.total} total</span>
          <span className="text-emerald-400">{c.approved} approved</span>
          {c.pending > 0 && <span className="text-amber-400">{c.pending} pending</span>}
          {c.rejected > 0 && <span className="text-rose-400">{c.rejected} rejected</span>}
          <span className="text-zinc-400">{c.totalViews.toLocaleString()} views</span>
        </div>
      </Link>
    ))}
  </div>
</section>

      {/* Full submission list */}
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-semibold">All submissions</h2>
        </div>
        <div className="divide-y divide-white/5">
          {submissions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{s.clipperName}</p>
                <p className="text-sm text-zinc-500">@{s.clipperUsername} · {s.platform}</p>
              </div>
              <span className="text-sm text-zinc-400">{s.views.toLocaleString()} views</span>
              <span className="text-xs text-zinc-500">{s.submittedAt}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
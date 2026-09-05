import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileVideo, CheckCircle2, Clock3, Eye } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";

/*
  Admin — single clipper's full submission history, across every
  campaign they've submitted to. Counterpart to CampaignSubmissionDetail
  (which is scoped to one campaign) — this is scoped to one clipper.

  Mock data duplicated here rather than imported — same convention as
  the other admin pages. Once a real API exists, both this and
  CampaignSubmissionDetail should hit the same submissions endpoint,
  just filtered differently (?clipper=username vs ?campaign=id).
*/

const MOCK_SUBMISSIONS = [
  { id: 1, clipperUsername: "rohanclips", clipperName: "Rohan Verma", campaignId: "c1", campaignTitle: "Podcast Shorts Challenge", platform: "YouTube", views: 12400, status: "Pending", submittedAt: "2 hours ago" },
  { id: 3, clipperUsername: "rohanclips", clipperName: "Rohan Verma", campaignId: "c1", campaignTitle: "Podcast Shorts Challenge", platform: "YouTube", views: 9100, status: "Approved", submittedAt: "3 days ago" },
  { id: 2, clipperUsername: "priyaedits", clipperName: "Priya Nair", campaignId: "c2", campaignTitle: "AI Productivity Sprint", platform: "Instagram", views: 5800, status: "Pending", submittedAt: "4 hours ago" },
  { id: 6, clipperUsername: "arjun.cuts", clipperName: "Arjun Mehta", campaignId: "c3", campaignTitle: "Finance Creator Challenge", platform: "YouTube", views: 31200, status: "Pending", submittedAt: "6 hours ago" },
  { id: 7, clipperUsername: "arjun.cuts", clipperName: "Arjun Mehta", campaignId: "c3", campaignTitle: "Finance Creator Challenge", platform: "YouTube", views: 8700, status: "Approved", submittedAt: "5 days ago" },
  { id: 4, clipperUsername: "sana.clips", clipperName: "Sana Khan", campaignId: "c4", campaignTitle: "Morning Routine Challenge", platform: "TikTok", views: 8900, status: "Pending", submittedAt: "Yesterday" },
  { id: 5, clipperUsername: "devika.edits", clipperName: "Devika Rao", campaignId: "c3", campaignTitle: "Study With Me Clips", platform: "Instagram", views: 3100, status: "Approved", submittedAt: "Yesterday" },
  { id: 8, clipperUsername: "yash.k", clipperName: "Yash Kapoor", campaignId: "c4", campaignTitle: "Fitness Motivation", platform: "X", views: 1200, status: "Rejected", submittedAt: "2 days ago" },
];

const STATUS_STYLES = {
  Pending: "bg-amber-500/10 text-amber-400",
  Approved: "bg-emerald-500/10 text-emerald-400",
  Rejected: "bg-rose-500/10 text-rose-400",
};

export default function AdminClipperSubmissions() {
  const { username } = useParams();
  const submissions = useMemo(
    () => MOCK_SUBMISSIONS.filter((s) => s.clipperUsername === username),
    [username]
  );

  const clipperName = submissions[0]?.clipperName || username;
  const total = submissions.length;
  const approved = submissions.filter((s) => s.status === "Approved").length;
  const pending = submissions.filter((s) => s.status === "Pending").length;
  const totalViews = submissions.reduce((sum, s) => sum + s.views, 0);
  const uniqueCampaigns = new Set(submissions.map((s) => s.campaignId)).size;

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      <Link to="/admin/submissions" className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white">
        <ArrowLeft size={14} />
        Back to Submission Queue
      </Link>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <h1 className="text-4xl font-bold">{clipperName}</h1>
        <p className="mt-2 text-sm text-zinc-400">@{username}</p>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Submissions", value: total, icon: FileVideo, accent: "violet" },
          { label: "Approved", value: approved, icon: CheckCircle2, accent: "emerald" },
          { label: "Pending", value: pending, icon: Clock3, accent: "amber" },
          { label: "Total Views", value: totalViews.toLocaleString(), icon: Eye, accent: "cyan" },
        ].map(({ label, value, icon: Icon, accent }) => {
          const styles = {
            violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400" },
            emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400" },
            amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400" },
            cyan: { iconBg: "bg-cyan-500/10", iconText: "text-cyan-400" },
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

      <p className="mt-6 text-sm text-zinc-500">Submitted to {uniqueCampaigns} campaign{uniqueCampaigns === 1 ? "" : "s"}.</p>

      <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-semibold">All submissions</h2>
        </div>
        <div className="divide-y divide-white/5">
          {submissions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <Link to={`/admin/campaigns/${s.campaignId}`} className="font-medium text-white hover:text-violet-300 hover:underline">
                  {s.campaignTitle}
                </Link>
                <p className="text-sm text-zinc-500">{s.platform}</p>
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
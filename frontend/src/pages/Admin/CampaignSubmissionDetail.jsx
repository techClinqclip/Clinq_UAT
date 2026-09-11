import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, FileVideo, Wallet, IndianRupee } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";

const STATUS_STYLES = { pending: "bg-amber-500/10 text-amber-400", approved: "bg-emerald-500/10 text-emerald-400", rejected: "bg-rose-500/10 text-rose-400" };
const titleCase = (value) => String(value || "").replace(/^./, (letter) => letter.toUpperCase());

export default function CampaignSubmissionDetail() {
  const { campaignId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api(`/api/content/campaign-submissions/?campaign_id=${encodeURIComponent(campaignId)}`)
      .then((response) => active && setSubmissions(response.results || response || []))
      .catch((requestError) => active && setError(requestError.message || "Unable to load this campaign."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [campaignId]);

  const campaign = submissions[0];
  const byClipper = useMemo(() => {
    const grouped = new Map();
    for (const item of submissions) {
      const key = item.clipperId || item.clipperUsername;
      if (!grouped.has(key)) grouped.set(key, { id: key, name: item.clipperName || item.clipperEmail, username: item.clipperUsername || item.clipperEmail, total: 0, approved: 0, pending: 0, rejected: 0, views: 0 });
      const clipper = grouped.get(key);
      clipper.total += 1; clipper.views += Number(item.views || 0); clipper[item.status] = (clipper[item.status] || 0) + 1;
    }
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [submissions]);
  const approved = submissions.filter((item) => item.status === "approved");
  const estimatedSpend = approved.reduce((sum, item) => sum + Number(item.earning || 0) + Number(item.pendingEarning || 0), 0);

  return <div className="min-h-screen bg-black text-white"><Breadcrumbs />
    <Link to="/admin/campaigns" className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"><ArrowLeft size={14} />All campaigns</Link>
    {loading && <p className="mt-6 text-zinc-400">Loading campaign data...</p>}{!loading && error && <p className="mt-6 text-rose-400">{error}</p>}
    {!loading && !error && !campaign && <p className="mt-6 text-zinc-400">Campaign not found or it has no submissions.</p>}
    {!loading && !error && campaign && <><section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300">{titleCase(campaign.campaignType)}</span><span className="rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-300">{titleCase(campaign.campaignStatus)}</span><span className="text-sm text-zinc-500">{campaign.brandName}</span></div><h1 className="mt-3 text-4xl font-bold">{campaign.campaignTitle}</h1><p className="mt-2 text-sm text-zinc-400">{campaign.campaignCategory}</p><div className="mt-6 flex flex-wrap gap-6 text-sm text-zinc-300"><span className="flex items-center gap-1.5"><Wallet size={15} className="text-zinc-500" />₹{Number(campaign.campaignBudget || 0).toLocaleString()} total budget</span><span className="flex items-center gap-1.5"><IndianRupee size={15} className="text-zinc-500" />₹{Number(campaign.campaignRewardPer1k || 0).toLocaleString()} / 1K views</span></div></section>
      <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">{[{ label: "Total Submissions", value: submissions.length, icon: FileVideo, color: "text-violet-400" }, { label: "Unique Clippers", value: byClipper.length, icon: Users, color: "text-cyan-400" }, { label: "Pending Review", value: submissions.filter((item) => item.status === "pending").length, icon: FileVideo, color: "text-amber-400" }, { label: "Est. Spend (Approved)", value: `₹${estimatedSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: Wallet, color: "text-emerald-400" }].map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><Icon size={17} className={color} /><h3 className="mt-3 text-3xl font-bold">{value}</h3><p className="mt-1 text-sm text-zinc-500">{label}</p></div>)}</section>
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]"><div className="border-b border-white/10 px-6 py-5"><h2 className="text-xl font-semibold">By clipper</h2></div><div className="divide-y divide-white/5">{byClipper.map((clipper) => <Link key={clipper.id} to={`/admin/clippers/${encodeURIComponent(clipper.username)}`} className="flex flex-wrap items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03]"><div className="min-w-0 flex-1"><p className="font-medium text-white">{clipper.name}</p><p className="text-sm text-zinc-500">@{clipper.username}</p></div><div className="flex flex-wrap items-center gap-4 text-sm"><span className="text-zinc-300">{clipper.total} total</span><span className="text-emerald-400">{clipper.approved} approved</span>{clipper.pending > 0 && <span className="text-amber-400">{clipper.pending} pending</span>}{clipper.rejected > 0 && <span className="text-rose-400">{clipper.rejected} rejected</span>}<span className="text-zinc-400">{clipper.views.toLocaleString()} views</span></div></Link>)}</div></section>
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]"><div className="border-b border-white/10 px-6 py-5"><h2 className="text-xl font-semibold">All submissions</h2></div><div className="divide-y divide-white/5">{submissions.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-4 px-6 py-4"><div className="min-w-0 flex-1"><p className="font-medium text-white">{item.clipperName || item.clipperEmail}</p><p className="text-sm text-zinc-500">@{item.clipperUsername} · {item.platform}</p></div><span className="text-sm text-zinc-400">{Number(item.views || 0).toLocaleString()} views</span><span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</span><span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || "bg-zinc-500/10 text-zinc-400"}`}>{titleCase(item.status)}</span></div>)}</div></section></>}
  </div>;
}

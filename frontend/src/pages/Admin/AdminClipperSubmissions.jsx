import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileVideo, CheckCircle2, Clock3, Eye } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";

const STATUS_STYLES = { pending: "bg-amber-500/10 text-amber-400", approved: "bg-emerald-500/10 text-emerald-400", rejected: "bg-rose-500/10 text-rose-400" };
const titleCase = (value) => String(value || "").replace(/^./, (letter) => letter.toUpperCase());

export default function AdminClipperSubmissions() {
  const { username } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api(`/api/content/campaign-submissions/?clipper=${encodeURIComponent(username)}`)
      .then((response) => active && setSubmissions(response.results || response || []))
      .catch((requestError) => active && setError(requestError.message || "Unable to load this clipper."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [username]);

  const stats = useMemo(() => ({ total: submissions.length, approved: submissions.filter((item) => item.status === "approved").length, pending: submissions.filter((item) => item.status === "pending").length, views: submissions.reduce((sum, item) => sum + Number(item.views || 0), 0), campaigns: new Set(submissions.map((item) => item.campaignId)).size }), [submissions]);
  const clipper = submissions[0];

  return <div className="min-h-screen bg-black text-white"><Breadcrumbs />
    <Link to="/admin/submissions" className="mt-6 inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white"><ArrowLeft size={14} />Back to Submission Queue</Link>
    <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8"><h1 className="text-4xl font-bold">{clipper?.clipperName || username}</h1><p className="mt-2 text-sm text-zinc-400">@{clipper?.clipperUsername || username}</p>{clipper?.clipperEmail && <p className="mt-1 text-sm text-zinc-500">{clipper.clipperEmail}</p>}</section>
    {loading && <p className="mt-6 text-zinc-400">Loading clipper data...</p>}{!loading && error && <p className="mt-6 text-rose-400">{error}</p>}
    {!loading && !error && <><section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">{[{ label: "Total Submissions", value: stats.total, icon: FileVideo, color: "text-violet-400" }, { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-400" }, { label: "Pending", value: stats.pending, icon: Clock3, color: "text-amber-400" }, { label: "Total Views", value: stats.views.toLocaleString(), icon: Eye, color: "text-cyan-400" }].map(({ label, value, icon: Icon, color }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"><Icon size={17} className={color} /><h3 className="mt-3 text-3xl font-bold">{value}</h3><p className="mt-1 text-sm text-zinc-500">{label}</p></div>)}</section>
      <p className="mt-6 text-sm text-zinc-500">Submitted to {stats.campaigns} campaign{stats.campaigns === 1 ? "" : "s"}.</p>
      <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.03]"><div className="border-b border-white/10 px-6 py-5"><h2 className="text-xl font-semibold">All submissions</h2></div>{submissions.length === 0 ? <p className="p-6 text-zinc-400">No submissions found for this clipper.</p> : <div className="divide-y divide-white/5">{submissions.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-4 px-6 py-4"><div className="min-w-0 flex-1"><Link to={`/admin/campaigns/${item.campaignId}`} className="font-medium text-white hover:text-violet-300 hover:underline">{item.campaignTitle}</Link><p className="text-sm text-zinc-500">{item.platform}</p></div><span className="text-sm text-zinc-400">{Number(item.views || 0).toLocaleString()} views</span><span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</span><span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status] || "bg-zinc-500/10 text-zinc-400"}`}>{titleCase(item.status)}</span></div>)}</div>}</section></>}
  </div>;
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Layers, Users, FileVideo, Wallet } from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";

const OWNER_STYLES = { campaign: "bg-cyan-500/10 text-cyan-300", gig: "bg-violet-500/10 text-violet-300" };
const titleCase = (value) => String(value || "").replace(/^./, (letter) => letter.toUpperCase());

export default function CampaignSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/api/content/campaign-submissions/")
      .then((response) => active && setSubmissions(response.results || response || []))
      .catch((requestError) => active && setError(requestError.message || "Unable to load campaign submissions."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const campaigns = useMemo(() => {
    const grouped = new Map();
    for (const item of submissions) {
      if (!item.campaignId) continue;
      if (!grouped.has(item.campaignId)) grouped.set(item.campaignId, { id: item.campaignId, title: item.campaignTitle || "Untitled campaign", ownerName: item.brandName || "Unknown owner", ownerType: item.campaignType || "campaign", category: item.campaignCategory || "Uncategorised", budget: Number(item.campaignBudget || 0), items: [] });
      grouped.get(item.campaignId).items.push(item);
    }
    return Array.from(grouped.values()).map((campaign) => ({ ...campaign, total: campaign.items.length, clippers: new Set(campaign.items.map((item) => item.clipperId)).size, pending: campaign.items.filter((item) => item.status === "pending").length, approved: campaign.items.filter((item) => item.status === "approved").length, rejected: campaign.items.filter((item) => item.status === "rejected").length }));
  }, [submissions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? campaigns.filter((campaign) => `${campaign.title} ${campaign.ownerName} ${campaign.category}`.toLowerCase().includes(query)) : campaigns;
  }, [campaigns, search]);

  return <div className="min-h-screen bg-black text-white"><Breadcrumbs />
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8"><span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">Admin Panel</span><h1 className="mt-5 text-4xl font-bold">Campaign Submissions</h1><p className="mt-4 max-w-2xl leading-7 text-zinc-400">Real submission activity grouped by campaign.</p></section>
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6"><label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Search</label><div className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by campaign or owner..." className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500" /></div></section>
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]"><div className="border-b border-white/10 px-6 py-5"><h2 className="text-xl font-semibold">Campaigns</h2><p className="mt-1 text-sm text-zinc-400">Select a campaign to review its real submissions.</p></div>
      {loading && <p className="p-8 text-zinc-400">Loading campaigns...</p>}{!loading && error && <p className="p-8 text-rose-400">{error}</p>}{!loading && !error && filtered.length === 0 && <div className="flex flex-col items-center justify-center py-20"><Layers size={48} className="mb-4 text-zinc-600" /><h3 className="text-xl font-semibold">No campaigns found</h3></div>}
      {!loading && !error && filtered.length > 0 && <div className="divide-y divide-white/5">{filtered.map((campaign) => <Link key={campaign.id} to={`/admin/campaigns/${campaign.id}`} className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.03] sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-white">{campaign.title}</h4><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OWNER_STYLES[campaign.ownerType] || OWNER_STYLES.campaign}`}>{titleCase(campaign.ownerType)}</span></div><p className="mt-1 text-sm text-zinc-400">{campaign.ownerName} · {campaign.category}</p></div><div className="flex flex-wrap items-center gap-5 text-sm text-zinc-300"><span className="flex items-center gap-1.5"><FileVideo size={14} className="text-zinc-500" />{campaign.total} submissions</span><span className="flex items-center gap-1.5"><Users size={14} className="text-zinc-500" />{campaign.clippers} clippers</span><span className="flex items-center gap-1.5"><Wallet size={14} className="text-zinc-500" />₹{campaign.budget.toLocaleString()} budget</span></div><div className="flex shrink-0 gap-2">{campaign.pending > 0 && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">{campaign.pending} pending</span>}<span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">{campaign.approved} approved</span>{campaign.rejected > 0 && <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400">{campaign.rejected} rejected</span>}</div></Link>)}</div>}
    </section>
  </div>;
}

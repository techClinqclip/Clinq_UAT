import { useState } from "react";
import {
  ArrowLeft,
  IndianRupee,
  Clock3,
  ExternalLink,
  CheckCircle,
  FileText,
  Link2,
  Plus,
  Trash2,
  Check,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";



const opportunity = {
  id: 1,
  title: "Wireless Earbuds UGC",
  brand: "SoundMax",
  category: "Tech",
  reward: "₹2,500",
  totalDays: 14,
  daysLeft: 7,

  requirements: [
    "Show product in daily use",
    "Mention battery life",
    "Mention sound quality",
    "Vertical video only (9:16)",
  ],

  deliverables: ["5 Videos", "15-30 seconds each", "1080x1920 resolution"],

  resources: [
    { name: "Brand Guidelines", url: "https://drive.google.com/example-guidelines" },
    { name: "Product Assets", url: "https://drive.google.com/example-assets" },
  ],
};

const URGENCY = {
  low: { bar: "bg-emerald-400", text: "text-emerald-400" },
  medium: { bar: "bg-amber-400", text: "text-amber-400" },
  high: { bar: "bg-red-400", text: "text-red-400" },
};
const getUrgency = (pct) => (pct >= 75 ? "high" : pct >= 50 ? "medium" : "low");

export default function OpportunityDetails() {
  const [applied, setApplied] = useState(false);
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const elapsedPct = Math.min(
    100,
    Math.round(((opportunity.totalDays - opportunity.daysLeft) / opportunity.totalDays) * 100)
  );
  const urgency = URGENCY[getUrgency(elapsedPct)];

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    setLinks((l) => [...l, { id: Date.now(), url }]);
    setLinkInput("");
  };

  const removeLink = (id) => setLinks((l) => l.filter((link) => link.id !== id));

  const handleApply = () => {
    // TODO: POST /opportunities/:id/apply
    setApplied(true);
  };

  const handleSubmit = async () => {
    if (links.length === 0) return;
    setIsSubmitting(true);
    // TODO: POST /opportunities/:id/submissions { links }
    await new Promise((r) => setTimeout(r, 700));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="space-y-8">
      <Breadcrumbs overrides={{ Opportunity: opportunity.title }} />

      {/* Back */}
      <Link
        to="/creator/opportunities"
        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Opportunities
      </Link>

      {/* Hero */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
              {opportunity.category}
            </span>
            <h1 className="mt-4 text-4xl font-bold text-white">{opportunity.title}</h1>
            <p className="mt-2 text-zinc-400">{opportunity.brand}</p>
          </div>

          <button
            onClick={handleApply}
            disabled={applied}
            className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-medium transition ${
              applied
                ? "cursor-default bg-emerald-500/15 text-emerald-400"
                : "bg-violet-600 text-white hover:bg-violet-500"
            }`}
          >
            {applied && <Check size={18} />}
            {applied ? "Applied" : "Apply Now"}
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
          <div className="flex items-center gap-3">
            <IndianRupee className="text-green-400" />
            <span className="text-zinc-400">Reward</span>
          </div>
          <h2 className="mt-4 text-4xl font-bold text-green-400">{opportunity.reward}</h2>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#11111A] p-6">
          <div className="flex items-center gap-3">
            <Clock3 className="text-yellow-400" />
            <span className="text-zinc-400">Deadline</span>
          </div>
          <h2 className="mt-4 text-4xl font-bold text-white">{opportunity.daysLeft} Days Left</h2>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Time elapsed</span>
              <span className={`font-semibold ${urgency.text}`}>{elapsedPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full ${urgency.bar} transition-all duration-500`}
                style={{ width: `${elapsedPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Requirements</h2>
        <div className="mt-6 space-y-3">
          {opportunity.requirements.map((item) => (
            <div key={item} className="flex items-center gap-3 text-zinc-300">
              <CheckCircle size={18} className="text-violet-400" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Deliverables */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Deliverables</h2>
        <div className="mt-6 space-y-3">
          {opportunity.deliverables.map((item) => (
            <div key={item} className="flex items-center gap-3 text-zinc-300">
              <FileText size={18} className="text-violet-400" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Resources */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <h2 className="text-2xl font-bold text-white">Resources</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {opportunity.resources.map((resource) => (
            <a
              key={resource.name}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-2xl border border-white/10 p-5 transition hover:border-violet-500/30"
            >
              <span className="text-white">{resource.name}</span>
              <ExternalLink size={18} className="text-violet-400" />
            </a>
          ))}
        </div>
      </section>

      {/* Submit Your Content — merges the old Submission Status + Upload sections */}
      <section className="rounded-3xl border border-white/10 bg-[#11111A] p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-white">Submit Your Content</h2>
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              submitted
                ? "bg-blue-500/10 text-blue-400"
                : applied
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-zinc-500/10 text-zinc-400"
            }`}
          >
            {submitted ? "Under Review" : applied ? "Not Submitted" : "Not Applied"}
          </span>
        </div>

        {!applied ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-6 text-zinc-500">
            <Lock size={18} />
            Apply to this opportunity to unlock content submission.
          </div>
        ) : submitted ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-zinc-400">
              {links.length} link{links.length === 1 ? "" : "s"} submitted — {opportunity.brand} will review
              your content soon.
            </p>
            {links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-violet-500/30"
              >
                <span className="truncate text-sm text-zinc-300">{link.url}</span>
                <ExternalLink size={15} className="shrink-0 text-violet-400" />
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <p className="text-sm text-zinc-500">
              Paste a link to your posted content (YouTube, Instagram, TikTok, X) or a Drive link for raw
              footage — one per deliverable.
            </p>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLink()}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-[#0B0B12] py-3 pl-11 pr-4 text-white outline-none focus:border-violet-500"
                />
              </div>
              <button
                onClick={addLink}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-white transition hover:bg-violet-500"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            {links.length > 0 && (
              <div className="space-y-3">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <span className="truncate text-sm text-zinc-300">{link.url}</span>
                    <button onClick={() => removeLink(link.id)} className="shrink-0">
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={links.length === 0 || isSubmitting}
              className="w-full rounded-xl bg-violet-600 px-5 py-3.5 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {isSubmitting ? "Submitting…" : "Submit for Review"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  CircleDollarSign,
  CheckCircle2,
  LifeBuoy,
  ArrowRight,
  Clock3,
  AlertTriangle,
} from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import useCurrentUser from "../../hooks/useCurrentUser";
import { api } from "../../lib/api";

/*
  Admin — overview/home. Summarizes the sections from the spec sheet
  and gives quick links into each. Numbers here are mock — wire each
  card's `value` to its real endpoint once the backend queues exist
  (same data each section's own page will eventually fetch).

  Payout Eligibility was folded into Pending Amt. Approval (the
  1,000-view threshold is just an upstream gate on the same review),
  so its dashboard tile and quick link are gone. In its place, "Paid
  Out" tracks payouts that have actually been released — a distinct
  number from "Pending Payout Approvals", which is money still
  waiting on a decision.
*/

// TEMP: forces a mock admin name so you can preview the "Good
// morning, X" greeting before real backend admin sessions exist.
// Set to false (or delete this block + the ternary below) once
// useCurrentUser() actually returns a real logged-in admin.
const MOCK_PREVIEW_USER = { name: "Ananya Sharma" };

const SUMMARY_CARDS = [
  {
    label: "Pending Submissions",
    value: 4,
    hint: "Awaiting first review",
    icon: ClipboardCheck,
    accent: "violet",
    to: "/admin/submissions",
  },
  {
    label: "Pending Payout Approvals",
    value: "₹2,970",
    hint: "Across 4 clippers",
    icon: CircleDollarSign,
    accent: "amber",
    to: "/admin/pending-approvals",
  },
  {
    label: "Paid Out",
    value: "₹445",
    hint: "Released this week",
    icon: CheckCircle2,
    accent: "emerald",
    to: "/admin/pending-approvals",
  },
  {
    label: "Open Support Tickets",
    value: 5,
    hint: "2 marked urgent",
    icon: LifeBuoy,
    accent: "rose",
    to: "/admin/support",
  },
];

const QUICK_LINKS = [
  {
    title: "Submission Queue",
    body: "Review clip submissions against campaign requirements before they count toward stats.",
    icon: ClipboardCheck,
    accent: "violet",
    to: "/admin/submissions",
  },
  {
    title: "Pending Amt. Approval",
    body: "Verify pending payouts against current stats and the campaign's CAP before release.",
    icon: CircleDollarSign,
    accent: "amber",
    to: "/admin/pending-approvals",
  },
  {
    title: "Support Tickets",
    body: "Respond to and resolve open tickets from brands, creators, and clippers.",
    icon: LifeBuoy,
    accent: "rose",
    to: "/admin/support",
  },
];

const RECENT_ACTIVITY = [
  { text: "Approved submission from Devika Rao — Study With Me Clips", time: "12 minutes ago", tone: "emerald" },
  { text: "Rejected submission from Yash Kapoor — Fitness Motivation", time: "1 hour ago", tone: "rose" },
  { text: "Released ₹290 payout to Priya Nair", time: "3 hours ago", tone: "emerald" },
  { text: "New support ticket: \"Payout stuck in pending\"", time: "5 hours ago", tone: "amber" },
];

const ACCENTS = {
  violet: { iconBg: "bg-violet-500/10", iconText: "text-violet-400", ring: "hover:border-violet-500/30" },
  amber: { iconBg: "bg-amber-500/10", iconText: "text-amber-400", ring: "hover:border-amber-500/30" },
  emerald: { iconBg: "bg-emerald-500/10", iconText: "text-emerald-400", ring: "hover:border-emerald-500/30" },
  rose: { iconBg: "bg-rose-500/10", iconText: "text-rose-400", ring: "hover:border-rose-500/30" },
};

const DOT_TONES = {
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
  amber: "bg-amber-400",
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name) {
  if (!name || name === "User") return null;
  return name.split(" ")[0];
}

export default function AdminDashboard() {
  const realUser = useCurrentUser();
  const [dashboardData, setDashboardData] = useState(null);
  const [loadError, setLoadError] = useState("");
  // TEMP: falls back to the mock user only if the real hook has no
  // name yet (guest/unauthenticated). Once real admin sessions exist,
  // realUser.name will populate and this fallback stops mattering —
  // safe to leave in, or delete MOCK_PREVIEW_USER entirely.
  const user = firstName(realUser?.name) ? realUser : MOCK_PREVIEW_USER;
  const name = firstName(user?.name);

  useEffect(() => {
    let active = true;
    api("/api/content/campaigns/admin-dashboard/")
      .then((data) => { if (active) setDashboardData(data); })
      .catch((error) => { if (active) setLoadError(error.message || "Unable to load admin dashboard data."); });
    return () => { active = false; };
  }, []);

  const summaryCards = dashboardData ? [
    { ...SUMMARY_CARDS[0], value: dashboardData.pending_submissions },
    { ...SUMMARY_CARDS[1], value: `₹${Number(dashboardData.pending_payout_amount || 0).toLocaleString()}`, hint: `Across ${dashboardData.pending_payout_clippers || 0} clippers` },
    { ...SUMMARY_CARDS[2], value: `₹${Number(dashboardData.paid_out || 0).toLocaleString()}`, hint: "Released from approved submissions" },
    { ...SUMMARY_CARDS[3], value: dashboardData.open_support_tickets, hint: `${dashboardData.urgent_support_tickets || 0} marked urgent` },
  ] : SUMMARY_CARDS.map((card) => ({ ...card, value: "..." }));
  const recentActivity = dashboardData?.recent_activity || [];

  return (
    <div className="min-h-screen bg-black text-white">
      <Breadcrumbs />

      {/* Hero */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
          Admin Panel
        </span>
        <h1 className="mt-5 text-4xl font-bold">
          {name ? `${getGreeting()}, ${name}` : "Overview"}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Everything that needs an admin's eyes, in one place — submissions, payouts, and support.
        </p>
      </section>

      {/* Summary cards */}
      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, hint, icon: Icon, accent, to }) => {
          const a = ACCENTS[accent];
          return (
            <Link
              key={label}
              to={to}
              className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition ${a.ring}`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                <Icon size={17} className={a.iconText} />
              </div>
              <h3 className="mt-3 text-3xl font-bold">{value}</h3>
              <p className="mt-1 text-sm text-zinc-500">{label}</p>
              <p className="mt-2 text-xs text-zinc-600">{hint}</p>
            </Link>
          );
        })}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Quick links */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">Sections</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {QUICK_LINKS.map(({ title, body, icon: Icon, accent, to }) => {
              const a = ACCENTS[accent];
              return (
                <Link
                  key={title}
                  to={to}
                  className={`group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition ${a.ring}`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                    <Icon size={16} className={a.iconText} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 flex-1 text-xs leading-5 text-zinc-500">{body}</p>
                  <span className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${a.iconText}`}>
                    Open
                    <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent activity */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2">
            <Clock3 size={16} className="text-zinc-500" />
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          <div className="mt-5 space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES[item.tone]}`} />
                <div className="min-w-0">
                  <p className="text-sm leading-5 text-zinc-300">{item.text}</p>
                  <p className="mt-0.5 text-xs text-zinc-600">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {loadError && <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">{loadError}</div>}
          {!loadError && !dashboardData && <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-zinc-500">Loading live dashboard data...</div>}
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Live data from submissions, payouts, and support records.
          </div>
        </section>
      </div>
    </div>
  );
}
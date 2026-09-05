import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

/*
  Breadcrumbs — derives "Dashboard / Campaigns / ..." style trails from
  the current URL, using the route table below. Most pages need zero
  setup — just <Breadcrumbs /> and it figures out the trail from
  location.pathname.

  For pages sitting on a dynamic id (a campaign, a clipper, a clip),
  the table can only show a generic label like "Campaign" since it has
  no way to know the real title. Pages that DO know the real name
  (because they've fetched/mocked it) can override specific crumbs:

    <Breadcrumbs overrides={{ Campaign: campaign.title }} />

  `overrides` maps a default label to the real one, wherever it appears
  in the trail — simpler than wiring index-based overrides, and reads
  clearly at the call site.
*/

const ROUTES = [
  { test: /^\/brand\/campaigns\/?$/, crumbs: () => [{ label: "Campaigns" }] },
  { test: /^\/brand\/campaigns\/create\/?$/, crumbs: () => [
    { label: "Campaigns", to: "/brand/campaigns" },
    { label: "Create Campaign" },
  ] },
  { test: /^\/brand\/campaigns\/([^/]+)\/edit\/?$/, crumbs: (m) => [
    { label: "Campaigns", to: "/brand/campaigns" },
    { label: "Campaign", to: `/brand/campaigns/${m[1]}` },
    { label: "Edit" },
  ] },
  { test: /^\/brand\/campaigns\/([^/]+)\/clippers\/([^/]+)\/?$/, crumbs: (m) => [
    { label: "Campaigns", to: "/brand/campaigns" },
    { label: "Campaign", to: `/brand/campaigns/${m[1]}` },
    { label: "Submissions" },
  ] },
  { test: /^\/brand\/campaigns\/([^/]+)\/?$/, crumbs: () => [
    { label: "Campaigns", to: "/brand/campaigns" },
    { label: "Campaign" },
  ] },
  { test: /^\/brand\/clips\/([^/]+)\/?$/, crumbs: () => [{ label: "Clip Details" }] },
  { test: /^\/brand\/analytics\/?$/, crumbs: () => [{ label: "Analytics" }] },
  { test: /^\/brand\/budget\/?$/, crumbs: () => [{ label: "Budget" }] },
  { test: /^\/brand\/payouts\/?$/, crumbs: () => [{ label: "Payouts" }] },
  { test: /^\/brand\/profile\/?$/, crumbs: () => [{ label: "Profile" }] },
  { test: /^\/brand\/support\/?$/, crumbs: () => [{ label: "Support" }] },

 /* ---------------- CREATOR ---------------- */

{ test: /^\/creator\/gigs\/?$/, crumbs: () => [
  { label: "Gigs" },
] },

{ test: /^\/creator\/gigs\/create\/?$/, crumbs: () => [
  { label: "Gigs", to: "/creator/gigs" },
  { label: "Create Gig" },
] },

{ test: /^\/creator\/gigs\/([^/]+)\/edit\/?$/, crumbs: (m) => [
  { label: "Gigs", to: "/creator/gigs" },
  { label: "Gig", to: `/creator/gigs/${m[1]}` },
  { label: "Edit" },
] },

{ test: /^\/creator\/gigs\/([^/]+)\/?$/, crumbs: () => [
  { label: "Gigs", to: "/creator/gigs" },
  { label: "Gig" },
] },

{ test: /^\/creator\/opportunities\/?$/, crumbs: () => [
  { label: "Brand Deals" },
] },

{ test: /^\/creator\/opportunities\/([^/]+)\/?$/, crumbs: () => [
  { label: "Brand Deals", to: "/creator/opportunities" },
  { label: "Opportunity" },
] },

{ test: /^\/creator\/submissions\/?$/, crumbs: () => [
  { label: "My Submissions" },
] },

{ test: /^\/creator\/profile\/?$/, crumbs: () => [
  { label: "Profile" },
] },

{ test: /^\/creator\/support\/?$/, crumbs: () => [
  { label: "Support" },
] },

  { test: /^\/clipper\/discover\/?$/, crumbs: () => [{ label: "Discover" }] },
  { test: /^\/clipper\/earnings\/?$/, crumbs: () => [{ label: "Earnings" }] },
  { test: /^\/clipper\/profile\/?$/, crumbs: () => [{ label: "Profile" }] },
  { test: /^\/clipper\/support\/?$/, crumbs: () => [{ label: "Support" }] },
  { test: /^\/clipper\/gigs\/?$/, crumbs: () => [
    { label: "My Gigs" },
  ] },
  
  { test: /^\/clipper\/gigs\/([^/]+)\/?$/, crumbs: () => [
    { label: "My Gigs", to: "/clipper/gigs" },
    { label: "Gig" },
  ] },

  /* ---------------- ADMIN ---------------- */

  { test: /^\/admin\/?$/, crumbs: () => [{ label: "Overview" }] },
  { test: /^\/admin\/dashboard\/?$/, crumbs: () => [{ label: "Overview" }] },

  { test: /^\/admin\/submissions\/?$/, crumbs: () => [
    { label: "Submission Queue" },
  ] },

  { test: /^\/admin\/pending-approvals\/?$/, crumbs: () => [
    { label: "Pending Amt. Approval" },
  ] },

  { test: /^\/admin\/payouts\/?$/, crumbs: () => [
    { label: "Payout Eligibility" },
  ] },

  { test: /^\/admin\/support\/?$/, crumbs: () => [
    { label: "Support Tickets" },
  ] },

  { test: /^\/admin\/campaigns\/?$/, crumbs: () => [
    { label: "Campaign Submissions" },
  ] },

  { test: /^\/admin\/campaigns\/([^/]+)\/?$/, crumbs: () => [
    { label: "Campaign Submissions", to: "/admin/campaigns" },
    { label: "Campaign" },
  ] },

  { test: /^\/admin\/clippers\/([^/]+)\/?$/, crumbs: () => [
    { label: "Clipper" },
  ] },

];

function getDashboardHome(pathname) {
  if (pathname.startsWith("/admin")) return { label: "Admin", to: "/admin/dashboard" };
  if (pathname.startsWith("/creator")) return { label: "Dashboard", to: "/creator/dashboard" };
  if (pathname.startsWith("/clipper")) return { label: "Dashboard", to: "/clipper/dashboard" };
  return { label: "Dashboard", to: "/brand/dashboard" };
}

export default function Breadcrumbs({ overrides = {} }) {
  const { pathname } = useLocation();

  const route = ROUTES.find((r) => r.test.test(pathname));
  const match = route ? pathname.match(route.test) : null;
  const pageCrumbs = route ? route.crumbs(match) : [];

  const applied = pageCrumbs.map((c) => (overrides[c.label] ? { ...c, label: overrides[c.label] } : c));
  const allCrumbs = [{ ...getDashboardHome(pathname), isHome: true }, ...applied];

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm">
      {allCrumbs.map((crumb, i) => {
        const isLast = i === allCrumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-zinc-700" />}
            {isLast ? (
              <span className="flex items-center gap-1.5 font-medium text-white">
                {crumb.isHome && <Home size={13} className="text-violet-400" />}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.to}
                className="flex items-center gap-1.5 text-zinc-500 transition hover:text-violet-400"
              >
                {crumb.isHome && <Home size={13} />}
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
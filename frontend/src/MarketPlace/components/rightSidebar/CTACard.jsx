import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import useCurrentUser from "../../../hooks/useCurrentUser";

const ROLE_CONFIG = {
  brand: {
    heading: "Running a brand?",
    body: "Launch a campaign and reach thousands of creators in minutes.",
    action: "Create a Campaign",
    route: "/brand/campaigns/create",
  },
  creator: {
    heading: "Have a service to offer?",
    body: "Create a gig and let brands find and hire you directly.",
    action: "Create a Gig",
    route: "/creator/gigs/create",
  },
};

const CLIPPER_CONFIG = {
  heading: "Looking for campaigns?",
  body: "Browse the campaigns below and join the ones that fit your content.",
  action: null,
};

export default function CTACard() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const role = String(user?.role || "").toLowerCase();

  const config = ROLE_CONFIG[role];

  if (!config) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-zinc-700/40 bg-zinc-900/40 p-5">
        <div className="flex items-start gap-3">
          <Search size={18} className="mt-0.5 shrink-0 text-zinc-500" />
          <div>
            <h3 className="text-sm font-semibold text-white">{CLIPPER_CONFIG.heading}</h3>
            <p className="mt-1 text-sm text-zinc-400">{CLIPPER_CONFIG.body}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/5 to-transparent p-5">
      <h3 className="text-base font-semibold text-white">{config.heading}</h3>
      <p className="mt-1.5 text-sm text-zinc-400">{config.body}</p>
      <button
        type="button"
        onClick={() => navigate(config.route)}
        className="mt-4 flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200"
      >
        {config.action}
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}
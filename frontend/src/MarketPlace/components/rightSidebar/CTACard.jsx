import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, X, ShieldAlert } from "lucide-react";
import useCurrentUser from "../../../hooks/useCurrentUser";

const ROLE_ROUTES = {
  brand: "/brand/campaigns/create",
  creator: "/creator/gigs/create",
};

export default function CTACard() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [showGate, setShowGate] = useState(false);

  const handleCreateCampaign = () => {
    const route = ROLE_ROUTES[user.role];
    if (route) {
      navigate(route);
    } else {
      setShowGate(true);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-fuchsia-500/5 to-transparent p-5">
        <h3 className="text-base font-semibold text-white">Running a brand?</h3>
        <p className="mt-1.5 text-sm text-zinc-400">
          Launch a campaign and reach thousands of creators in minutes.
        </p>
        <button
          type="button"
          onClick={handleCreateCampaign}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200"
        >
          Create a Campaign
          <ArrowUpRight size={14} />
        </button>
      </div>

      {showGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowGate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#11111A] p-6 text-center shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowGate(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <ShieldAlert size={22} className="text-amber-400" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-white">Brands &amp; Creators only</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Creating a campaign is only available for Brand and Creator accounts.
              Your account is currently set up as a{" "}
              <span className="font-medium capitalize text-zinc-200">{user.role}</span>.
            </p>

            <button
              type="button"
              onClick={() => setShowGate(false)}
              className="mt-5 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
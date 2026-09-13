import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { clearAuthStorage } from "../lib/api";
import ConfirmModal from "../shared/ui/ComfirmModal";

export default function OnboardingLogout() {
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);

  const confirmLogout = () => {
    setIsConfirming(false);
    clearAuthStorage();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-400 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 md:px-3 md:py-1.5 md:text-xs"
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">Log out</span>
      </button>

      <ConfirmModal
        open={isConfirming}
        title="Log out of onboarding?"
        description="Your completed details are saved, but unfinished changes on this screen will be lost. You can sign in again to continue onboarding."
        icon={LogOut}
        color="red"
        confirmText="Log out"
        onCancel={() => setIsConfirming(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}

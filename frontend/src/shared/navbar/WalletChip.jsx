import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Plus } from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser";
import { api } from "../../lib/api";
import AddFundsModal from "../../pages/Brand/components/AddFundsModal";

const formatBalance = (n) =>
  new Intl.NumberFormat("en-IN").format(Number.isFinite(n) ? n : 0);

const EARNINGS_ROUTE_BY_ROLE = {
  clipper: "/clipper/earnings",
  brand: "/brand/payouts",
  creator: "/creator/analytics",
};

export default function WalletChip() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState(null);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const role = String(user?.role || user?.user_type || "").toLowerCase();
  const isBrand = role === "brand";
  const isCreator = role === "creator";

  const savedMethod = (() => {
    const method = profile?.payment_method || profile?.onboarding_data?.paymentMethod;
    if (method === "upi") {
      const detail = profile?.upi_id || profile?.onboarding_data?.upiId;
      return detail ? { method, label: "UPI", detail } : null;
    }
    if (method === "bank" || method === "bank_transfer") {
      const detail = profile?.bank_name || profile?.onboarding_data?.bankName;
      return detail ? { method: "bank", label: "Bank Transfer", detail } : null;
    }
    return null;
  })();

  useEffect(() => {
    let active = true;

    async function loadBalance() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        if (active) setBalance(0);
        return;
      }

      try {
        const data = isBrand
          ? await api("/api/earnings/wallet/")
          : await api("/api/earnings/overview/");

        const nextBalance = Number(
          isBrand
            ? data?.wallet_balance ?? data?.walletBalance ?? 0
            : data?.available_balance ?? data?.total_earnings ?? 0
        );

        if (active) setBalance(nextBalance);
      } catch {
        if (active) setBalance(0);
      }
    }

    loadBalance();
    return () => {
      active = false;
    };
  }, [user?.role, user?.user_type, user?.email]);

  useEffect(() => {
    if (!isBrand) return undefined;
    let active = true;
    api("/api/auth/profile/me/", { cache: "no-store" })
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [isBrand]);

  const handleGoToEarnings = () => {
    const route = EARNINGS_ROUTE_BY_ROLE[role] || "/marketplace";
    navigate(route);
  };

  const handleAddFunds = (e) => {
    e.stopPropagation();
    setAddFundsOpen(true);
  };

  if (isCreator) return null;

  return (
    <>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-2 pl-3 pr-2 transition hover:border-white/20 hover:bg-white/10">
      <button
        type="button"
        onClick={handleGoToEarnings}
        className="flex items-center gap-2 text-sm font-medium text-white"
      >
        <Wallet size={15} className="text-emerald-400" />
        ₹{formatBalance(balance)}
      </button>

      {isBrand && (
        <button
          type="button"
          onClick={handleAddFunds}
          title="Add funds to wallet"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 transition hover:bg-violet-500"
        >
          <Plus size={13} />
        </button>
      )}
      </div>
      {isBrand && (
        <AddFundsModal
          isOpen={addFundsOpen}
          onClose={() => setAddFundsOpen(false)}
          onSuccess={(amount) => setBalance((current) => current + Number(amount || 0))}
          savedMethod={savedMethod}
        />
      )}
    </>
  );
}
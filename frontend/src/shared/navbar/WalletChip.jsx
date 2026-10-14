import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Wallet, Plus } from "lucide-react";
import useCurrentUser from "../../hooks/useCurrentUser";
import { api } from "../../lib/api";
import AddFundsModal from "../wallet/AddFundsModal";
import {
  notifyWalletBalanceChanged,
  subscribeWalletBalanceChanged,
} from "../wallet/walletBalanceEvents";

const formatBalance = (n) =>
  new Intl.NumberFormat("en-IN").format(Number.isFinite(n) ? n : 0);

const EARNINGS_ROUTE_BY_ROLE = {
  clipper: "/clipper/earnings",
  brand: "/brand/earnings",
  creator: "/creator/analytics",
};

export default function WalletChip() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const [balance, setBalance] = useState(0);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  const role = String(user?.role || user?.user_type || "").toLowerCase();
  const isBrand = role === "brand";
  const isCreator = role === "creator";

  const loadBalance = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setBalance(0);
      return;
    }

    try {
      const data = isBrand || isCreator
        ? await api("/api/earnings/wallet/")
        : await api("/api/earnings/overview/");

      const nextBalance = Number(
        isBrand || isCreator
          ? data?.wallet_balance ?? data?.walletBalance ?? 0
          : data?.available_balance ?? data?.total_earnings ?? 0
      );
      setBalance(nextBalance);
    } catch {
      setBalance(0);
    }
  };

  useEffect(() => {
    loadBalance();
  }, [user?.role, user?.user_type, user?.email, isBrand, isCreator, location.pathname]);

  useEffect(() => {
    return subscribeWalletBalanceChanged((detail) => {
      if (typeof detail?.walletBalance === "number") {
        setBalance(detail.walletBalance);
        return;
      }
      loadBalance();
    });
  }, [isBrand, isCreator]);

  useEffect(() => {
    const onFocus = () => loadBalance();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [isBrand, isCreator]);

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
          onSuccess={(result) => {
            if (typeof result?.walletBalance === "number") {
              setBalance(result.walletBalance);
              notifyWalletBalanceChanged(result.walletBalance);
            } else {
              loadBalance();
              notifyWalletBalanceChanged();
            }
          }}
        />
      )}
    </>
  );
}

import {
    Wallet,
    Lock,
    CircleDollarSign,
    ArrowUpCircle,
    ArrowDownCircle,
    ArrowRight,
    Plus,
    Smartphone,
    Building2,
    CreditCard,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import PayoutTrendChart from "./PayoutTrendChart"; // ADJUST to match this file's actual path
import LoadingScreen from "../../shared/ui/LoadingScreen"; // ADJUST to match this file's actual path
import AddFundsModal from "./Components/AddFundsModal";
import { api } from "../../lib/api"; // ADJUST to match this file's actual path

/*
  Brand Wallet — the spend-side counterpart to ClipperEarnings. Same
  visual language (hero / KPI row / chart / breakdown table / recent
  activity), but the underlying model is different: a brand doesn't
  earn and withdraw, it deposits and spends, and it has TWO balances
  to track rather than one —

    walletBalance      — free to spend on a new or existing campaign
    lockedInCampaigns   — already committed as budget to campaigns
                          that are currently running (not spent yet,
                          but not available either)

  CHANGE: swapped the old EarningsChartCard ("monthly spend", fixed
  month buckets) for the same trend chart + filter pattern used on the
  Budget page (PayoutTrendChart + 7D/30D/6M/ALL pills). Wallet doesn't
  get pre-bucketed period data from the API the way Budget does, so
  buildSpendTrendData() below buckets recent_transactions client-side:
  daily buckets for 7D/30D, monthly buckets for 6M/ALL. PayoutTrendChart
  is assumed to read {date, amount} per point — confirm against its
  actual implementation and adjust the field names if it expects
  something else (e.g. "period" instead of "date").
*/

const formatK = (n) => `${(n / 1000).toFixed(0)}K`;

const FILTERS = ["7D", "30D", "6M", "ALL"];

const isSpendTxn = (txn) => {
    const rawType = (txn?.transactionType ?? txn?.transaction_type ?? txn?.type ?? "").toString().toLowerCase();
    return rawType.includes("spend") || rawType.includes("withdraw") || rawType.includes("campaign");
};

const buildSpendTrendData = (transactions = [], filter) => {
    const now = new Date();

    const spendTxns = transactions
        .filter(isSpendTxn)
        .map((txn) => ({
            amount: Number(txn?.amount ?? 0),
            date: new Date(txn?.createdAt || txn?.created_at || txn?.date || 0),
        }))
        .filter((txn) => Number.isFinite(txn.date.getTime()) && txn.amount);

    if (filter === "7D" || filter === "30D") {
        const days = filter === "7D" ? 7 : 30;
        const buckets = Array.from({ length: days }, (_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (days - 1 - i));
            return {
                key: d.toDateString(),
                date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                amount: 0,
            };
        });

        spendTxns.forEach((txn) => {
            const diffDays = Math.floor((now - txn.date) / 86400000);
            if (diffDays < 0 || diffDays >= days) return;
            const bucket = buckets[days - 1 - diffDays];
            if (bucket) bucket.amount += txn.amount;
        });

        return buckets.map(({ date, amount }) => ({ date, amount }));
    }

    // 6M / ALL -> monthly buckets (ALL capped at trailing 12 months, since
    // we have no signal here for "account creation date" to bound it properly)
    const monthsBack = filter === "6M" ? 6 : 12;
    const buckets = Array.from({ length: monthsBack }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
        return { key: `${d.getFullYear()}-${d.getMonth()}`, date: d.toLocaleString("en-US", { month: "short" }), amount: 0 };
    });

    spendTxns.forEach((txn) => {
        const key = `${txn.date.getFullYear()}-${txn.date.getMonth()}`;
        const bucket = buckets.find((b) => b.key === key);
        if (bucket) bucket.amount += txn.amount;
    });

    return buckets.map(({ date, amount }) => ({ date, amount }));
};

// Mirrors buildInitialForm()'s field mapping in BrandProfile.jsx — this is
// intentionally reading the SAME raw API fields that page saves, so the
// two stay in sync without needing a shared import (they're on different
// slices of the app but describe the same underlying profile object).
function getSavedPaymentMethodDisplay(profile) {
    const method = profile?.payment_method || profile?.onboarding_data?.paymentMethod;
    if (!method) return null;

    if (method === "upi") {
        const upiId = profile?.upi_id || profile?.onboarding_data?.upiId;
        return upiId ? { method, label: "UPI", detail: upiId, icon: Smartphone } : null;
    }

    if (method === "bank") {
        const bankName = profile?.bank_name || profile?.onboarding_data?.bankName;
        const accountNumber = profile?.bank_account_number || profile?.onboarding_data?.bankAccountNumber;
        if (!bankName) return null;
        const last4 = accountNumber ? String(accountNumber).slice(-4) : "";
        return { method, label: "Bank Transfer", detail: `${bankName}${last4 ? ` •••• ${last4}` : ""}`, icon: Building2 };
    }

    if (method === "debit" || method === "credit") {
        const cardNumber = profile?.card_number || profile?.onboarding_data?.cardNumber;
        const last4 = cardNumber ? String(cardNumber).replace(/\D/g, "").slice(-4) : "";
        if (!last4) return null;
        return {
            method,
            label: method === "debit" ? "Debit Card" : "Credit Card",
            detail: `•••• ${last4}`,
            icon: CreditCard,
        };
    }

    return null;
}

export default function BrandWallet() {
    const [filter, setFilter] = useState("30D");
    const [addFundsOpen, setAddFundsOpen] = useState(false);
    const [walletData, setWalletData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLoader, setShowLoader] = useState(true);
    const [error, setError] = useState("");
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        let mounted = true;

        const loadWalletData = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await api("/api/earnings/wallet/");
                if (!mounted) return;
                setWalletData(data);
            } catch (err) {
                if (!mounted) return;
                setError(err?.message || "Failed to load wallet data");
                console.error("Wallet error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadWalletData();

        api("/api/auth/profile/me/", { cache: "no-store" })
            .then((data) => {
                if (mounted) setProfile(data);
            })
            .catch(() => {
                if (mounted) setProfile(null);
            });

        return () => {
            mounted = false;
        };
    }, []);

    const savedMethod = getSavedPaymentMethodDisplay(profile);
    const displayData = walletData || {
        wallet_balance: 0,
        locked_in_campaigns: 0,
        total_spent: 0,
        total_deposited: 0,
        campaigns_published: [],
        recent_transactions: [],
    };

    const activeSpendData = buildSpendTrendData(displayData.recent_transactions || [], filter);
    const totalSpendForPeriod = activeSpendData.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const hasTransactions = (displayData.recent_transactions || []).length > 0;

    const handleFundsAdded = (amount) => {
        setWalletData((current) => ({
            ...(current || {}),
            wallet_balance: Number(current?.wallet_balance || 0) + Number(amount || 0),
            total_deposited: Number(current?.total_deposited || 0) + Number(amount || 0),
            recent_transactions: [
                {
                    id: Date.now(),
                    transactionType: "deposit",
                    label: `Added via ${savedMethod?.label || "payment method"}`,
                    amount,
                    status: "Completed",
                    createdAt: new Date().toISOString(),
                },
                ...(current?.recent_transactions || []),
            ],
        }));
    };

    if (error) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Breadcrumbs />
                <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-red-400">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-black text-white">
            {showLoader && (
                <LoadingScreen
                    isReady={!loading}
                    onFinish={() => setShowLoader(false)}
                    messages={[
                        "Loading your wallet...",
                        "Fetching recent transactions...",
                        "Crunching your spend...",
                        "Almost there...",
                    ]}
                />
            )}

            {/* Ambient purple glow at the top of the page */}
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(139,92,246,0.25),transparent_70%)]" />

            <Breadcrumbs />

            {/* Hero */}
            <section className="mt-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
                        Brand Wallet
                    </span>

                    <h1 className="mt-5 text-4xl font-bold">Wallet</h1>

                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        Manage your balance, fund campaigns, and track spend across
                        every clipper and campaign you run.
                    </p>
                </div>

                <button
                    onClick={() => setAddFundsOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                >
                    <Plus size={18} />
                    Add Money
                </button>
            </section>

            {/* KPI Cards */}
            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet className="mb-4 text-emerald-400" size={28} />
                    <p className="text-sm text-zinc-500">Wallet Balance</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{Number(displayData.wallet_balance || 0).toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Available to spend</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Lock className="mb-4 text-amber-400" size={28} />
                    <p className="text-sm text-zinc-500">Locked in Campaigns</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{Number(displayData.locked_in_campaigns || 0).toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Reserved for active campaigns</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-violet-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Spent</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{Number(displayData.total_spent || 0).toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Lifetime, across all campaigns</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <ArrowUpCircle className="mb-4 text-sky-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Deposited</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{Number(displayData.total_deposited || 0).toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Lifetime, added to wallet</p>
                </div>
            </section>

            {/* Spend Overview — same trend chart + period pills as the Budget page */}
            <section className="relative mt-8 overflow-hidden rounded-3xl border border-violet-500/10 bg-gradient-to-br from-violet-600/10 to-transparent p-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-violet-400">Spend Overview</p>
                        <h3 className="mt-2 text-4xl font-bold text-white">₹{totalSpendForPeriod.toLocaleString()}</h3>
                        <p className="mt-2 text-zinc-500">Campaign spend trend · {filter}</p>
                    </div>

                    <div className="flex gap-2">
                        {FILTERS.map((period) => (
                            <button
                                key={period}
                                onClick={() => setFilter(period)}
                                className={`rounded-xl px-4 py-2 text-sm transition ${
                                    filter === period
                                        ? "bg-violet-600 text-white"
                                        : "border border-white/10 text-zinc-400 hover:border-violet-500/30 hover:text-white"
                                }`}
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-8 rounded-2xl border border-violet-500/20 bg-[#0B0B12] p-4">
                    <PayoutTrendChart data={activeSpendData} />
                </div>
            </section>

            {/* Campaign Spend */}
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div>
                    <h2 className="text-2xl font-semibold">Campaign Spend</h2>
                    <p className="mt-2 text-sm text-zinc-400">Breakdown of your budget and spend across every campaign.</p>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
                    <div className="custom-scrollbar max-h-[450px] overflow-y-auto">
                        <table className="min-w-full">
                            <thead className="sticky top-0 z-20 bg-[#11111A]/95 backdrop-blur-md">
                                <tr className="border-b border-white/10 text-left text-sm text-zinc-400">
                                    <th className="px-6 py-4">Campaign</th>
                                    <th className="px-6 py-4">Views</th>
                                    <th className="px-6 py-4">Clippers</th>
                                    <th className="px-6 py-4">Spent</th>
                                    <th className="px-6 py-4">Remaining Budget</th>
                                </tr>
                            </thead>

                            <tbody>
                                {(displayData.campaigns_published || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20">
                                            <div className="text-center">
                                                <Wallet className="mx-auto text-zinc-600" size={48} />
                                                <h3 className="mt-6 text-2xl font-semibold">No Campaigns Yet</h3>
                                                <p className="mt-3 text-zinc-500">
                                                    Create a campaign to start putting your budget to work.
                                                </p>
                                                <Link
                                                    to="/brand/campaigns/create"
                                                    className="mt-8 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                                                >
                                                    Create Campaign
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    (displayData.campaigns_published || []).map((campaign) => {
                                        const remaining = Number(campaign.budget || 0) - Number(campaign.spent || 0);
                                        const remainingLow = remaining > 0 && remaining < Number(campaign.budget || 0) * 0.1;
                                        return (
                                            <tr
                                                key={campaign.id}
                                                className="border-b border-white/5 transition hover:bg-white/[0.03]"
                                            >
                                                <td className="px-6 py-5">
                                                    <h4 className="font-semibold">{campaign.title || campaign.name}</h4>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                                String(campaign.status || "").toLowerCase() === "active"
                                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                                    : "bg-sky-500/10 text-sky-400"
                                                            }`}
                                                        >
                                                            {String(campaign.status || "Active").charAt(0).toUpperCase() + String(campaign.status || "Active").slice(1)}
                                                        </span>
                                                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">
                                                            Budget ₹{Number(campaign.budget || 0).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 font-medium">{formatK(Number(campaign.views || 0))}</td>

                                                <td className="px-6 py-5">{Number(campaign.clippers || 0)}</td>

                                                <td className="px-6 py-5 font-semibold">
                                                    ₹{Number(campaign.spent || 0).toLocaleString()}
                                                </td>

                                                <td className="px-6 py-5">
                                                    <span
                                                        className={`font-semibold ${
                                                            remaining <= 0
                                                                ? "text-zinc-500"
                                                                : remainingLow
                                                                ? "text-amber-400"
                                                                : "text-zinc-300"
                                                        }`}
                                                    >
                                                        ₹{Math.max(remaining, 0).toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Recent Transactions */}
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold">Recent Transactions</h2>
                        <p className="mt-2 text-sm text-zinc-400">Deposits and campaign spend, most recent first.</p>
                    </div>

                    {hasTransactions && (
                        <Link
                            to="/brand/transactions"
                            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5 md:self-auto"
                        >
                            View All
                            <ArrowRight size={16} />
                        </Link>
                    )}
                </div>

                {hasTransactions ? (
                    <div className="mt-8 space-y-4">
                        {(displayData.recent_transactions || []).map((txn) => {
                            const rawType = (txn?.transactionType ?? txn?.transaction_type ?? txn?.type ?? "").toString().toLowerCase();
                            const isDeposit = rawType.includes("deposit") || rawType.includes("add") || rawType.includes("fund");
                            const label = txn?.paymentDetails || txn?.payment_details || txn?.label || "Transaction";
                            const amount = Number(txn?.amount ?? 0);
                            const date = txn?.createdAt || txn?.created_at || txn?.date || "Just now";
                            const status = txn?.status || "Completed";

                            return (
                                <div
                                    key={txn.id || `${label}-${date}-${amount}`}
                                    className="flex flex-col gap-4 rounded-2xl border border-white/10 p-5 transition hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                                isDeposit ? "bg-emerald-500/10" : "bg-rose-500/10"
                                            }`}
                                        >
                                            {isDeposit ? (
                                                <ArrowUpCircle size={18} className="text-emerald-400" />
                                            ) : (
                                                <ArrowDownCircle size={18} className="text-rose-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-medium">{label}</h4>
                                            <p className="mt-1 text-sm text-zinc-500">{date}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 md:gap-8">
                                        <h4 className={`text-xl font-semibold ${isDeposit ? "text-emerald-400" : "text-white"}`}>
                                            {isDeposit ? "+" : "−"}₹{amount.toLocaleString()}
                                        </h4>

                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                String(status).toLowerCase() === "completed"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-amber-500/10 text-amber-400"
                                            }`}
                                        >
                                            {status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                            <Wallet size={24} className="text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">No transactions yet</h3>
                        <p className="max-w-sm text-sm text-zinc-500">
                            Deposits and campaign spend will show up here as soon as you add funds or launch a campaign.
                        </p>
                        <button
                            onClick={() => setAddFundsOpen(true)}
                            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                        >
                            <Plus size={16} />
                            Add Money
                        </button>
                    </div>
                )}
            </section>

            <AddFundsModal
                isOpen={addFundsOpen}
                onClose={() => setAddFundsOpen(false)}
                onSuccess={handleFundsAdded}
                savedMethod={savedMethod}
            />
        </div>
    );
}

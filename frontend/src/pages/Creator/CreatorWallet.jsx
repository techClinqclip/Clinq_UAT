import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Wallet,
    Lock,
    CircleDollarSign,
    Clock3,
    ArrowUpCircle,
    ArrowDownCircle,
    ArrowRightLeft,
    ArrowRight,
    Plus,
    Smartphone,
    Building2,
    CreditCard,
} from "lucide-react";
import Breadcrumbs from "../../components/Breadcrumbs";
import EarningsChartCard from "../Clipper/components/EarningsChartCard";
import AddFundsModal from "./components/AddFundsModal";
import WithdrawModal from "./components/WithdrawModal";
import TransferToCampaignModal from "./components/TransferToCampaignModal";
import { api } from "../../lib/api"; // ADJUST to match this file's actual path

/*
  Creator Wallet — a creator has two responsibilities the Brand and
  Clipper wallets each only model one half of: they can join other
  people's gigs and earn (the Clipper side), AND publish their own
  gigs and spend (the Brand side). This page is the merge of
  ClipperEarnings.jsx and BrandWallet.jsx rather than a fork of either.

  Two balances, two purposes:
    availableEarnings   — earned from clipping, withdrawable to a bank/UPI
    walletBalance        — deposited or transferred in, spendable on your
                           own gigs only

  Three money-movement actions, all modals so they share one pattern:
    Add Money   — external funds  → walletBalance   (AddFundsModal)
    Withdraw    — availableEarnings → external payout (WithdrawModal)
    Transfer    — availableEarnings → walletBalance, internal, instant
                  (TransferToCampaignModal) — the "use what I earned to
                  fund my own gig" path that neither source page had
                  a way to express on its own. This is ONE-DIRECTIONAL:
                  earnings → gig wallet only. There is no reverse path —
                  once money is in the gig wallet (deposited or
                  transferred in), it can only leave by being locked
                  into a gig, never moved back into earnings.

  The chart reuses EarningsChartCard as-is (same component both source
  files already used) — a small pill toggle above it switches which
  monthly series ("Earnings" vs "Gig Spend") feeds the same chart,
  rather than rendering two charts side by side.
*/

const wallet = {
    // Earnings side — money made clipping for other creators/brands
    totalEarnings: 38420,
    availableEarnings: 8700,
    pendingRewards: 5100,
    totalWithdrawn: 24620,

    // Gig wallet side — money available to fund your own gigs
    walletBalance: 12500,
    lockedInCampaigns: 21000,
    totalSpent: 33800,
    totalDeposited: 46300,

    earningsMonthly: [
        { month: "Jan", amount: 3200 },
        { month: "Feb", amount: 4800, previousAmount: 3200 },
        { month: "Mar", amount: 2900, previousAmount: 4800 },
        { month: "Apr", amount: 6700, previousAmount: 2900 },
        { month: "May", amount: 5800, previousAmount: 6700 },
        { month: "Jun", amount: 7200, previousAmount: 5800 },
        { month: "Jul", amount: 7820, previousAmount: 7200 },
    ],

    spendMonthly: [
        { month: "Jan", amount: 4100 },
        { month: "Feb", amount: 5300, previousAmount: 4100 },
        { month: "Mar", amount: 3600, previousAmount: 5300 },
        { month: "Apr", amount: 7200, previousAmount: 3600 },
        { month: "May", amount: 6100, previousAmount: 7200 },
        { month: "Jun", amount: 8400, previousAmount: 6100 },
        { month: "Jul", amount: 7900, previousAmount: 8400 },
    ],

    campaignsClipping: [
        { id: 1, title: "Podcast Shorts Challenge", creator: "Ali Abdaal", views: 890000, clips: 4, earned: 5100, pendingPayout: 0 },
        { id: 2, title: "AI Productivity Sprint", creator: "Thomas Frank", views: 520000, clips: 3, earned: 3200, pendingPayout: 1100 },
        { id: 3, title: "Finance Creator Challenge", creator: "Mark Tilbury", views: 1400000, clips: 7, earned: 8900, pendingPayout: 0 },
        { id: 4, title: "Morning Routine Challenge", creator: "Matt D'Avella", views: 780000, clips: 5, earned: 4200, pendingPayout: 650 },
    ],

    campaignsPublished: [
        { id: 1, title: "Edit Tips Weekly", status: "Active", budget: 15000, spent: 9200, views: 210000, clippers: 5 },
        { id: 2, title: "Behind the Scenes Clips", status: "Active", budget: 10000, spent: 6100, views: 158000, clippers: 3 },
        { id: 3, title: "Q&A Highlights", status: "Completed", budget: 8000, spent: 7650, views: 264000, clippers: 4 },
    ],

    transactions: [
        { id: 1, type: "deposit", date: "24 Jul 2026", label: "Added via UPI", amount: 5000, status: "Completed" },
        { id: 2, type: "earning", date: "22 Jul 2026", label: "Podcast Shorts Challenge payout", amount: 5100, status: "Completed" },
        { id: 3, type: "spend", date: "19 Jul 2026", label: "Funds locked for Edit Tips Weekly", amount: 1800, status: "Completed" },
        { id: 4, type: "transfer", date: "16 Jul 2026", label: "Earnings moved to gig wallet", amount: 3000, status: "Completed" },
        { id: 5, type: "withdrawal", date: "10 Jul 2026", label: "Withdrawn via Bank Transfer", amount: 6000, status: "Processing" },
    ],
};

const formatK = (n) => `${(n / 1000).toFixed(0)}K`;

// Indian-style currency shorthand: thousand -> k, lakh -> L, crore -> Cr
function formatINR(value) {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return "₹0";
    const sign = num < 0 ? "-" : "";
    const abs = Math.abs(num);

    const trim = (n) => {
        const fixed = n.toFixed(2);
        return fixed.replace(/\.?0+$/, "");
    };

    if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
    if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}k`;
    return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

// Mirrors buildInitialForm()'s field mapping in CreatorProfile.jsx — this
// intentionally reads the SAME raw API fields that page saves, so the two
// stay in sync without needing a shared import.
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

const TXN_STYLES = {
    deposit: { icon: ArrowUpCircle, bg: "bg-emerald-500/10", color: "text-emerald-400", sign: "+" },
    earning: { icon: ArrowUpCircle, bg: "bg-violet-500/10", color: "text-violet-400", sign: "+" },
    transfer: { icon: ArrowRightLeft, bg: "bg-amber-500/10", color: "text-amber-400", sign: "\u2192" },
    spend: { icon: ArrowDownCircle, bg: "bg-rose-500/10", color: "text-rose-400", sign: "\u2212" },
    withdrawal: { icon: ArrowDownCircle, bg: "bg-sky-500/10", color: "text-sky-400", sign: "\u2212" },
};

function getTransactionMeta(txn) {
    const rawType = (txn?.transactionType ?? txn?.transaction_type ?? txn?.type ?? "earning").toString().toLowerCase();
    const cleanedType = rawType.includes("withdraw") ? "withdrawal" : rawType.includes("deposit") ? "deposit" : rawType.includes("transfer") ? "transfer" : rawType.includes("spend") ? "spend" : rawType.includes("earning") || rawType.includes("viral") ? "earning" : rawType;

    const labelMap = {
        earning: "Earning",
        withdrawal: "Withdrawal",
        deposit: "Deposit",
        transfer: "Transfer",
        spend: "Locked",
    };

    return {
        type: cleanedType,
        label: txn?.paymentDetails || txn?.payment_details || txn?.label || labelMap[cleanedType] || "Transaction",
        status: (txn?.status ?? "Completed").toString(),
        amount: Number(txn?.amount ?? 0),
        createdAt: txn?.createdAt ?? txn?.created_at ?? txn?.date ?? new Date().toISOString(),
    };
}

// Pulsing-block loader, matching the skeleton pattern used across the
// Clipper pages — shown while the wallet API call is in flight instead of
// leaving the page blank.
function WalletSkeleton() {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />

            {/* Hero skeleton */}
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl flex-1">
                        <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
                        <div className="mt-5 h-10 w-40 animate-pulse rounded bg-white/10" />
                        <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
                        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/10" />
                    </div>
                    <div className="flex gap-3">
                        <div className="h-12 w-28 animate-pulse rounded-xl bg-white/10" />
                        <div className="h-12 w-32 animate-pulse rounded-xl bg-white/10" />
                    </div>
                </div>
            </section>

            {/* KPI skeletons */}
            {[0, 1].map((row) => (
                <div key={row} className="mt-8">
                    <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                    <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                                <div className="mb-4 h-7 w-7 animate-pulse rounded bg-white/10" />
                                <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                                <div className="mt-3 h-7 w-20 animate-pulse rounded bg-white/10" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Chart skeleton */}
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
                <div className="mt-6 h-56 w-full animate-pulse rounded-2xl bg-white/5" />
            </div>

            {/* Table skeleton */}
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="h-5 w-56 animate-pulse rounded bg-white/10" />
                <div className="mt-8 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-white/5" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// Splits a mixed transaction feed into the two sides of a creator's
// wallet: the gig wallet (money added + spent funding your own gigs,
// including transfers that just landed there) and earnings (money
// credited from gigs you clipped for, transferred out, or withdrawn).
// A transfer touches both — it's the same rupee leaving one balance and
// landing in the other — so it appears once in each table.
function splitWalletActivity(rows) {
    const wallet = [];
    const earnings = [];
    rows.forEach((txn) => {
        const type = getTransactionMeta(txn).type;
        if (type === "deposit" || type === "spend" || type === "transfer") wallet.push(txn);
        if (type === "earning" || type === "transfer" || type === "withdrawal") earnings.push(txn);
    });
    return { wallet, earnings };
}

function ActivityTable({ title, subtitle, rows, emptyIcon: EmptyIcon, emptyTitle, emptyMessage }) {
    return (
        <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                        <EmptyIcon size={36} className="text-zinc-600" />
                        <h4 className="mt-4 text-base font-semibold text-white">{emptyTitle}</h4>
                        <p className="mt-2 max-w-xs text-sm text-zinc-500">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="custom-scrollbar max-h-[360px] overflow-y-auto">
                        <table className="min-w-full">
                            <thead className="sticky top-0 z-10 bg-[#11111A]/95 backdrop-blur-md">
                                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                    <th className="px-5 py-3">Date</th>
                                    <th className="px-5 py-3">Description</th>
                                    <th className="px-5 py-3">Amount</th>
                                    <th className="px-5 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((txn) => {
                                    const meta = getTransactionMeta(txn);
                                    const style = TXN_STYLES[meta.type] ?? TXN_STYLES.spend;
                                    return (
                                        <tr key={txn.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                                            <td className="px-5 py-4 text-sm text-zinc-400">
                                                {new Date(meta.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-white">{meta.label}</td>
                                            <td className={`px-5 py-4 text-sm font-semibold ${style.color}`}>
                                                {style.sign}{formatINR(meta.amount)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${(meta.status || "Completed").toLowerCase() === "completed"
                                                            ? "bg-emerald-500/10 text-emerald-400"
                                                            : "bg-amber-500/10 text-amber-400"
                                                        }`}
                                                >
                                                    {(meta.status || "Completed").charAt(0).toUpperCase() + (meta.status || "Completed").slice(1)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CreatorWallet() {
    const [selectedFilter, setSelectedFilter] = useState("30 Days");
    const [chartView, setChartView] = useState("earnings"); // "earnings" | "spend"

    const [addFundsOpen, setAddFundsOpen] = useState(false);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);

    const [walletData, setWalletData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [availableEarnings, setAvailableEarnings] = useState(0);
    const [totalWithdrawn, setTotalWithdrawn] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);
    const [totalDeposited, setTotalDeposited] = useState(0);
    const [transactions, setTransactions] = useState([]);

    const [profile, setProfile] = useState(null);

    const sortedTransactions = [...transactions].sort((a, b) => {
        const aDate = new Date(getTransactionMeta(a).createdAt).getTime();
        const bDate = new Date(getTransactionMeta(b).createdAt).getTime();
        return bDate - aDate;
    });

    const { wallet: walletActivity, earnings: earningsActivity } = splitWalletActivity(sortedTransactions);

    // Load wallet data from API
    useEffect(() => {
        let mounted = true;

        const loadWalletData = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await api("/api/earnings/wallet/");
                if (!mounted) return;

                setWalletData(data);
                setAvailableEarnings(data.available_earnings ?? 0);
                setTotalWithdrawn(data.total_withdrawn ?? 0);
                setWalletBalance(data.wallet_balance ?? 0);
                setTotalDeposited(data.total_deposited ?? 0);
                setTransactions(data.recent_transactions ?? []);
            } catch (err) {
                if (!mounted) return;
                setError(err?.message || "Failed to load wallet data");
                console.error("Wallet error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadWalletData();
        return () => {
            mounted = false;
        };
    }, []);

    // Load profile for payment method
    useEffect(() => {
        let mounted = true;
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

    const pushTransaction = (entry) => {
        setTransactions((t) => [{ id: Date.now(), date: "Just now", status: "Completed", ...entry }, ...t]);
    };

    const handleFundsAdded = (amount) => {
        setWalletBalance((b) => b + amount);
        setTotalDeposited((d) => d + amount);
        pushTransaction({ type: "deposit", label: `Added via ${savedMethod?.label || "payment method"}`, amount });
    };

    const handleWithdraw = (amount) => {
        setAvailableEarnings((b) => b - amount);
        setTotalWithdrawn((w) => w + amount);
        pushTransaction({ type: "withdrawal", label: `Withdrawn via ${savedMethod?.label || "payment method"}`, amount, status: "Processing" });
    };

    const handleTransfer = (amount) => {
        setAvailableEarnings((b) => b - amount);
        setWalletBalance((b) => b + amount);
        pushTransaction({ type: "transfer", label: "Earnings moved to gig wallet", amount });
    };

    // Use API data if available, otherwise fallback to state
    const displayData = walletData || {
        total_earnings: 0,
        available_earnings: availableEarnings,
        pending_rewards: 0,
        total_withdrawn: totalWithdrawn,
        wallet_balance: walletBalance,
        locked_in_campaigns: 0,
        total_spent: 0,
        total_deposited: totalDeposited,
        earnings_monthly: [],
        campaigns_clipping: [],
        campaigns_published: [],
        recent_transactions: transactions,
        spend_monthly: [],
    };
    const zeroFilledSpend = (displayData.earnings_monthly || []).map((entry) => ({
        ...entry,
        amount: 0,
        previousAmount: 0,
    }));


    // in your fallback/displayData object, add:
    // was missing entirely
    // and update the chart source:
    const chartData = chartView === "earnings"
    ? (displayData.earnings_monthly || [])
    : (displayData.campaign_spend_monthly?.length
        ? displayData.campaign_spend_monthly
        : displayData.spend_monthly?.length
            ? displayData.spend_monthly
            : zeroFilledSpend);

    if (loading) {
        return <WalletSkeleton />;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Breadcrumbs />

            {/* Hero */}
            <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-[#11111A] to-[#0B0B12] p-8">
                <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-[120px]" />

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
                            Creator Wallet
                        </span>

                        <h1 className="mt-5 text-4xl font-bold">Wallet</h1>

                        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                            Track what you've earned through generating content, and manage the budget you spend
                            funding your own gigs — all in one place.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setWithdrawOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium transition hover:bg-white/5"
                        >
                            Withdraw
                        </button>
                        <button
                            onClick={() => setAddFundsOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                        >
                            <Plus size={18} />
                            Add Money
                        </button>
                    </div>
                </div>
            </section>

            {/* Transfer banner */}
            <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                        <ArrowRightLeft size={18} className="text-violet-400" />
                    </div>
                    <div>
                        <p className="font-semibold text-white">Fund a gig with what you've earned</p>
                        <p className="mt-1 text-sm text-zinc-400">
                            Move money from your earnings straight into your gig wallet  with no gateway - Non-reversible once transferred.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setTransferOpen(true)}
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold transition hover:bg-violet-500"
                >
                    Transfer Funds
                </button>
            </section>

            {/* Earnings KPIs */}
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-500">Your Earnings</h2>
            <section className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-violet-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Earnings</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(displayData.total_earnings)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Lifetime, across all gigs</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet className="mb-4 text-emerald-400" size={28} />
                    <p className="text-sm text-zinc-500">Available Balance</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(availableEarnings)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Ready to withdraw or transfer</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Clock3 className="mb-4 text-amber-400" size={28} />
                    <p className="text-sm text-zinc-500">Pending Rewards</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(displayData.pending_rewards)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Under review</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-sky-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Withdrawn</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(totalWithdrawn)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Sent to your payment method</p>
                </div>
            </section>

            {/* Gig wallet KPIs */}
            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">Your Gig Wallet</h2>
            <section className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet className="mb-4 text-emerald-400" size={28} />
                    <p className="text-sm text-zinc-500">Wallet Balance</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(walletBalance)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Available to spend</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Lock className="mb-4 text-amber-400" size={28} />
                    <p className="text-sm text-zinc-500">Locked in Gigs</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(displayData.locked_in_campaigns)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Reserved for active gigs</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-violet-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Spent</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(displayData.total_spent)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Lifetime, across all gigs</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <ArrowUpCircle className="mb-4 text-sky-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Deposited</p>
                    <h3 className="mt-2 text-3xl font-bold">{formatINR(totalDeposited)}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Lifetime, added to wallet</p>
                </div>
            </section>

            {/* Chart — one card, toggled between earnings and spend */}
            <section className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                    {[
                        { id: "earnings", label: "Earnings" },
                        { id: "spend", label: "Gig Spend" },
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setChartView(opt.id)}
                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${chartView === opt.id
                                    ? "border-transparent bg-violet-600 text-white"
                                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <EarningsChartCard
    data={chartData}
    selectedFilter={selectedFilter}
    onFilterChange={setSelectedFilter}
    filters={["7 Days", "30 Days", "3 Months", "6 Months", "1 Year"]}
    title={chartView === "earnings" ? "Monthly Earnings" : "Monthly Spend"}
    subtitle={
        chartView === "earnings"
            ? "Track how your rewards have grown over time."
            : "Track how your gig spend has changed over time."
    }
    summaryLabel="This Month"
    growthLabel="from last month"
    accent={chartView === "earnings" ? "violet" : "cyan"}
/>
            </section>

            {/* Gigs you're clipping for */}
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div>
                    <h2 className="text-2xl font-semibold">Campaings You're Generating Content For</h2>
                    <p className="mt-2 text-sm text-zinc-400">Breakdown of your earnings across every campaing you've joined.</p>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
                    <div className="custom-scrollbar max-h-[450px] overflow-y-auto">
                        <table className="min-w-full">
                            <thead className="sticky top-0 z-20 bg-[#11111A]/95 backdrop-blur-md">
                                <tr className="border-b border-white/10 text-left text-sm text-zinc-400">
                                    <th className="px-6 py-4">Campaing</th>
                                    <th className="px-6 py-4">Views</th>
                                    <th className="px-6 py-4">Content</th>
                                    <th className="px-6 py-4">Earned</th>
                                    <th className="px-6 py-4">Pending Payout</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!displayData.campaigns_clipping || displayData.campaigns_clipping.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20">
                                            <div className="text-center">
                                                <Wallet className="mx-auto text-zinc-600" size={48} />
                                                <h3 className="mt-6 text-2xl font-semibold">No Earnings Yet</h3>
                                                <p className="mt-3 text-zinc-500">
                                                    Join Campaings and submit your first content to start earning rewards.
                                                </p>
                                                <Link
                                                    to="/creator/browse"
                                                    className="mt-8 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                                                >
                                                    Browse Campaing
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayData.campaigns_clipping.map((campaign) => (
                                        <tr key={campaign.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                                            <td className="px-6 py-5">
                                                <h4 className="font-semibold">{campaign.title}</h4>
                                            </td>
                                            <td className="px-6 py-5 font-medium">{formatK(campaign.views)}</td>
                                            <td className="px-6 py-5">{campaign.clips}</td>
                                            <td className="px-6 py-5 font-semibold">{formatINR(campaign.earned)}</td>
                                            <td className="px-6 py-5">
                                                <span
                                                    className={`font-semibold ${campaign.pending_payout > 0 ? "text-amber-400" : "text-zinc-400"
                                                        }`}
                                                >
                                                    {formatINR(campaign.pending_payout)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Gigs you publish */}
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div>
                    <h2 className="text-2xl font-semibold">Gigs You Publish</h2>
                    <p className="mt-2 text-sm text-zinc-400">Breakdown of your budget and spend across every gig you've created.</p>
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
                    <div className="custom-scrollbar max-h-[450px] overflow-y-auto">
                        <table className="min-w-full">
                            <thead className="sticky top-0 z-20 bg-[#11111A]/95 backdrop-blur-md">
                                <tr className="border-b border-white/10 text-left text-sm text-zinc-400">
                                    <th className="px-6 py-4">Gig</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Budget</th>
                                    <th className="px-6 py-4">Views</th>
                                    <th className="px-6 py-4">Clippers</th>
                                    <th className="px-6 py-4">Spent</th>
                                    <th className="px-6 py-4">Remaining Budget</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!displayData.campaigns_published || displayData.campaigns_published.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20">
                                            <div className="text-center">
                                                <Wallet className="mx-auto text-zinc-600" size={48} />
                                                <h3 className="mt-6 text-2xl font-semibold">No Gigs Yet</h3>
                                                <p className="mt-3 text-zinc-500">
                                                    Publish a gig to start putting your budget to work.
                                                </p>
                                                <Link
                                                    to="/creator/campaigns/create"
                                                    className="mt-8 inline-flex rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                                                >
                                                    Create Gig
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayData.campaigns_published.map((campaign) => {
                                        const remaining = campaign.budget - campaign.spent;
                                        const remainingLow = remaining > 0 && remaining < campaign.budget * 0.1;
                                        return (
                                            <tr key={campaign.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                                                <td className="px-6 py-5">
                                                    <h4 className="font-semibold">{campaign.title}</h4>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-medium ${campaign.status === "Active"
                                                                ? "bg-emerald-500/10 text-emerald-400"
                                                                : "bg-sky-500/10 text-sky-400"
                                                            }`}
                                                    >
                                                        {campaign.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 font-medium text-zinc-300">{formatINR(campaign.budget)}</td>
                                                <td className="px-6 py-5 font-medium">{formatK(campaign.views)}</td>
                                                <td className="px-6 py-5">{campaign.clippers}</td>
                                                <td className="px-6 py-5 font-semibold">{formatINR(campaign.spent)}</td>
                                                <td className="px-6 py-5">
                                                    <span
                                                        className={`font-semibold ${remaining <= 0
                                                                ? "text-zinc-500"
                                                                : remainingLow
                                                                    ? "text-amber-400"
                                                                    : "text-zinc-300"
                                                            }`}
                                                    >
                                                        {formatINR(Math.max(remaining, 0))}
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
                        <h2 className="text-2xl font-semibold">Recent Activity</h2>
                        <p className="mt-2 text-sm text-zinc-400">Earnings, spend, deposits, withdrawals and transfers.</p>
                    </div>

                    <Link
                        to="/creator/transactions"
                        className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5 md:self-auto"
                    >
                        View All
                        <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-2">
                    <ActivityTable
                        title="Gig Wallet Activity"
                        subtitle="Money added to your wallet, and what's been locked to fund your own gigs."
                        rows={walletActivity}
                        emptyIcon={Wallet}
                        emptyTitle="No Wallet Activity Yet"
                        emptyMessage="Deposits and gig spend will show up here."
                    />
                    <ActivityTable
                        title="Earnings Activity"
                        subtitle="What you've earned by making content for others, transferred out, or withdrawn."
                        rows={earningsActivity}
                        emptyIcon={ArrowRightLeft}
                        emptyTitle="No Earnings Activity Yet"
                        emptyMessage="Payouts, transfers and withdrawals will show up here."
                    />
                </div>
            </section>

            <AddFundsModal
                isOpen={addFundsOpen}
                onClose={() => setAddFundsOpen(false)}
                onSuccess={handleFundsAdded}
                savedMethod={savedMethod}
            />

            <WithdrawModal
                isOpen={withdrawOpen}
                onClose={() => setWithdrawOpen(false)}
                availableBalance={availableEarnings}
                onSuccess={handleWithdraw}
                savedMethod={savedMethod}
            />

            <TransferToCampaignModal
                isOpen={transferOpen}
                onClose={() => setTransferOpen(false)}
                availableEarnings={availableEarnings}
                onSuccess={handleTransfer}
            />
        </div>
    );
}
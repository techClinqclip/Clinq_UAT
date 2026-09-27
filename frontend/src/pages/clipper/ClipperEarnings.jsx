import { Link } from "react-router-dom";
import {
    Wallet,
    CircleDollarSign,
    Clock3,
    ArrowRight,
    ArrowDownCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";
import MarketplaceLoadingSkeleton from "../../components/MarketplaceLoadingSkeleton";
import EarningsChartCard from "./components/EarningsChartCard";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";
import { normalizeClipperWithdrawal } from "./TransactionHistory";

const defaultOverview = {
    total_earnings: 0,
    available_balance: 0,
    pending_earnings: 0,
    total_withdrawals: 0,
    pending_withdrawals: 0,
    monthly_earnings: [],
    recent_transactions: [],
    minimum_payout: 2500,
    can_request_payout: false,
};

export default function ClipperEarnings() {
    const [overview, setOverview] = useState(defaultOverview);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState("30 Days");
    const { showToast } = useToast();

    useEffect(() => {
        let mounted = true;

        const loadOverview = async () => {
            try {
                const [data, history] = await Promise.all([
                    api("/api/earnings/overview/"),
                    api("/api/earnings/payout/history/").catch(() => []),
                ]);
                if (!mounted) return;

                setOverview({
                    total_earnings: Number(data.total_earnings || 0),
                    available_balance: Number(data.available_balance || 0),
                    pending_earnings: Number(data.pending_earnings || 0),
                    total_withdrawals: Number(data.total_withdrawals || 0),
                    pending_withdrawals: Number(data.pending_withdrawals || 0),
                    monthly_earnings: Array.isArray(data.monthly_earnings) ? data.monthly_earnings : [],
                    recent_transactions: Array.isArray(data.recent_transactions) ? data.recent_transactions : [],
                    minimum_payout: Number(data.minimum_payout || 2500),
                    can_request_payout: Boolean(data.can_request_payout),
                });
                setWithdrawals(Array.isArray(history) ? history : history?.results || []);
            } catch (error) {
                if (!mounted) return;
                showToast({
                    type: "error",
                    message: error?.message || "Unable to load earnings overview.",
                });
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        };

        loadOverview();
        return () => {
            mounted = false;
        };
    }, [showToast]);

    const chartData = useMemo(() => {
        const filterToPeriod = {
            "7 Days": "7D",
            "30 Days": "30D",
            "3 Months": "3M",
            "6 Months": "6M",
            "All Time": "ALL",
        };
        const periodKey = filterToPeriod[selectedFilter] || "30D";
        const byPeriod = overview.earnings_by_period?.[periodKey];
        if (Array.isArray(byPeriod) && byPeriod.length) return byPeriod;

        const source = overview.monthly_earnings || overview.earnings_monthly || [];
        if (selectedFilter === "30 Days") return source.slice(-1);
        if (selectedFilter === "3 Months") return source.slice(-3);
        if (selectedFilter === "6 Months") return source.slice(-6);
        return source;
    }, [overview.monthly_earnings, overview.earnings_monthly, overview.earnings_by_period, selectedFilter]);

    // Recent Payouts = withdrawal requests only (same idea as Creator recent list).
    const recentPayouts = useMemo(
        () =>
            (withdrawals || [])
                .map(normalizeClipperWithdrawal)
                .filter(Boolean)
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 5),
        [withdrawals]
    );

    if (loading) {
        return <MarketplaceLoadingSkeleton />;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Breadcrumbs />

            <section className="mt-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
                <div>

                    <h1 className="mt-5 text-4xl font-bold">Earnings</h1>

                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        Track your earnings, payouts, and see how your content is performing across every gig.
                    </p>
                </div>

                <Link
                    to="/clipper/withdraw"
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                >
                    Withdraw Earnings
                    <ArrowRight size={18} />
                </Link>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-violet-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Earnings</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{overview.total_earnings.toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-emerald-400">Live payout summary</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet className="mb-4 text-emerald-400" size={28} />
                    <p className="text-sm text-zinc-500">Available Balance</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{overview.available_balance.toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Ready to withdraw</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Clock3 className="mb-4 text-amber-400" size={28} />
                    <p className="text-sm text-zinc-500">Pending Rewards</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{overview.pending_earnings.toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Under review</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-sky-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Paid</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{overview.total_withdrawals.toLocaleString()}</h3>
                    <p className="mt-3 text-sm text-zinc-400">Successfully withdrawn</p>
                </div>
            </section>

            <section className="mt-8">
                <EarningsChartCard
                    data={chartData}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                />
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold">Recent Payouts</h2>
                        <p className="mt-2 text-sm text-zinc-400">
                            Your latest withdrawal requests and their status.
                        </p>
                    </div>

                    {recentPayouts.length > 0 && (
                        <Link
                            to="/clipper/transactions"
                            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5 md:self-auto"
                        >
                            View All
                            <ArrowRight size={16} />
                        </Link>
                    )}
                </div>

                {recentPayouts.length > 0 ? (
                    <div className="mt-8 space-y-4">
                        {recentPayouts.map((txn) => {
                            const date = txn.createdAt
                                ? new Date(txn.createdAt).toLocaleString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                                : txn.date;
                            return (
                                <div
                                    key={txn.id}
                                    className="flex flex-col gap-4 rounded-2xl border border-white/10 p-5 transition hover:bg-white/[0.03] md:flex-row md:items-center md:justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                                            <ArrowDownCircle size={18} className="text-violet-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium">{txn.label}</h4>
                                            <p className="mt-1 text-sm text-zinc-500">{date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 md:gap-8">
                                        <h4 className="text-xl font-semibold text-violet-400">
                                            −₹{Number(txn.amount || 0).toLocaleString("en-IN")}
                                        </h4>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                txn.status === "Completed"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : txn.status === "Processing"
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : txn.status === "Rejected"
                                                    ? "bg-rose-500/10 text-rose-400"
                                                    : "bg-red-500/10 text-red-400"
                                            }`}
                                        >
                                            {txn.status}
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
                        <h3 className="text-lg font-semibold text-white">No withdrawals yet</h3>
                        <p className="max-w-sm text-sm text-zinc-500">
                            Request a withdrawal when your available balance reaches the minimum.
                        </p>
                        <Link
                            to="/clipper/withdraw"
                            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium transition hover:bg-violet-500"
                        >
                            Withdraw Earnings
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}
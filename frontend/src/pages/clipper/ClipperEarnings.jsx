import { Link } from "react-router-dom";
import {
    Wallet,
    CircleDollarSign,
    Clock3,
    ArrowRight,
    ArrowDownLeft,
    ArrowUpRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";
import MarketplaceLoadingSkeleton from "../../components/MarketplaceLoadingSkeleton";
import EarningsChartCard from "./components/EarningsChartCard";
import useToast from "../../hooks/useToast";
import { api } from "../../lib/api";

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

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export default function ClipperEarnings() {
    const [overview, setOverview] = useState(defaultOverview);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState("30 Days");
    const { showToast } = useToast();

    useEffect(() => {
        let mounted = true;

        const loadOverview = async () => {
            try {
                const data = await api("/api/earnings/overview/");
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
        const source = overview.monthly_earnings || [];
        if (selectedFilter === "30 Days") return source.slice(-1);
        if (selectedFilter === "3 Months") return source.slice(-3);
        if (selectedFilter === "6 Months") return source.slice(-6);
        return source;
    }, [overview.monthly_earnings, selectedFilter]);

    // "Earning" transactions = money coming IN from a campaign submission (credit).
    // Anything else (withdrawal/payout request) = money going OUT of the wallet (debit).
    // We keep both in one feed but style/label them distinctly instead of relying
    // on a status column, since status ("Completed"/"Processing") doesn't tell you
    // whether money moved in or out.
    const recentPayouts = useMemo(
        () =>
            (overview.recent_transactions || [])
                .slice(0, 5)
                .map((payout) => {
                    const isCredit = payout.transactionType === "Earning";

                    return {
                        id: payout.id,
                        date: formatDate(payout.createdAt),
                        amount: Number(payout.amount || 0),
                        isCredit,
                        campaignName: isCredit
                            ? payout.contentTitle ||
                              payout.paymentDetails ||
                              payout.external_ref ||
                              "Campaign earnings"
                            : null,
                        method: isCredit
                            ? "Campaign Submission"
                            : payout.paymentMethod || payout.paymentDetails || "Wallet Withdrawal",
                    };
                }),
        [overview.recent_transactions]
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
                        <p className="mt-2 text-sm text-zinc-400">Your latest withdrawals and payment history.</p>
                    </div>

                    <Link
                        to="/clipper/transactions"
                        className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5 md:self-auto"
                    >
                        View All
                        <ArrowRight size={16} />
                    </Link>
                </div>

                {loading ? (
                    <div className="mt-8 py-24 text-center text-zinc-400">Loading earnings...</div>
                ) : recentPayouts.length === 0 ? (
                    <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-10 text-center text-zinc-400">
                        No payouts found yet.
                    </div>
                ) : (
                    <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm text-zinc-200">
                                <thead className="border-b border-white/10 bg-white/[0.02] text-zinc-400">
                                    <tr>
                                        <th className="px-5 py-4 font-medium">Date</th>
                                        <th className="px-5 py-4 font-medium">Campaign / Source</th>
                                        <th className="px-5 py-4 font-medium">Type</th>
                                        <th className="px-5 py-4 font-medium text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentPayouts.map((payout) => (
                                        <tr key={payout.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/[0.02]">
                                            <td className="px-5 py-4 text-zinc-300">{payout.date}</td>
                                            <td className="px-5 py-4">
                                                <div className="max-w-xs truncate font-medium text-zinc-100">
                                                    {payout.isCredit ? payout.campaignName : payout.method}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] ${
                                                        payout.isCredit
                                                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                            : "border border-red-500/30 bg-red-500/10 text-red-300"
                                                    }`}
                                                >
                                                    {payout.isCredit ? (
                                                        <ArrowDownLeft size={11} />
                                                    ) : (
                                                        <ArrowUpRight size={11} />
                                                    )}
                                                    {payout.isCredit ? "Earned" : "Withdrawn"}
                                                </span>
                                            </td>
                                            <td
                                                className={`px-5 py-4 text-right font-semibold ${
                                                    payout.isCredit ? "text-emerald-400" : "text-red-400"
                                                }`}
                                            >
                                                {payout.isCredit ? "+" : "-"}₹{payout.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
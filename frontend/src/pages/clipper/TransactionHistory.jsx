import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";
import MarketplaceLoadingSkeleton from "../../components/MarketplaceLoadingSkeleton";
import { api } from "../../lib/api";

import {
    ArrowLeft,
    Wallet,
    CircleDollarSign,
    ArrowDownLeft,
    ArrowUpRight,
    Search,
} from "lucide-react";

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All"); // All | Earned | Withdrawn
    const [methodFilter, setMethodFilter] = useState("All");
    const [sortBy, setSortBy] = useState("Newest");

    useEffect(() => {
        let mounted = true;

        const loadHistory = async () => {
            try {
                const data = await api('/api/earnings/overview/');
                if (!mounted) return;
                const source = Array.isArray(data.recent_transactions) ? data.recent_transactions : [];

                // Same distinction used on the Earnings page: "Earning" transactions
                // are money coming IN from a campaign submission (credit); everything
                // else is money going OUT of the wallet as a withdrawal (debit).
                setTransactions(source.map((item) => {
                    const isCredit = item.transactionType === "Earning";

                    return {
                        id: item.submissionId || item.id,
                        date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
                        campaign: isCredit
                            ? (item.contentTitle || item.paymentDetails || item.external_ref || 'Campaign earnings')
                            : null,
                        amount: Number(item.amount || 0),
                        isCredit,
                        method: isCredit
                            ? 'Campaign Submission'
                            : (item.paymentMethod || item.paymentDetails || 'Wallet Withdrawal'),
                    };
                }));
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadHistory();
        return () => {
            mounted = false;
        };
    }, []);

    const filteredTransactions = useMemo(() => {
        let data = [...transactions];

        if (search) {
            data = data.filter(
                (transaction) =>
                    (transaction.campaign || transaction.method)
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                    transaction.id.toString().includes(search)
            );
        }

        if (typeFilter !== "All") {
            const wantsCredit = typeFilter === "Earned";
            data = data.filter((transaction) => transaction.isCredit === wantsCredit);
        }

        if (methodFilter !== "All") {
            data = data.filter(
                (transaction) => transaction.method === methodFilter
            );
        }

        switch (sortBy) {
            case "Oldest":
                data.reverse();
                break;

            case "Highest Amount":
                data.sort((a, b) => b.amount - a.amount);
                break;

            case "Lowest Amount":
                data.sort((a, b) => a.amount - b.amount);
                break;

            default:
                break;
        }

        return data;
    }, [search, typeFilter, methodFilter, sortBy, transactions]);

    const totalEarned = transactions
        .filter((transaction) => transaction.isCredit)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const totalWithdrawn = transactions
        .filter((transaction) => !transaction.isCredit)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const earnedCount = transactions.filter((transaction) => transaction.isCredit).length;
    const withdrawnCount = transactions.filter((transaction) => !transaction.isCredit).length;

    if (loading) {
        return <MarketplaceLoadingSkeleton />;
    }

    return (
        <div className="min-h-screen bg-black text-white">
            <Breadcrumbs />

            {/* Hero */}

            <section className="mt-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    

                    <h1 className="mt-5 text-4xl font-bold">
                        Transaction History
                    </h1>

                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        View your complete payment history and track what's
                        been earned from gigs versus withdrawn from your wallet.
                    </p>
                </div>

                <Link
                    to="/clipper/earnings"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium transition hover:bg-white/5"
                >
                    <ArrowLeft size={18} />
                    Back to Earnings
                </Link>
            </section>

            {/* KPI Cards */}

            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet
                        className="mb-4 text-violet-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Total Transactions
                    </p>

                    <h3 className="mt-2 text-3xl font-bold">
                        {transactions.length}
                    </h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <ArrowDownLeft
                        className="mb-4 text-emerald-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Total Earned
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-emerald-400">
                        +₹{totalEarned.toLocaleString()}
                    </h3>

                    <p className="mt-2 text-xs text-zinc-500">
                        {earnedCount} campaign submission{earnedCount !== 1 ? "s" : ""}
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <ArrowUpRight
                        className="mb-4 text-red-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Total Withdrawn
                    </p>

                    <h3 className="mt-2 text-3xl font-bold text-red-400">
                        -₹{totalWithdrawn.toLocaleString()}
                    </h3>

                    <p className="mt-2 text-xs text-zinc-500">
                        {withdrawnCount} withdrawal{withdrawnCount !== 1 ? "s" : ""}
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign
                        className="mb-4 text-sky-400"
                        size={28}
                    />

                    <p className="text-sm text-zinc-500">
                        Net Balance Change
                    </p>

                    <h3 className="mt-2 text-3xl font-bold">
                        ₹{(totalEarned - totalWithdrawn).toLocaleString()}
                    </h3>
                </div>
            </section>
            {/* Filters */}

           {/* Filters */}

<section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
            <label className="mb-2 block text-xs font-medium text-zinc-500">
                Search
            </label>
            <div className="relative">
                <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />

                <input
                    type="text"
                    placeholder="Search by gig or transaction ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500"
                />
            </div>
        </div>

        <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">
                Type
            </label>
            <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
            >
                <option>All</option>
                <option>Earned</option>
                <option>Withdrawn</option>
            </select>
        </div>

        <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">
                Method
            </label>
            <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
            >
                <option>All</option>
                <option>UPI</option>
                <option>Bank Transfer</option>
            </select>
        </div>

        <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">
                Sort By
            </label>
            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
            >
                <option>Newest</option>
                <option>Oldest</option>
                <option>Highest Amount</option>
                <option>Lowest Amount</option>
            </select>
        </div>
    </div>
</section>

            {/* Transactions Table */}

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Transactions
                            </h2>

                            <p className="mt-1 text-sm text-zinc-400">
                                Complete payout history from your gigs.
                            </p>
                        </div>

                        <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">
                            {filteredTransactions.length} Results
                        </span>
                    </div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Wallet
                            size={60}
                            className="mb-6 text-zinc-600"
                        />

                        <h3 className="text-2xl font-semibold">
                            No Transactions Found
                        </h3>

                        <p className="mt-3 max-w-md text-center text-zinc-500">
                            Try changing your search or filters to find the
                            transactions you're looking for.
                        </p>

                        <Link
                            to="/marketplace"
                            className="mt-8 rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                        >
                            Browse Gigs
                        </Link>
                    </div>
                ) : (
                    <div className="custom-scrollbar max-h-[500px] overflow-y-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-[#0B0B0B]">
                                <tr className="border-b border-white/10 text-left text-sm text-zinc-400">
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Campaign / Source</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredTransactions.map((transaction) => (
                                    <tr
                                        key={transaction.id}
                                        className="border-b border-white/5 transition hover:bg-white/[0.03]"
                                    >
                                        <td className="px-6 py-5 font-medium">
                                            #{transaction.id}
                                        </td>

                                        <td className="px-6 py-5 text-zinc-400">
                                            {transaction.date}
                                        </td>

                                        <td className="px-6 py-5">
                                            <div className="max-w-xs truncate">
                                                {transaction.isCredit ? transaction.campaign : transaction.method}
                                            </div>
                                        </td>

                                        <td className="px-6 py-5">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] ${
                                                    transaction.isCredit
                                                        ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                                        : "border border-red-500/30 bg-red-500/10 text-red-300"
                                                }`}
                                            >
                                                {transaction.isCredit ? (
                                                    <ArrowDownLeft size={11} />
                                                ) : (
                                                    <ArrowUpRight size={11} />
                                                )}
                                                {transaction.isCredit ? "Earned" : "Withdrawn"}
                                            </span>
                                        </td>

                                        <td
                                            className={`px-6 py-5 text-right font-semibold ${
                                                transaction.isCredit ? "text-emerald-400" : "text-red-400"
                                            }`}
                                        >
                                            {transaction.isCredit ? "+" : "-"}₹{transaction.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
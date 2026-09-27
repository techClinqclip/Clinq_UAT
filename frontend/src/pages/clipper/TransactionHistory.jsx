import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";
import {
    ArrowLeft,
    ArrowRight,
    Wallet,
    CircleDollarSign,
    Clock3,
    CheckCircle2,
    Search,
    ArrowDownCircle,
} from "lucide-react";
import { api } from "../../lib/api";
import { formatWithdrawalDescription } from "../../shared/wallet/formatWithdrawalDescription";

/*
  Clipper withdrawal history — same shell as Creator transactions,
  but withdrawals only (no campaign earnings mixed in).
*/

const PAGE_SIZE = 10;

const TXN_META = {
    withdrawal: {
        label: "Withdrawal",
        icon: ArrowDownCircle,
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        sign: "−",
    },
};

function normalizeStatus(rawStatus) {
    const status = String(rawStatus || "pending").toLowerCase();
    if (status === "completed" || status === "successful") return "Completed";
    if (status === "rejected") return "Rejected";
    if (status === "failed") return "Failed";
    if (status === "pending") return "Processing";
    return status.replace(/^./, (c) => c.toUpperCase());
}

export { formatWithdrawalDescription };

export function normalizeClipperWithdrawal(transaction) {
    const rawType = (
        transaction.transactionType
        || transaction.transaction_type
        || transaction.type
        || ""
    ).toString().toLowerCase();

    // History endpoint is withdrawals-only; if a type is present, require withdraw.
    if (rawType && !rawType.includes("withdraw")) return null;

    const methodRaw = (
        transaction.paymentMethod
        || transaction.payment_method
        || ""
    ).toString().toLowerCase();
    const details = (
        transaction.paymentDetails
        || transaction.payment_details
        || ""
    ).toString();

    let method = "Wallet";
    if (methodRaw.includes("upi") || (details.includes("@") && !details.includes("|"))) {
        method = "UPI";
    } else if (methodRaw.includes("bank") || details.includes("|")) {
        method = "Bank Transfer";
    } else if (methodRaw.includes("paypal")) {
        method = "PayPal";
    }

    return {
        id: transaction.id,
        date: transaction.createdAt
            ? new Date(transaction.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            })
            : "—",
        type: "withdrawal",
        label: formatWithdrawalDescription(transaction, {
            fallbackLabel: "Withdrawal request",
        }),
        amount: Number(transaction.amount || 0),
        method,
        status: normalizeStatus(transaction.status),
        createdAt: transaction.createdAt || transaction.created_at,
    };
}

function TransactionHistorySkeleton() {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl flex-1">
                        <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
                        <div className="mt-5 h-10 w-64 animate-pulse rounded bg-white/10" />
                        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-white/10" />
                    </div>
                    <div className="h-12 w-40 animate-pulse rounded-xl bg-white/10" />
                </div>
            </section>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                        <div className="mb-4 h-7 w-7 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                        <div className="mt-3 h-7 w-20 animate-pulse rounded bg-white/10" />
                    </div>
                ))}
            </div>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="h-12 w-full animate-pulse rounded-xl bg-white/10" />
            </div>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="space-y-0 px-6 py-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 border-b border-white/5 py-5 last:border-b-0">
                            <div className="h-4 w-8 animate-pulse rounded bg-white/10" />
                            <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                            <div className="h-6 w-24 animate-pulse rounded-full bg-white/10" />
                            <div className="h-4 flex-1 animate-pulse rounded bg-white/10" />
                            <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                            <div className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function TransactionHistory() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortBy, setSortBy] = useState("Newest");
    const [page, setPage] = useState(1);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                setError("");
                const data = await api("/api/earnings/payout/history/");
                if (!mounted) return;
                const rows = (Array.isArray(data) ? data : data?.results || [])
                    .map(normalizeClipperWithdrawal)
                    .filter(Boolean);
                setTransactions(rows);
            } catch (err) {
                if (!mounted) return;
                setError(err?.message || "Unable to load withdrawal history.");
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilter, sortBy]);

    const filteredTransactions = useMemo(() => {
        let data = [...transactions];

        if (search) {
            const q = search.toLowerCase();
            data = data.filter((t) => t.label.toLowerCase().includes(q));
        }
        if (statusFilter !== "All") data = data.filter((t) => t.status === statusFilter);

        switch (sortBy) {
            case "Oldest":
                data.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
                break;
            case "Highest Amount":
                data.sort((a, b) => b.amount - a.amount);
                break;
            case "Lowest Amount":
                data.sort((a, b) => a.amount - b.amount);
                break;
            default:
                data.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                break;
        }
        return data;
    }, [transactions, search, statusFilter, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const paginatedTransactions = filteredTransactions.slice(pageStart, pageStart + PAGE_SIZE);

    const completedCount = transactions.filter((t) => t.status === "Completed").length;
    const processingCount = transactions.filter((t) => t.status === "Processing").length;
    const totalWithdrawn = transactions
        .filter((t) => t.status === "Completed")
        .reduce((sum, t) => sum + t.amount, 0);

    if (loading) return <TransactionHistorySkeleton />;

    return (
        <div className="min-h-screen bg-black text-white">
            <Breadcrumbs />

            <section className="mt-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
                        Clipper Earnings
                    </span>
                    <h1 className="mt-5 text-4xl font-bold">Withdrawal History</h1>
                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        Track every withdrawal request — pending review, completed, or returned.
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

            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet className="mb-4 text-violet-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Requests</p>
                    <h3 className="mt-2 text-3xl font-bold">{transactions.length}</h3>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CheckCircle2 className="mb-4 text-emerald-400" size={28} />
                    <p className="text-sm text-zinc-500">Completed</p>
                    <h3 className="mt-2 text-3xl font-bold">{completedCount}</h3>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Clock3 className="mb-4 text-amber-400" size={28} />
                    <p className="text-sm text-zinc-500">In Review</p>
                    <h3 className="mt-2 text-3xl font-bold">{processingCount}</h3>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-sky-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Paid Out</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{totalWithdrawn.toLocaleString("en-IN")}</h3>
                </div>
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search by UPI, bank, or reference..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
                    >
                        <option value="All">All Status</option>
                        <option value="Completed">Completed</option>
                        <option value="Processing">Processing</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Failed">Failed</option>
                    </select>
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
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">Withdrawals</h2>
                            <p className="mt-1 text-sm text-zinc-400">
                                Your withdrawal requests and payout status.
                            </p>
                        </div>
                        <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">
                            {filteredTransactions.length} Results
                        </span>
                    </div>
                </div>

                {error ? (
                    <div className="px-6 py-16 text-center text-red-400">{error}</div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Wallet size={60} className="mb-6 text-zinc-600" />
                        <h3 className="text-2xl font-semibold">No Withdrawals Found</h3>
                        <p className="mt-3 max-w-md text-center text-zinc-500">
                            When you request a withdrawal, it will appear here with its status.
                        </p>
                        <Link
                            to="/clipper/withdraw"
                            className="mt-8 rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                        >
                            Withdraw Earnings
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#0B0B0B]">
                                    <tr className="border-b border-white/10 text-left text-sm text-zinc-400">
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4">Amount</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTransactions.map((t, index) => {
                                        const meta = TXN_META.withdrawal;
                                        const Icon = meta.icon;
                                        return (
                                            <tr key={t.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                                                <td className="px-6 py-5 font-medium">{pageStart + index + 1}</td>
                                                <td className="px-6 py-5 text-zinc-400">{t.date}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.bg} ${meta.color}`}>
                                                        <Icon size={12} />
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">{t.label}</td>
                                                <td className={`px-6 py-5 font-semibold ${meta.color}`}>
                                                    {meta.sign}₹{t.amount.toLocaleString("en-IN")}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                                            t.status === "Completed"
                                                                ? "bg-emerald-500/10 text-emerald-400"
                                                                : t.status === "Processing"
                                                                ? "bg-amber-500/10 text-amber-400"
                                                                : t.status === "Rejected"
                                                                ? "bg-rose-500/10 text-rose-400"
                                                                : "bg-red-500/10 text-red-400"
                                                        }`}
                                                    >
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-4 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-zinc-500">
                                Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filteredTransactions.length)} of{" "}
                                {filteredTransactions.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ArrowLeft size={14} />
                                    Prev
                                </button>
                                <span className="rounded-xl bg-white/5 px-3 py-2 text-sm text-zinc-300">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

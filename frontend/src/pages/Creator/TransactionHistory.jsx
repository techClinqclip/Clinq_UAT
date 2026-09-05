import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";
import { api } from "../../lib/api";
 
import {
    ArrowLeft,
    ArrowUpCircle,
    ArrowDownCircle,
    ArrowRightLeft,
    Wallet,
    CircleDollarSign,
    Clock3,
    CheckCircle2,
    Search,
    ChevronDown,
} from "lucide-react";
 
/*
  Creator Transaction History — the original version of this page only
  ever showed gig payouts (the Clipper/earning side). A creator's
  wallet is a merge of earning (Clipper) and spending (Brand) money, plus
  deposits, withdrawals, and the internal earnings→gig-wallet transfer
  (see CreatorWallet.jsx), so this history needs to carry all five
  transaction types rather than just one.
 
  Each transaction now has a `type` alongside the old fields:
    deposit     — external money in, credited to the gig wallet
    earning     — payout from a gig you clipped for, credited to earnings
    locked      — money committed from your wallet balance to fund a gig
                  you're creating (stored as type "spend" internally —
                  see TXN_META below)
    withdrawal  — earnings sent out to your payment method
    transfer    — internal move from earnings into the gig wallet. This
                  is ONE-DIRECTIONAL ONLY: earnings → gig wallet. There
                  is no reverse flow — money already locked or spent on a
                  gig can't be pulled back out into earnings.
 
  `campaign` is kept as the general "label" field (renamed in the UI to
  "Description" since not every row is tied to a gig — a deposit or
  withdrawal isn't). `method` stays as the payment rail for deposit /
  withdrawal; earning is tagged "Gig Payout" (money paid TO the creator),
  locked/spend is tagged "Budget Lock" (money committed FROM the wallet
  when the gig is created — not a clipper payout), and transfer is
  tagged "Internal Transfer" since neither touches a payment gateway.
 
  A single gig submission is very often paid out across more than one
  transaction — views keep accruing after the first payout runs, so the
  same campaign name can legitimately show up as several separate
  "earning" rows at different dates rather than one lump sum.
 
  The table itself is split in two, same split as CreatorWallet.jsx's
  Recent Activity: a Gig Wallet table (deposit, locked/spend, and
  transfer as an inflow) and an Earnings table (earning, transfer as an
  outflow, and withdrawal). A transfer is one rupee moving between the
  creator's own two balances, so it legitimately shows up in both.
*/
 
const TXN_META = {
    deposit: { label: "Deposit", icon: ArrowUpCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", sign: "+" },
    earning: { label: "Earning", icon: ArrowUpCircle, color: "text-violet-400", bg: "bg-violet-500/10", sign: "+" },
    spend: { label: "Locked", icon: ArrowDownCircle, color: "text-rose-400", bg: "bg-rose-500/10", sign: "\u2212" },
    withdrawal: { label: "Withdrawal", icon: ArrowDownCircle, color: "text-sky-400", bg: "bg-sky-500/10", sign: "\u2212" },
    transfer: { label: "Transfer", icon: ArrowRightLeft, color: "text-amber-400", bg: "bg-amber-500/10", sign: "\u2192" },
};
 
const TYPE_OPTIONS = ["All", "Deposit", "Earning", "Locked", "Withdrawal", "Transfer"];
 
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
 
// Same split used on CreatorWallet.jsx's Recent Activity — deposit/spend
// go to the wallet side, earning/withdrawal go to the earnings side, and
// transfer (money moving between the two) shows up in both.
function splitTransactionActivity(rows) {
    const wallet = [];
    const earnings = [];
    rows.forEach((txn) => {
        if (txn.type === "deposit" || txn.type === "spend" || txn.type === "transfer") wallet.push(txn);
        if (txn.type === "earning" || txn.type === "transfer" || txn.type === "withdrawal") earnings.push(txn);
    });
    return { wallet, earnings };
}

function normalizeTransaction(transaction) {
    const rawType = (transaction.transactionType || transaction.transaction_type || "earning").toLowerCase();
    const type = rawType.includes("withdraw")
        ? "withdrawal"
        : rawType.includes("deposit")
            ? "deposit"
            : rawType.includes("transfer")
                ? "transfer"
                : rawType.includes("lock") || rawType.includes("spend")
                    ? "spend"
                    : "earning";

    return {
        id: transaction.id,
        date: transaction.createdAt
            ? new Date(transaction.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "—",
        type,
        campaign: transaction.contentTitle || transaction.paymentDetails || "Wallet activity",
        amount: Number(transaction.amount || 0),
        method: transaction.paymentMethod || "—",
        status: String(transaction.status || "pending").replace(/^./, (character) => character.toUpperCase()),
        createdAt: transaction.createdAt,
    };
}
 
// Pulsing-block loader matching the pattern used elsewhere in the app —
// shown while transaction history is being fetched instead of leaving
// the page blank.
function TransactionHistorySkeleton() {
    return (
        <div className="min-h-screen bg-black text-white">
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
 
            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl flex-1">
                        <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
                        <div className="mt-5 h-10 w-56 animate-pulse rounded bg-white/10" />
                        <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
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
 
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
                {[0, 1].map((i) => (
                    <div key={i} className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                        <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
                        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/10" />
                        <div className="mt-8 space-y-4">
                            {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j} className="h-14 animate-pulse rounded-xl bg-white/5" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
 
function TransactionsTable({ title, subtitle, rows, emptyIcon: EmptyIcon, emptyTitle, emptyMessage, browseTo, browseLabel }) {
    const [collapsed, setCollapsed] = useState(false);
 
    return (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-6 py-5">
                <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                >
                    <div>
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">
                            {rows.length} Result{rows.length !== 1 ? "s" : ""}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white">
                            <ChevronDown
                                size={16}
                                className={`transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
                            />
                        </span>
                    </div>
                </button>
            </div>
 
            {!collapsed && (
                rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <EmptyIcon size={52} className="mb-6 text-zinc-600" />
                        <h3 className="text-xl font-semibold">{emptyTitle}</h3>
                        <p className="mt-3 max-w-xs text-center text-zinc-500">{emptyMessage}</p>
                        {browseTo && (
                            <Link
                                to={browseTo}
                                className="mt-8 rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                            >
                                {browseLabel}
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="custom-scrollbar max-h-[500px] overflow-y-auto overflow-x-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-[#0B0B0B]">
                                <tr className="border-b border-white/10 text-left text-sm text-zinc-400">
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
 
                            <tbody>
                                {rows.map((transaction) => {
                                    const meta = TXN_META[transaction.type] ?? TXN_META.spend;
                                    const TypeIcon = meta.icon;
                                    return (
                                        <tr
                                            key={transaction.id}
                                            className="border-b border-white/5 transition hover:bg-white/[0.03]"
                                        >
                                            <td className="px-6 py-5 font-medium">#{transaction.id}</td>
 
                                            <td className="px-6 py-5 text-zinc-400">{transaction.date}</td>
 
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.bg} ${meta.color}`}>
                                                    <TypeIcon size={13} />
                                                    {meta.label}
                                                </span>
                                            </td>
 
                                            <td className="px-6 py-5">{transaction.campaign}</td>
 
                                            <td className={`px-6 py-5 font-semibold ${meta.color}`}>
                                                {meta.sign}{formatINR(transaction.amount)}
                                            </td>
 
                                            <td className="px-6 py-5 text-zinc-300">{transaction.method}</td>
 
                                            <td className="px-6 py-5">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                                        transaction.status === "Completed"
                                                            ? "bg-emerald-500/10 text-emerald-400"
                                                            : transaction.status === "Processing"
                                                            ? "bg-amber-500/10 text-amber-400"
                                                            : "bg-red-500/10 text-red-400"
                                                    }`}
                                                >
                                                    {transaction.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </section>
    );
}
 
export default function CreatorTransactionHistory() {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [loadError, setLoadError] = useState("");
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [methodFilter, setMethodFilter] = useState("All");
    const [sortBy, setSortBy] = useState("Newest");
 
    useEffect(() => {
        let mounted = true;

        api("/api/earnings/wallet/")
            .then((data) => {
                if (!mounted) return;
                setTransactions((data.recent_transactions || []).map(normalizeTransaction));
            })
            .catch((error) => {
                if (!mounted) return;
                setLoadError(error?.message || "Unable to load transaction history.");
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);
 
    const methodOptions = useMemo(
        () => ["All", ...Array.from(new Set(transactions.map((t) => t.method)))],
        [transactions]
    );
 
    const filteredTransactions = useMemo(() => {
        let data = [...transactions];
 
        if (search) {
            data = data.filter(
                (transaction) =>
                    transaction.campaign.toLowerCase().includes(search.toLowerCase()) ||
                    transaction.id.toString().includes(search)
            );
        }
 
        if (typeFilter !== "All") {
            data = data.filter((transaction) => TXN_META[transaction.type]?.label === typeFilter);
        }
 
        if (statusFilter !== "All") {
            data = data.filter((transaction) => transaction.status === statusFilter);
        }
 
        if (methodFilter !== "All") {
            data = data.filter((transaction) => transaction.method === methodFilter);
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
    }, [search, typeFilter, statusFilter, methodFilter, sortBy]);
 
    const { wallet: walletTransactions, earnings: earningsTransactions } = useMemo(
        () => splitTransactionActivity(filteredTransactions),
        [filteredTransactions]
    );
 
    const completedCount = transactions.filter((t) => t.status === "Completed").length;
 
    const pendingAmount = transactions
        .filter((t) => t.status === "Processing")
        .reduce((sum, t) => sum + t.amount, 0);
 
    const processingCount = transactions.filter((t) => t.status === "Processing").length;
 
    // Net flow = money in (deposit + earning) minus money out (spend +
    // withdrawal), completed transactions only. Transfer is excluded on
    // purpose — it moves money between the creator's own two balances
    // rather than in or out of the wallet as a whole, so it nets to zero.
    const netFlow = transactions
        .filter((t) => t.status === "Completed")
        .reduce((sum, t) => {
            if (t.type === "deposit" || t.type === "earning") return sum + t.amount;
            if (t.type === "spend" || t.type === "withdrawal") return sum - t.amount;
            return sum;
        }, 0);
 
    if (loading) {
        return <TransactionHistorySkeleton />;
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Breadcrumbs />
                <div className="mt-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-red-300">
                    {loadError}
                </div>
            </div>
        );
    }
 
    return (
        <div className="min-h-screen bg-black text-white">
            <Breadcrumbs />
 
            {/* Hero */}
 
            <section className="mt-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
                        Creator Wallet
                    </span>
 
                    <h1 className="mt-5 text-4xl font-bold">
                        Transaction History
                    </h1>
 
                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        Every deposit, earning, gig spend, withdrawal, and transfer across
                        your wallet, in one place.
                    </p>
                </div>
 
                <Link
                    to="/creator/earnings"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium transition hover:bg-white/5"
                >
                    <ArrowLeft size={18} />
                    Back to Wallet
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
                    <CheckCircle2
                        className="mb-4 text-emerald-400"
                        size={28}
                    />
 
                    <p className="text-sm text-zinc-500">
                        Completed
                    </p>
 
                    <h3 className="mt-2 text-3xl font-bold">
                        {completedCount}
                    </h3>
                </div>
 
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Clock3
                        className="mb-4 text-amber-400"
                        size={28}
                    />
 
                    <p className="text-sm text-zinc-500">
                        Pending Amount
                    </p>
 
                    <h3 className="mt-2 text-3xl font-bold">
                        {formatINR(pendingAmount)}
                    </h3>
 
                    <p className="mt-2 text-xs text-zinc-500">
                        {processingCount} transaction{processingCount !== 1 ? "s" : ""} processing
                    </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign
                        className={`mb-4 ${netFlow >= 0 ? "text-sky-400" : "text-rose-400"}`}
                        size={28}
                    />
 
                    <p className="text-sm text-zinc-500">
                        Net Flow
                    </p>
 
                    <h3 className={`mt-2 text-3xl font-bold ${netFlow >= 0 ? "text-white" : "text-rose-400"}`}>
                        {netFlow >= 0 ? "+" : "\u2212"}{formatINR(Math.abs(netFlow))}
                    </h3>
 
                    <p className="mt-2 text-xs text-zinc-500">
                        Deposits + earnings, minus spend + withdrawals
                    </p>
                </div>
            </section>
            {/* Filters */}
 
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                        />
 
                        <input
                            type="text"
                            placeholder="Search by description or transaction ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-11 pr-4 outline-none transition focus:border-violet-500"
                        />
                    </div>
 
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
                    >
                        {TYPE_OPTIONS.map((opt) => (
                            <option key={opt}>{opt}</option>
                        ))}
                    </select>
 
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
                    >
                        <option>All</option>
                        <option>Completed</option>
                        <option>Processing</option>
                        <option>Failed</option>
                    </select>
 
                    <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="rounded-xl border border-white/10 bg-black px-4 py-3 outline-none"
                    >
                        {methodOptions.map((opt) => (
                            <option key={opt}>{opt}</option>
                        ))}
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
 
            {/* Transactions — split into the two sides of the wallet, stacked
                full-width so a 7-column table never has to squeeze into a
                half-width card and force horizontal scrolling. Each table
                can also collapse independently via the header toggle. */}
 
            <div className="mt-8 space-y-8">
                <TransactionsTable
                    title="Gig Wallet Transactions"
                    subtitle="Money added to your wallet, and what's been locked to fund your own gigs."
                    rows={walletTransactions}
                    emptyIcon={Wallet}
                    emptyTitle="No Wallet Transactions Found"
                    emptyMessage="Try changing your search or filters, or add money to your wallet."
                    browseTo="/creator/earnings"
                    browseLabel="Back to Wallet"
                />
 
                <TransactionsTable
                    title="Earnings Transactions"
                    subtitle="What you've earned clipping for others, transferred out, or withdrawn."
                    rows={earningsTransactions}
                    emptyIcon={ArrowRightLeft}
                    emptyTitle="No Earnings Transactions Found"
                    emptyMessage="Try changing your search or filters to find what you're looking for."
                    browseTo="/creator/browse"
                    browseLabel="Browse Gigs"
                />
            </div>
        </div>
    );
}
 
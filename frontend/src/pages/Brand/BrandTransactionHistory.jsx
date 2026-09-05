import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import Breadcrumbs from "../../components/Breadcrumbs";

import {
    ArrowLeft,
    Wallet,
    CircleDollarSign,
    Clock3,
    CheckCircle2,
    Search,
    ArrowUpCircle,
    ArrowDownCircle,
} from "lucide-react";

/*
  Brand-side counterpart to Clipper's TransactionHistory — same shell
  (hero / KPI row / filters / table), but each row can be a deposit
  (money added to the wallet) OR a spend (money paid out to a running
  campaign), so there's an extra "Type" filter and column, and amounts
  render with a +/− sign and direction color instead of always being a
  flat payout figure.
*/

const transactions = [
    { id: 2048, date: "24 Jul 2026", type: "deposit", label: "Added via UPI", campaign: null, amount: 20000, method: "UPI", status: "Completed" },
    { id: 2047, date: "22 Jul 2026", type: "spend", label: "Campaign payout", campaign: "Podcast Shorts Challenge", amount: 5100, method: "Wallet", status: "Completed" },
    { id: 2046, date: "18 Jul 2026", type: "spend", label: "Campaign payout", campaign: "Finance Creator Challenge", amount: 8900, method: "Wallet", status: "Completed" },
    { id: 2045, date: "15 Jul 2026", type: "deposit", label: "Added via Bank Transfer", campaign: null, amount: 40000, method: "Bank Transfer", status: "Processing" },
    { id: 2044, date: "09 Jul 2026", type: "spend", label: "Campaign payout", campaign: "AI Productivity Sprint", amount: 3200, method: "Wallet", status: "Completed" },
    { id: 2043, date: "03 Jul 2026", type: "deposit", label: "Added via UPI", campaign: null, amount: 15000, method: "UPI", status: "Failed" },
    { id: 2042, date: "28 Jun 2026", type: "spend", label: "Campaign payout", campaign: "Travel Reels", amount: 2800, method: "Wallet", status: "Completed" },
    { id: 2041, date: "19 Jun 2026", type: "spend", label: "Campaign payout", campaign: "Startup Stories", amount: 1500, method: "Wallet", status: "Completed" },
    { id: 2040, date: "12 Jun 2026", type: "spend", label: "Campaign payout", campaign: "Morning Routine Challenge", amount: 4300, method: "Wallet", status: "Completed" },
    { id: 2039, date: "02 Jun 2026", type: "deposit", label: "Added via Bank Transfer", campaign: null, amount: 30000, method: "Bank Transfer", status: "Completed" },
];

export default function () {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");
    const [methodFilter, setMethodFilter] = useState("All");
    const [sortBy, setSortBy] = useState("Newest");

    const filteredTransactions = useMemo(() => {
        let data = [...transactions];

        if (search) {
            const q = search.toLowerCase();
            data = data.filter(
                (t) =>
                    t.label.toLowerCase().includes(q) ||
                    (t.campaign && t.campaign.toLowerCase().includes(q)) ||
                    t.id.toString().includes(search)
            );
        }

        if (statusFilter !== "All") data = data.filter((t) => t.status === statusFilter);
        if (typeFilter !== "All") data = data.filter((t) => t.type === typeFilter);
        if (methodFilter !== "All") data = data.filter((t) => t.method === methodFilter);

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
    }, [search, statusFilter, typeFilter, methodFilter, sortBy]);

    const completedCount = transactions.filter((t) => t.status === "Completed").length;

    const processingCount = transactions.filter((t) => t.status === "Processing").length;
    const pendingAmount = transactions
        .filter((t) => t.status === "Processing")
        .reduce((sum, t) => sum + t.amount, 0);

    const totalDeposited = transactions
        .filter((t) => t.type === "deposit" && t.status === "Completed")
        .reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="min-h-screen bg-black text-white">
            <Breadcrumbs />

            {/* Hero */}
            <section className="mt-6 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <span className="inline-flex rounded-full bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-300">
                        Brand Wallet
                    </span>

                    <h1 className="mt-5 text-4xl font-bold">Transaction History</h1>

                    <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
                        View every deposit and campaign payout, and track the status
                        of each one.
                    </p>
                </div>

                <Link
                    to="/brand/earnings"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium transition hover:bg-white/5"
                >
                    <ArrowLeft size={18} />
                    Back to Wallet
                </Link>
            </section>

            {/* KPI Cards */}
            <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Wallet className="mb-4 text-violet-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Transactions</p>
                    <h3 className="mt-2 text-3xl font-bold">{transactions.length}</h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CheckCircle2 className="mb-4 text-emerald-400" size={28} />
                    <p className="text-sm text-zinc-500">Completed</p>
                    <h3 className="mt-2 text-3xl font-bold">{completedCount}</h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <Clock3 className="mb-4 text-amber-400" size={28} />
                    <p className="text-sm text-zinc-500">Pending Amount</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{pendingAmount.toLocaleString()}</h3>
                    <p className="mt-2 text-xs text-zinc-500">
                        {processingCount} transaction{processingCount !== 1 ? "s" : ""} processing
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <CircleDollarSign className="mb-4 text-sky-400" size={28} />
                    <p className="text-sm text-zinc-500">Total Deposited</p>
                    <h3 className="mt-2 text-3xl font-bold">₹{totalDeposited.toLocaleString()}</h3>
                </div>
            </section>

            {/* Filters */}
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search by campaign or transaction ID..."
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
                        <option value="All">All Types</option>
                        <option value="deposit">Deposits</option>
                        <option value="spend">Spend</option>
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
                        <option>All</option>
                        <option>UPI</option>
                        <option>Bank Transfer</option>
                        <option>Wallet</option>
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

            {/* Transactions Table */}
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">Transactions</h2>
                            <p className="mt-1 text-sm text-zinc-400">Complete deposit and spend history for your wallet.</p>
                        </div>

                        <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-400">
                            {filteredTransactions.length} Results
                        </span>
                    </div>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Wallet size={60} className="mb-6 text-zinc-600" />
                        <h3 className="text-2xl font-semibold">No Transactions Found</h3>
                        <p className="mt-3 max-w-md text-center text-zinc-500">
                            Try changing your search or filters to find the transactions you're looking for.
                        </p>
                        <Link
                            to="/brand/campaigns/create"
                            className="mt-8 rounded-xl bg-violet-600 px-6 py-3 font-medium transition hover:bg-violet-500"
                        >
                            Create Campaign
                        </Link>
                    </div>
                ) : (
                    <div className="custom-scrollbar max-h-[500px] overflow-y-auto">
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
                                {filteredTransactions.map((t) => {
                                    const isDeposit = t.type === "deposit";
                                    return (
                                        <tr key={t.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                                            <td className="px-6 py-5 font-medium">#{t.id}</td>
                                            <td className="px-6 py-5 text-zinc-400">{t.date}</td>
                                            <td className="px-6 py-5">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                                                        isDeposit ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                                    }`}
                                                >
                                                    {isDeposit ? <ArrowUpCircle size={12} /> : <ArrowDownCircle size={12} />}
                                                    {isDeposit ? "Deposit" : "Spend"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">{t.campaign || t.label}</td>
                                            <td className={`px-6 py-5 font-semibold ${isDeposit ? "text-emerald-400" : "text-white"}`}>
                                                {isDeposit ? "+" : "−"}₹{t.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5 text-zinc-300">{t.method}</td>
                                            <td className="px-6 py-5">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                                        t.status === "Completed"
                                                            ? "bg-emerald-500/10 text-emerald-400"
                                                            : t.status === "Processing"
                                                            ? "bg-amber-500/10 text-amber-400"
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
                )}
            </section>
        </div>
    );
}
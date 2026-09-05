import { CalendarDays } from "lucide-react";
import EarningsAreaChart from "./EarningsAreaChart";

const filters = [
    "7 Days",
    "30 Days",
    "3 Months",
    "6 Months",
    "All Time",
];

/*
  EarningsChartCard — shared across every wallet page (Clipper earnings,
  Brand spend, Creator's earnings/spend toggle). It used to hardcode
  "Monthly Earnings" / "This Month" / "from last month", which only made
  sense for the Clipper page it was first built for. Everything
  page-specific is now a prop with a default that matches the original
  copy, so existing call sites don't need to change unless they want to.

  Usage — earnings (unchanged behavior, no new props needed):
    <EarningsChartCard data={data} selectedFilter={f} onFilterChange={setF} />

  Usage — spend (Brand wallet, or Creator's "Gig Spend" toggle):
    <EarningsChartCard
      title="Monthly Spend"
      subtitle="Track how your gig spend has changed over time."
      summaryLabel="This Month"
      growthLabel="from last month"
      accent="cyan"
      data={data}
      selectedFilter={f}
      onFilterChange={setF}
    />
*/

const ACCENTS = {
    violet: {
        activeBtn: "bg-violet-600",
        cardBorder: "border-violet-500/20",
        cardGradient: "from-violet-500/10 to-fuchsia-500/5",
    },
    cyan: {
        activeBtn: "bg-cyan-600",
        cardBorder: "border-cyan-500/20",
        cardGradient: "from-cyan-500/10 to-sky-500/5",
    },
    emerald: {
        activeBtn: "bg-emerald-600",
        cardBorder: "border-emerald-500/20",
        cardGradient: "from-emerald-500/10 to-teal-500/5",
    },
    amber: {
        activeBtn: "bg-amber-600",
        cardBorder: "border-amber-500/20",
        cardGradient: "from-amber-500/10 to-orange-500/5",
    },
};

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

export default function EarningsChartCard({
    data,
    selectedFilter,
    onFilterChange,
    title = "Monthly Earnings",
    subtitle = "Track how your earnings have grown over time.",
    summaryLabel = "This Month",
    growthLabel = "from last month",
    accent = "violet",
}) {
    const a = ACCENTS[accent] ?? ACCENTS.violet;

    const latestAmount = data[data.length - 1]?.amount ?? 0;

    const previousAmount =
        data[data.length - 2]?.amount ?? latestAmount;

    // Guard divide-by-zero: with no previous-period amount to compare
    // against, there's no meaningful percentage to show.
    const growth =
        previousAmount === 0
            ? null
            : (((latestAmount - previousAmount) / previousAmount) * 100).toFixed(1);

    return (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">

            {/* Header */}

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                <div>

                    <h2 className="text-xl font-semibold text-white">
                        {title}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-400">
                        {subtitle}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">

                        {filters.map((filter) => (

                            <button
                                key={filter}
                                onClick={() => onFilterChange(filter)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all
                                ${
                                    selectedFilter === filter
                                        ? `${a.activeBtn} text-white`
                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                }`}
                            >
                                {filter}
                            </button>

                        ))}

                    </div>

                </div>

                {/* Summary */}

                <div className={`rounded-2xl border ${a.cardBorder} bg-gradient-to-br ${a.cardGradient} p-5`}>

                    <div className="flex items-center gap-2 text-zinc-400">

                        <CalendarDays size={16} />

                        <span className="text-sm">
                            {summaryLabel}
                        </span>

                    </div>

                    <h3 className="mt-3 text-3xl font-bold text-white">
                        {formatINR(latestAmount)}
                    </h3>

                    {growth !== null && (
                        <p
                            className={`mt-2 text-sm font-medium ${
                                growth >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400"
                            }`}
                        >
                            {growth >= 0 ? "+" : ""}
                            {growth}% {growthLabel}
                        </p>
                    )}

                </div>

            </div>

            {/* Chart */}

            <div className="mt-8">
                <EarningsAreaChart data={data} />
            </div>

        </div>
    );
}
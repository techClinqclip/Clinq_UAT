import { TrendingUp } from "lucide-react";
import AnalyticsAreaChart from "./AnalyticsAreaChart";

export default function AnalyticsChartCard({
    data,
    selectedFilter,
    onFilterChange,
}) {
    const filters = [
        "30 Days",
        "3 Months",
        "6 Months",
        "All Time",
    ];

    const current = data[data.length - 1];
    const previous = data[data.length - 2];

    const growth =
        previous && previous.views
            ? (((current.views - previous.views) / previous.views) * 100).toFixed(1)
            : 0;

    return (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                {/* Left */}

                <div className="flex-1">
                    <h2 className="text-2xl font-semibold">
                        Performance Overview
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                        Track your audience growth over time and identify
                        performance trends across your content.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => onFilterChange(filter)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                    selectedFilter === filter
                                        ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary */}

                <div className="w-full rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/5 p-6 lg:w-72">
                    <p className="text-sm font-medium text-violet-300">
                        This Month
                    </p>

                    <div className="mt-4 flex items-center gap-3">
                        <TrendingUp
                            size={20}
                            className="text-emerald-400"
                        />

                        <span className="text-3xl font-bold">
                            {(current.views / 1000000).toFixed(2)}M
                        </span>
                    </div>

                    <p className="mt-2 text-sm text-emerald-400">
                        ↑ {growth}% from last month
                    </p>
                </div>
            </div>

            <div className="mt-10">
                <AnalyticsAreaChart data={data} />
            </div>
        </section>
    );
}
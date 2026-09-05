const formatViews = (views) => {
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(2)}M`;
    }

    if (views >= 1000) {
        return `${(views / 1000).toFixed(0)}K`;
    }

    return views.toString();
};

export default function AnalyticsTooltip({
    active,
    payload,
    label,
}) {
    if (!active || !payload || !payload.length) {
        return null;
    }

    const current = payload[0].payload;

    let growth = null;

    if (current.previousViews) {
        growth = (
            ((current.views - current.previousViews) /
                current.previousViews) *
            100
        ).toFixed(1);
    }

    return (
        <div className="min-w-[200px] rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-xl">
            <p className="text-sm font-semibold text-white">
                {label}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
                Performance Overview
            </p>

            <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Total Views
                </p>

                <h3 className="mt-1 text-2xl font-bold text-blue-400">
                    {formatViews(current.views)}
                </h3>
            </div>

            {growth && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                        Growth
                    </p>

                    <p
                        className={`mt-1 text-sm font-semibold ${
                            Number(growth) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                        }`}
                    >
                        {Number(growth) >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(growth)}%
                        <span className="ml-1 text-zinc-500 font-normal">
                            vs previous month
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}
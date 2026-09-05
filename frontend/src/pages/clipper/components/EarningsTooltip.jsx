export default function EarningsTooltip({
    active,
    payload,
    label,
}) {
    if (!active || !payload || !payload.length) return null;

    const current = payload[0].value;

    const previous = payload[0]?.payload?.previousAmount;

    let percentage = null;

    if (previous) {
        percentage = (((current - previous) / previous) * 100).toFixed(1);
    }

    return (
        <div
            className="
                min-w-[170px]
                rounded-2xl
                border
                border-zinc-700
                bg-zinc-900/95
                backdrop-blur-xl
                px-4
                py-3
                shadow-2xl
            "
        >
            <p className="text-xs text-zinc-400">
                {label}
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">
                ₹{current.toLocaleString()}
            </h3>

            {percentage && (
                <div className="mt-2 flex items-center gap-2">

                    <span
                        className={`
                            rounded-full
                            px-2
                            py-0.5
                            text-xs
                            font-medium

                            ${
                                percentage >= 0
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-red-500/10 text-red-400"
                            }
                        `}
                    >
                        {percentage >= 0 ? "+" : ""}
                        {percentage}%
                    </span>

                    <span className="text-xs text-zinc-500">
                        vs previous month
                    </span>

                </div>
            )}
        </div>
    );
}
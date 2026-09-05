import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

import EarningsTooltip from "./EarningsTooltip";

const CHART_COLOR = "#8B5CF6";
const GRADIENT_ID = "earnings-gradient";

export default function EarningsAreaChart({ data }) {
    return (
        <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 10,
                        right: 10,
                        left: -25,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient
                            id={GRADIENT_ID}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor={CHART_COLOR}
                                stopOpacity={0.32}
                            />

                            <stop
                                offset="75%"
                                stopColor={CHART_COLOR}
                                stopOpacity={0.08}
                            />

                            <stop
                                offset="100%"
                                stopColor={CHART_COLOR}
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        vertical={false}
                        stroke="#27272A"
                        strokeOpacity={0.35}
                    />

                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tickMargin={12}
                        tick={{
                            fill: "#A1A1AA",
                            fontSize: 12,
                            fontWeight: 500,
                        }}
                    />

                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        tick={{
                            fill: "#A1A1AA",
                            fontSize: 12,
                        }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                    />

                    <Tooltip
                        content={<EarningsTooltip />}
                        cursor={{
                            stroke: CHART_COLOR,
                            strokeWidth: 1,
                            strokeOpacity: 0.4,
                        }}
                    />

                    <Area
                        type="natural"
                        dataKey="amount"
                        stroke={CHART_COLOR}
                        strokeWidth={3}
                        fill={`url(#${GRADIENT_ID})`}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        activeDot={{
                            r: 6,
                            fill: CHART_COLOR,
                            stroke: "#18181B",
                            strokeWidth: 3,
                        }}
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
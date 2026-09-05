import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function ViewsChart({
  data = [],
  xKey = "period",
  dataKey = "views",
}) {
  const chartData = Array.isArray(data) ? data : [];

  if (chartData.length === 0) {
    return (
      <div className="flex h-[220px] w-full items-center justify-center text-sm text-zinc-500">
        No views data available
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid
            stroke="#27272a"
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey={xKey}
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
          />

          <YAxis
            stroke="#71717a"
            tick={{ fill: "#a1a1aa", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#3f3f46" }}
          />

          <Tooltip
            contentStyle={{
              background: "#11111A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#fff",
            }}
            labelStyle={{ color: "#d4d4d8" }}
          />

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

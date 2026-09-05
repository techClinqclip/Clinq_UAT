import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
  } from "recharts";
  
  export default function ViewsChart({ data }) {
    return (
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
            />
  
            <XAxis
              dataKey="period"
              stroke="#71717a"
            />
  
            <YAxis
              stroke="#71717a"
            />
  
            <Tooltip
              contentStyle={{
                background: "#11111A",
                border: "1px solid #27272a",
                borderRadius: "12px",
              }}
            />
  
            <Line
              type="monotone"
              dataKey="views"
              stroke="#8b5cf6"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
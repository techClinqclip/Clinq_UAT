import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
  } from "recharts";
  
  export default function PayoutTrendChart({
    data,
    xKey = "period",
    dataKey = "amount",
  }) {
    return (
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              stroke="#27272a"
              strokeDasharray="3 3"
            />
  
            <XAxis
              dataKey={xKey}
              stroke="#71717a"
            />
  
            <YAxis
              stroke="#71717a"
            />
  
            <Tooltip
              contentStyle={{
                backgroundColor: "#11111A",
                border: "1px solid #27272a",
                borderRadius: "12px",
                color: "#fff",
              }}
            />
  
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
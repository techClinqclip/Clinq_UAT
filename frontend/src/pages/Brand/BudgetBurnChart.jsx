import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
  } from "recharts";
  
  const data = [
    { month: "Jan", spent: 12000 },
    { month: "Feb", spent: 18000 },
    { month: "Mar", spent: 24000 },
    { month: "Apr", spent: 32000 },
    { month: "May", spent: 45000 },
    { month: "Jun", spent: 62000 },
  ];
  
  export default function BudgetBurnChart({ data }) {
    return (
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
            <CartesianGrid
              stroke="#27272a"
              strokeDasharray="3 3"
            />
  
            <XAxis
              dataKey="month"
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
              dataKey="spent"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
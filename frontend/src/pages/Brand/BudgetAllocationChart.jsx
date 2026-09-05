import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
  } from "recharts";
  
  const COLORS = [
    "#8b5cf6",
    "#a855f7",
    "#c084fc",
    "#d8b4fe",
  ];
  
  export default function BudgetAllocationChart({ data }) {
    return (
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={95}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
  
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }
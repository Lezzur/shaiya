"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";

interface CostByClientChartProps {
  data: Array<{
    id: string;
    name: string;
    cost: number;
  }>;
}

const COLORS = [
  "#18181b", // zinc-900
  "#3f3f46", // zinc-700
  "#52525b", // zinc-600
  "#71717a", // zinc-500
  "#a1a1aa", // zinc-400
];

export function CostByClientChart({ data }: CostByClientChartProps) {
  const chartData = data.map((item) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
    fullName: item.name,
    cost: item.cost,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis
          type="number"
          tickFormatter={(value) => formatCurrency(value)}
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey="name"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Cost"]}
          labelFormatter={(_label, payload) => {
            if (payload && payload[0]) {
              return (payload[0].payload as { fullName: string }).fullName;
            }
            return String(_label);
          }}
          contentStyle={{
            backgroundColor: "#18181b",
            border: "none",
            borderRadius: "8px",
            color: "#fff",
          }}
          labelStyle={{ color: "#fff", fontWeight: "bold" }}
          itemStyle={{ color: "#a1a1aa" }}
        />
        <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getChartPalette } from "@/lib/theme/palette";
import { useTheme } from "@/lib/theme/ThemeContext";

export interface ConcertDemandDatum {
  city: string;
  inventory: number;
  forecast: number;
}

export function InventoryVsDemandChart({
  data,
  inventoryLabel,
  forecastLabel,
}: {
  data: ConcertDemandDatum[];
  inventoryLabel: string;
  forecastLabel: string;
}) {
  const { theme } = useTheme();
  const { series, ink } = getChartPalette(theme);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={ink.grid} />
        <XAxis dataKey="city" tickLine={false} axisLine={{ stroke: ink.axis }} tick={{ fill: ink.muted, fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: ink.muted, fontSize: 12 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: ink.surface,
            border: `1px solid ${ink.grid}`,
            borderRadius: 8,
            fontSize: 12,
            color: ink.primary,
          }}
          labelStyle={{ color: ink.primary }}
          itemStyle={{ color: ink.secondary }}
          formatter={(value) => (typeof value === "number" ? value.toLocaleString() : value)}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: ink.secondary }} />
        <Bar dataKey="inventory" name={inventoryLabel} fill={series[1]} radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="forecast" name={forecastLabel} fill={series[2]} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

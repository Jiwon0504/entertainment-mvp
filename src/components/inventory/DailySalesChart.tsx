"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getChartPalette } from "@/lib/theme/palette";
import { useTheme } from "@/lib/theme/ThemeContext";

export interface DailySalesSeries {
  key: string;
  label: string;
}

export function DailySalesChart({
  data,
  series,
}: {
  data: Record<string, string | number>[];
  series: DailySalesSeries[];
}) {
  const { theme } = useTheme();
  const { series: seriesColors, ink } = getChartPalette(theme);
  const colors = [seriesColors[1], seriesColors[2], seriesColors[3], seriesColors[4], seriesColors[5]];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={ink.grid} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: ink.axis }}
          tick={{ fill: ink.muted, fontSize: 11 }}
          interval={4}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: ink.muted, fontSize: 12 }} />
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
        />
        <Legend wrapperStyle={{ fontSize: 12, color: ink.secondary }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

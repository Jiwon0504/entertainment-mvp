"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getChartPalette } from "@/lib/theme/palette";
import { useTheme } from "@/lib/theme/ThemeContext";

export interface CategoryRiskDatum {
  category: string;
  riskScore: number;
}

export function RiskByCategoryChart({ data, riskScoreLabel }: { data: CategoryRiskDatum[]; riskScoreLabel: string }) {
  const { theme } = useTheme();
  const { series, ink } = getChartPalette(theme);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={ink.grid} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={{ stroke: ink.axis }}
          tick={{ fill: ink.muted, fontSize: 12 }}
        />
        <YAxis
          type="category"
          dataKey="category"
          tickLine={false}
          axisLine={false}
          width={90}
          tick={{ fill: ink.secondary, fontSize: 12 }}
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
          formatter={(value) => [`${value}/100`, riskScoreLabel]}
        />
        <Bar dataKey="riskScore" name={riskScoreLabel} fill={series[1]} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

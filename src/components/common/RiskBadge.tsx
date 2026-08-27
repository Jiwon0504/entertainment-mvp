"use client";

import { RiskLevel } from "@/lib/engine/shortagePrediction";
import { useLocale } from "@/lib/i18n/LocaleContext";

const colorVar: Record<RiskLevel, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  serious: "var(--status-serious)",
  critical: "var(--status-critical)",
};

const labelKey: Record<RiskLevel, string> = {
  good: "risk.good",
  warning: "risk.warning",
  serious: "risk.serious",
  critical: "risk.critical",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const { t } = useLocale();
  const color = colorVar[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ borderColor: color, color }}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {t(labelKey[level])}
    </span>
  );
}

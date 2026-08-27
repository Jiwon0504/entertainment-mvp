interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "neutral" | "good" | "warning" | "serious" | "critical";
}

const toneStyles: Record<NonNullable<StatCardProps["tone"]>, string> = {
  neutral: "text-(--text-primary)",
  good: "text-(--status-good)",
  warning: "text-(--status-warning)",
  serious: "text-(--status-serious)",
  critical: "text-(--status-critical)",
};

export function StatCard({ label, value, sublabel, tone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
      <div className="text-xs font-medium text-(--text-muted)">{label}</div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${toneStyles[tone]}`}>{value}</div>
      {sublabel ? <div className="mt-1 text-xs text-(--text-secondary)">{sublabel}</div> : null}
    </div>
  );
}

import { SupplyChainHop } from "@/lib/engine/rootCause";

const STATUS_COLOR: Record<SupplyChainHop["status"], string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  delayed: "var(--status-critical)",
};

export function SupplyChainFlow({ hops }: { hops: SupplyChainHop[] }) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {hops.map((hop, i) => (
        <div key={`${hop.stage}-${i}`} className="flex items-center gap-2">
          <div
            className="min-w-[150px] rounded-lg border bg-(--surface-page) px-3 py-2"
            style={{ borderColor: STATUS_COLOR[hop.status] }}
          >
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[hop.status] }}
              />
              <span className="text-xs font-medium text-(--text-primary)">{hop.label}</span>
            </div>
            <div className="mt-1 text-[11px] text-(--text-secondary)">{hop.detail}</div>
          </div>
          {i < hops.length - 1 ? (
            <span aria-hidden className="text-(--text-muted)">
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

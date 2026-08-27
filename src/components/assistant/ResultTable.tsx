"use client";

import Link from "next/link";
import { RiskBadge } from "@/components/common/RiskBadge";
import { SupplyRiskRow } from "@/lib/engine/shortagePrediction";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeCity } from "@/lib/i18n/domain";

export function ResultTable({ rows }: { rows: SupplyRiskRow[] }) {
  const { locale, t } = useLocale();

  if (rows.length === 0) {
    return <p className="text-sm text-(--text-secondary)">{t("assistant.resultEmpty")}</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-(--border-hairline) text-xs text-(--text-muted)">
          <th className="py-1.5 pr-2 font-medium">{t("dashboard.topRiskTable.sku")}</th>
          <th className="py-1.5 pr-2 font-medium">{t("dashboard.topRiskTable.concert")}</th>
          <th className="py-1.5 pr-2 text-right font-medium">{t("dashboard.topRiskTable.inventory")}</th>
          <th className="py-1.5 pr-2 text-right font-medium">{t("dashboard.topRiskTable.forecast")}</th>
          <th className="py-1.5 pr-2 text-right font-medium">{t("dashboard.topRiskTable.shortage")}</th>
          <th className="py-1.5 font-medium">{t("dashboard.topRiskTable.risk")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.skuId}-${row.concertId}`} className="border-b border-(--border-hairline) last:border-0">
            <td className="py-1.5 pr-2">
              <Link href={`/inventory/${row.skuId}`} className="font-medium hover:underline">
                {row.skuName}
              </Link>
            </td>
            <td className="py-1.5 pr-2 text-(--text-secondary)">
              {localizeCity(row.concertCity, locale)} (D-{row.daysToConcert})
            </td>
            <td className="py-1.5 pr-2 text-right tabular-nums">{row.inventoryQty.toLocaleString()}</td>
            <td className="py-1.5 pr-2 text-right tabular-nums">{row.forecastQty.toLocaleString()}</td>
            <td className="py-1.5 pr-2 text-right tabular-nums text-(--status-critical)">
              {row.shortageQty > 0 ? row.shortageQty.toLocaleString() : "—"}
            </td>
            <td className="py-1.5">
              <RiskBadge level={row.riskLevel} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

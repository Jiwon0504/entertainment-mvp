"use client";

import Link from "next/link";
import { RiskBadge } from "@/components/common/RiskBadge";
import { getProductById, getSkus } from "@/lib/data";
import { getSupplyRiskRowsBySku, RiskLevel } from "@/lib/engine/shortagePrediction";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeCategory } from "@/lib/i18n/domain";

const riskOrder: RiskLevel[] = ["critical", "serious", "warning", "good"];

export default function InventoryListPage() {
  const { locale, t } = useLocale();
  const skus = getSkus();

  const rows = skus.map((sku) => {
    const skuRows = getSupplyRiskRowsBySku(sku.id);
    const totalInventory = skuRows.reduce((sum, r) => sum + r.inventoryQty, 0);
    const totalShortage = skuRows.reduce((sum, r) => sum + r.shortageQty, 0);
    const worstRisk = riskOrder.find((level) => skuRows.some((r) => r.riskLevel === level)) ?? "good";
    return { sku, totalInventory, totalShortage, worstRisk };
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-xl font-semibold text-(--text-primary)">{t("inventory.listTitle")}</h1>
      <p className="mt-1 text-sm text-(--text-secondary)">
        {t("inventory.listSubtitle", { count: skus.length })}
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-(--border-hairline) bg-(--surface-card)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--border-hairline) text-xs text-(--text-muted)">
              <th className="px-4 py-2.5 font-medium">{t("inventory.columns.sku")}</th>
              <th className="px-4 py-2.5 font-medium">{t("inventory.columns.category")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.columns.unitPrice")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.columns.totalInventory")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.columns.totalShortage")}</th>
              <th className="px-4 py-2.5 font-medium">{t("inventory.columns.worstRisk")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ sku, totalInventory, totalShortage, worstRisk }) => (
              <tr key={sku.id} className="border-b border-(--border-hairline) last:border-0 hover:bg-(--surface-page)">
                <td className="px-4 py-2.5">
                  <Link href={`/inventory/${sku.id}`} className="font-medium hover:underline">
                    {sku.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-(--text-secondary)">
                  {localizeCategory(getProductById(sku.productId)?.category ?? "", locale)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">₩{sku.unitPrice.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{totalInventory.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-(--status-critical)">
                  {totalShortage > 0 ? totalShortage.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <RiskBadge level={worstRisk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

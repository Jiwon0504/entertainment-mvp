"use client";

import Link from "next/link";
import { RiskBadge } from "@/components/common/RiskBadge";
import { DailySalesChart, DailySalesSeries } from "@/components/inventory/DailySalesChart";
import {
  getDemandForecastsBySku,
  getEventsBySku,
  getFactoryById,
  getProductById,
  getProductionOrdersBySku,
  getShipmentsBySku,
  getSkuById,
  getWarehouseById,
} from "@/lib/data";
import { getSupplyRiskRowsBySku } from "@/lib/engine/shortagePrediction";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeCategory, localizeCity, localizeFactory, localizeWarehouse } from "@/lib/i18n/domain";

export function SkuDetailClient({ skuId }: { skuId: string }) {
  const { locale, t } = useLocale();
  const sku = getSkuById(skuId);
  if (!sku) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link href="/inventory" className="text-xs text-(--series-1) hover:underline">
          {t("common.allSkus")}
        </Link>
        <p className="mt-4 text-sm text-(--text-secondary)">SKU not found: {skuId}</p>
      </div>
    );
  }

  const product = getProductById(sku.productId)!;
  const riskRows = getSupplyRiskRowsBySku(skuId);
  const productionOrders = getProductionOrdersBySku(skuId);
  const shipments = getShipmentsBySku(skuId);
  const events = getEventsBySku(skuId);

  const forecasts = getDemandForecastsBySku(skuId);
  const series: DailySalesSeries[] = riskRows.map((r) => ({
    key: r.concertId,
    label: localizeCity(r.concertCity, locale),
  }));
  const chartData = (forecasts[0]?.dailySales ?? []).map((point, i) => {
    const row: Record<string, string | number> = { date: point.date.slice(5) };
    for (const forecast of forecasts) {
      row[forecast.concertId] = forecast.dailySales[i]?.quantity ?? 0;
    }
    return row;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/inventory" className="text-xs text-(--series-1) hover:underline">
        {t("common.allSkus")}
      </Link>
      <div className="mt-2 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-(--text-primary)">{sku.name}</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            {t("inventory.detail.meta", {
              category: localizeCategory(product.category, locale),
              price: sku.unitPrice.toLocaleString(),
              days: product.productionLeadTimeDays,
            })}
          </p>
        </div>
        <Link
          href={`/assistant?sku=${sku.id}&q=${encodeURIComponent(
            locale === "ko" ? "왜 이 상품의 재고가 부족한가?" : "Why is this product's inventory short?"
          )}`}
          className="shrink-0 rounded-md bg-(--series-1) px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          {t("inventory.detail.askAiButton")}
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-(--border-hairline) bg-(--surface-card)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--border-hairline) text-xs text-(--text-muted)">
              <th className="px-4 py-2.5 font-medium">{t("inventory.detail.table.warehouseCountry")}</th>
              <th className="px-4 py-2.5 font-medium">{t("inventory.detail.table.concert")}</th>
              <th className="px-4 py-2.5 font-medium">{t("inventory.detail.table.daysLeft")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.detail.table.inventory")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.detail.table.reserved")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.detail.table.safetyStock")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.detail.table.forecastDemand")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("inventory.detail.table.gap")}</th>
              <th className="px-4 py-2.5 font-medium">{t("inventory.detail.table.risk")}</th>
            </tr>
          </thead>
          <tbody>
            {riskRows.map((row) => (
              <tr key={`${row.warehouseId}-${row.concertId}`} className="border-b border-(--border-hairline) last:border-0">
                <td className="px-4 py-2.5">{localizeWarehouse(row.warehouseName, locale)}</td>
                <td className="px-4 py-2.5 text-(--text-secondary)">{localizeCity(row.concertCity, locale)}</td>
                <td className="px-4 py-2.5 text-(--text-secondary)">{row.daysToConcert}d</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.inventoryQty.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-(--text-secondary)">
                  {row.reservedQty.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.safetyStock.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{row.forecastQty.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {row.shortageQty > 0 ? (
                    <span className="text-(--status-critical)">-{row.shortageQty.toLocaleString()}</span>
                  ) : row.surplusQty > 0 ? (
                    <span className="text-(--status-warning)">+{row.surplusQty.toLocaleString()}</span>
                  ) : (
                    t("common.balanced")
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <RiskBadge level={row.riskLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
        <h2 className="text-sm font-medium text-(--text-primary)">{t("inventory.detail.dailySalesTitle")}</h2>
        <DailySalesChart data={chartData} series={series} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
          <h2 className="text-sm font-medium text-(--text-primary)">{t("inventory.detail.productionOrders.title")}</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--border-hairline) text-xs text-(--text-muted)">
                <th className="px-2 py-1.5 font-medium">{t("inventory.detail.productionOrders.orderDate")}</th>
                <th className="px-2 py-1.5 text-right font-medium">{t("inventory.detail.productionOrders.qty")}</th>
                <th className="px-2 py-1.5 font-medium">{t("inventory.detail.productionOrders.expected")}</th>
                <th className="px-2 py-1.5 font-medium">{t("inventory.detail.productionOrders.status")}</th>
              </tr>
            </thead>
            <tbody>
              {productionOrders.map((po) => (
                <tr key={po.id} className="border-b border-(--border-hairline) last:border-0">
                  <td className="px-2 py-1.5 text-(--text-secondary)">{po.orderDate}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{po.quantity.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-(--text-secondary)">{po.expectedCompletionDate}</td>
                  <td className="px-2 py-1.5">
                    {po.status === "delayed" ? (
                      <span className="text-(--status-serious)">
                        {t("inventory.detail.status.delayed", { days: po.delayDays })}
                      </span>
                    ) : po.status === "completed" ? (
                      <span className="text-(--status-good)">{t("inventory.detail.status.completed")}</span>
                    ) : (
                      <span className="text-(--text-secondary)">{t("inventory.detail.status.inProgress")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
          <h2 className="text-sm font-medium text-(--text-primary)">{t("inventory.detail.shipments.title")}</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-(--border-hairline) text-xs text-(--text-muted)">
                <th className="px-2 py-1.5 font-medium">{t("inventory.detail.shipments.route")}</th>
                <th className="px-2 py-1.5 text-right font-medium">{t("inventory.detail.shipments.qty")}</th>
                <th className="px-2 py-1.5 font-medium">{t("inventory.detail.shipments.expected")}</th>
                <th className="px-2 py-1.5 font-medium">{t("inventory.detail.shipments.eta")}</th>
                <th className="px-2 py-1.5 font-medium">{t("inventory.detail.shipments.status")}</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => {
                const fromEntity = s.fromType === "factory" ? getFactoryById(s.fromId) : getWarehouseById(s.fromId);
                const fromName = fromEntity
                  ? s.fromType === "factory"
                    ? localizeFactory(fromEntity.name, locale)
                    : localizeWarehouse(fromEntity.name, locale)
                  : s.fromId;
                const toWarehouse = getWarehouseById(s.toWarehouseId);
                const toName = toWarehouse ? localizeWarehouse(toWarehouse.name, locale) : s.toWarehouseId;
                return (
                  <tr key={s.id} className="border-b border-(--border-hairline) last:border-0">
                    <td className="px-2 py-1.5 text-(--text-secondary)">
                      {fromName} → {toName}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{s.quantity.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-(--text-secondary)">{s.expectedArrival}</td>
                    <td className="px-2 py-1.5 text-(--text-secondary)">{s.actualArrival}</td>
                    <td className="px-2 py-1.5">
                      {s.status === "delayed" ? (
                        <span className="text-(--status-serious)">
                          {t("inventory.detail.status.delayed", { days: s.delayDays })}
                        </span>
                      ) : s.status === "delivered" ? (
                        <span className="text-(--status-good)">{t("inventory.detail.status.delivered")}</span>
                      ) : (
                        <span className="text-(--text-secondary)">{t("inventory.detail.status.inTransit")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="mt-6 rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
          <h2 className="text-sm font-medium text-(--text-primary)">{t("inventory.detail.events.title")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-(--text-secondary)">
            {events.map((e) => (
              <li key={e.id} className="flex gap-2">
                <span className="shrink-0 tabular-nums text-(--text-muted)">{e.date}</span>
                <span>{locale === "ko" ? e.descriptionKo : e.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

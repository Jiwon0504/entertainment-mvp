"use client";

import Link from "next/link";
import { StatCard } from "@/components/common/StatCard";
import { RiskBadge } from "@/components/common/RiskBadge";
import { InventoryVsDemandChart, ConcertDemandDatum } from "@/components/dashboard/InventoryVsDemandChart";
import { RiskByCategoryChart } from "@/components/dashboard/RiskByCategoryChart";
import { getDashboardSummary } from "@/lib/engine/dashboard";
import { getConcertRiskSummaries } from "@/lib/engine/rootCause";
import { getSupplyRiskRows } from "@/lib/engine/shortagePrediction";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeCategory, localizeCity } from "@/lib/i18n/domain";

function formatKrw(value: number): string {
  return `₩${Math.round(value / 1_000_000).toLocaleString()}M`;
}

export default function DashboardPage() {
  const { locale, t, tList } = useLocale();
  const summary = getDashboardSummary();
  const rows = getSupplyRiskRows();

  const demandByCity = new Map<string, ConcertDemandDatum>();
  for (const row of rows) {
    const city = localizeCity(row.concertCity, locale);
    const existing = demandByCity.get(city) ?? { city, inventory: 0, forecast: 0 };
    existing.inventory += row.inventoryQty;
    existing.forecast += row.forecastQty;
    demandByCity.set(city, existing);
  }

  const riskByCategory = summary.riskByCategory.map((r) => ({
    category: localizeCategory(r.category, locale),
    riskScore: r.riskScore,
  }));

  const askAiQuery = tList("assistant.exampleQuestions")[1] ?? "";
  const riskScenarios = getConcertRiskSummaries();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-(--text-primary)">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-(--text-secondary)">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("dashboard.kpi.totalSkus")} value={summary.totalSkus.toString()} />
        <StatCard label={t("dashboard.kpi.totalInventory")} value={summary.totalInventoryUnits.toLocaleString()} />
        <StatCard
          label={t("dashboard.kpi.inventoryAtRisk")}
          value={summary.inventoryAtRiskUnits.toLocaleString()}
          tone={summary.inventoryAtRiskUnits > 0 ? "critical" : "good"}
        />
        <StatCard
          label={t("dashboard.kpi.shortageSkus")}
          value={summary.shortageSkuCount.toString()}
          tone={summary.shortageSkuCount > 0 ? "critical" : "good"}
        />
        <StatCard
          label={t("dashboard.kpi.surplusSkus")}
          value={summary.surplusSkuCount.toString()}
          tone={summary.surplusSkuCount > 0 ? "warning" : "good"}
        />
        <StatCard label={t("dashboard.kpi.unitsInProduction")} value={summary.unitsInProduction.toLocaleString()} />
        <StatCard label={t("dashboard.kpi.unitsInTransit")} value={summary.unitsInTransit.toLocaleString()} />
        <StatCard
          label={t("dashboard.kpi.delayed")}
          value={`${summary.delayedProductionCount} / ${summary.delayedShipmentCount}`}
          tone={summary.delayedProductionCount + summary.delayedShipmentCount > 0 ? "serious" : "good"}
        />
        <StatCard
          label={t("dashboard.kpi.projectedRevenue")}
          value={formatKrw(summary.projectedRevenue)}
          sublabel={t("dashboard.kpi.acrossConcerts")}
        />
      </div>

      {summary.revenueAtRisk > 0 ? (
        <div className="mt-3 rounded-lg border border-(--status-critical) bg-(--surface-card) px-4 py-2 text-sm text-(--status-critical)">
          {t("dashboard.revenueAtRisk", { amount: formatKrw(summary.revenueAtRisk) })}
        </div>
      ) : null}

      {riskScenarios.length > 0 ? (
        <div className="mt-6 rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
          <h2 className="text-sm font-medium text-(--text-primary)">{t("dashboard.riskScenarios.title")}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {riskScenarios.map((s) => (
              <Link
                key={s.concertId}
                href={`/risk/${s.concertId}`}
                className="rounded-lg border border-(--status-critical) bg-(--surface-page) p-3 transition-colors hover:bg-(--status-critical)/10"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-(--text-primary)">{localizeCity(s.city, locale)}</span>
                  <span className="rounded-full border border-(--status-critical) px-2 py-0.5 text-xs font-semibold text-(--status-critical)">
                    D-{s.daysToConcert}
                  </span>
                </div>
                <p className="mt-1 text-xs text-(--text-secondary)">
                  {t("dashboard.riskScenarios.skusAtRisk", { count: s.atRiskSkuCount })} ·{" "}
                  {t("dashboard.riskScenarios.shortageUnits", { count: s.totalShortageUnits.toLocaleString() })}
                </p>
                <p className="mt-2 text-xs font-medium text-(--series-1)">{t("dashboard.riskScenarios.investigate")}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
          <h2 className="text-sm font-medium text-(--text-primary)">{t("dashboard.charts.inventoryVsDemand")}</h2>
          <InventoryVsDemandChart
            data={Array.from(demandByCity.values())}
            inventoryLabel={t("dashboard.charts.inventoryOnHand")}
            forecastLabel={t("dashboard.charts.forecastedDemand")}
          />
        </div>
        <div className="rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
          <h2 className="text-sm font-medium text-(--text-primary)">{t("dashboard.charts.riskByCategory")}</h2>
          <RiskByCategoryChart data={riskByCategory} riskScoreLabel={t("dashboard.charts.riskScore")} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-(--series-1) bg-(--surface-card) p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-(--text-primary)">{t("dashboard.askCard.title")}</h2>
            <p className="mt-1 text-xs text-(--text-secondary)">{t("dashboard.askCard.subtitle")}</p>
          </div>
          <Link
            href={`/assistant?q=${encodeURIComponent(askAiQuery)}`}
            className="shrink-0 rounded-md bg-(--series-1) px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            {t("common.askAi")}
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-(--text-primary)">{t("dashboard.topRiskTable.title")}</h2>
          <Link href="/inventory" className="text-xs text-(--series-1) hover:underline">
            {t("common.viewAllSkus")}
          </Link>
        </div>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--border-hairline) text-xs text-(--text-muted)">
              <th className="px-2 py-2 font-medium">{t("dashboard.topRiskTable.sku")}</th>
              <th className="px-2 py-2 font-medium">{t("dashboard.topRiskTable.concert")}</th>
              <th className="px-2 py-2 font-medium">{t("dashboard.topRiskTable.daysLeft")}</th>
              <th className="px-2 py-2 text-right font-medium">{t("dashboard.topRiskTable.inventory")}</th>
              <th className="px-2 py-2 text-right font-medium">{t("dashboard.topRiskTable.forecast")}</th>
              <th className="px-2 py-2 text-right font-medium">{t("dashboard.topRiskTable.shortage")}</th>
              <th className="px-2 py-2 font-medium">{t("dashboard.topRiskTable.risk")}</th>
            </tr>
          </thead>
          <tbody>
            {summary.topRiskRows.map((row) => (
              <tr key={`${row.skuId}-${row.concertId}`} className="border-b border-(--border-hairline) last:border-0">
                <td className="px-2 py-2">
                  <Link href={`/inventory/${row.skuId}`} className="hover:underline">
                    {row.skuName}
                  </Link>
                </td>
                <td className="px-2 py-2 text-(--text-secondary)">{localizeCity(row.concertCity, locale)}</td>
                <td className="px-2 py-2 text-(--text-secondary)">{row.daysToConcert}d</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.inventoryQty.toLocaleString()}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.forecastQty.toLocaleString()}</td>
                <td className="px-2 py-2 text-right tabular-nums text-(--status-critical)">
                  {row.shortageQty > 0 ? row.shortageQty.toLocaleString() : "—"}
                </td>
                <td className="px-2 py-2">
                  <RiskBadge level={row.riskLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

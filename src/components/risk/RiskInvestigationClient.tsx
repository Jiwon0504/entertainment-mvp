"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RiskBadge } from "@/components/common/RiskBadge";
import { SupplyChainFlow } from "./SupplyChainFlow";
import { getConcertById } from "@/lib/data";
import { getAtRiskRowsByConcert, getConcertRiskSummaries, getRootCauseTrace } from "@/lib/engine/rootCause";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeCity, localizeCountry } from "@/lib/i18n/domain";

const TOTAL_STEPS = 8;

function formatKrw(value: number): string {
  return `₩${Math.round(value / 1_000_000).toLocaleString()}M`;
}

export function RiskInvestigationClient({ concertId }: { concertId: string }) {
  const { locale, t } = useLocale();
  const concert = getConcertById(concertId);
  const atRiskRows = useMemo(() => getAtRiskRowsByConcert(concertId), [concertId]);
  const [selectedSkuId, setSelectedSkuId] = useState<string | undefined>(atRiskRows[0]?.skuId);
  const [openStep, setOpenStep] = useState(1);

  if (!concert) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-(--text-secondary)">Concert not found: {concertId}</p>
      </div>
    );
  }

  const activeSkuId = selectedSkuId ?? atRiskRows[0]?.skuId;
  const selectedRow = atRiskRows.find((r) => r.skuId === activeSkuId);
  const trace = activeSkuId ? getRootCauseTrace(activeSkuId, concertId, locale) : undefined;
  const eventSummary = getConcertRiskSummaries().find((s) => s.concertId === concertId);

  const cityName = localizeCity(concert.city, locale);
  const countryName = localizeCountry(
    concert.countryId === "country-kr" ? "South Korea" : concert.countryId === "country-jp" ? "Japan" : "United States",
    locale
  );

  function goToStep(n: number) {
    setOpenStep(Math.max(openStep, n));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/dashboard" className="text-xs text-(--series-1) hover:underline">
        {t("riskInvestigation.backToDashboard")}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-(--text-primary)">{t("riskInvestigation.pageTitle")}</h1>
      <p className="mt-1 text-sm text-(--text-secondary)">{t("riskInvestigation.pageSubtitle")}</p>

      {atRiskRows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-(--border-hairline) bg-(--surface-card) p-4 text-sm text-(--text-secondary)">
          {t("riskInvestigation.noRisk")}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Step 1: Event */}
          <StepCard
            index={1}
            title={t("riskInvestigation.steps.event")}
            open={openStep >= 1}
            onHeaderClick={() => goToStep(1)}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-(--text-primary)">
                  {cityName} · {t(`riskInvestigation.venue`)}: {concert.venue}
                </div>
                <div className="mt-1 text-sm text-(--text-secondary)">
                  {countryName} · {concert.date} · {t("riskInvestigation.attendance")}{" "}
                  {concert.expectedAttendance.toLocaleString()}
                </div>
              </div>
              <div className="rounded-full border border-(--status-critical) px-3 py-1 text-sm font-semibold text-(--status-critical)">
                D-{eventSummary?.daysToConcert ?? selectedRow?.daysToConcert}
              </div>
            </div>
            <NextButton onClick={() => goToStep(2)} label={t("riskInvestigation.nextStep")} />
          </StepCard>

          {/* Step 2: SKU */}
          <StepCard
            index={2}
            title={t("riskInvestigation.steps.sku")}
            open={openStep >= 2}
            onHeaderClick={() => goToStep(2)}
          >
            <p className="text-sm text-(--text-secondary)">
              {t("riskInvestigation.selectSkuPrompt", { count: atRiskRows.length })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {atRiskRows.map((row) => (
                <button
                  key={row.skuId}
                  onClick={() => {
                    setSelectedSkuId(row.skuId);
                    goToStep(2);
                  }}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                    row.skuId === activeSkuId
                      ? "border-(--series-1) bg-(--series-1)/10 text-(--series-1)"
                      : "border-(--border-hairline) text-(--text-secondary) hover:border-(--series-1)"
                  }`}
                >
                  {row.skuName}
                  <RiskBadge level={row.riskLevel} />
                </button>
              ))}
            </div>
            <NextButton onClick={() => goToStep(3)} label={t("riskInvestigation.nextStep")} />
          </StepCard>

          {selectedRow && trace ? (
            <>
              {/* Step 3: Current inventory */}
              <StepCard
                index={3}
                title={t("riskInvestigation.steps.inventory")}
                open={openStep >= 3}
                onHeaderClick={() => goToStep(3)}
              >
                <div className="grid grid-cols-3 gap-3">
                  <Stat label={t("riskInvestigation.onHand")} value={selectedRow.inventoryQty} />
                  <Stat label={t("riskInvestigation.reserved")} value={selectedRow.reservedQty} />
                  <Stat label={t("riskInvestigation.available")} value={selectedRow.availableQty} emphasize />
                </div>
                <NextButton onClick={() => goToStep(4)} label={t("riskInvestigation.nextStep")} />
              </StepCard>

              {/* Step 4: Forecast demand */}
              <StepCard
                index={4}
                title={t("riskInvestigation.steps.demand")}
                open={openStep >= 4}
                onHeaderClick={() => goToStep(4)}
              >
                <Stat label={t("riskInvestigation.forecastDemand")} value={selectedRow.forecastQty} emphasize />
                <NextButton onClick={() => goToStep(5)} label={t("riskInvestigation.nextStep")} />
              </StepCard>

              {/* Step 5: Projected shortage */}
              <StepCard
                index={5}
                title={t("riskInvestigation.steps.shortage")}
                open={openStep >= 5}
                onHeaderClick={() => goToStep(5)}
              >
                {selectedRow.shortageQty > 0 ? (
                  <Stat
                    label={t("riskInvestigation.projectedShortage")}
                    value={selectedRow.shortageQty}
                    tone="critical"
                    emphasize
                  />
                ) : (
                  <p className="text-sm text-(--text-secondary)">{t("riskInvestigation.noShortageForSku")}</p>
                )}
                <NextButton onClick={() => goToStep(6)} label={t("riskInvestigation.nextStep")} />
              </StepCard>

              {/* Step 6: Supply chain investigation */}
              <StepCard
                index={6}
                title={t("riskInvestigation.steps.investigation")}
                open={openStep >= 6}
                onHeaderClick={() => goToStep(6)}
              >
                <p className="mb-3 text-xs text-(--text-muted)">{t("riskInvestigation.supplyChainFlowCaption")}</p>
                <SupplyChainFlow hops={trace.hops} />
                <NextButton onClick={() => goToStep(7)} label={t("riskInvestigation.nextStep")} />
              </StepCard>

              {/* Step 7: Root cause */}
              <StepCard
                index={7}
                title={t("riskInvestigation.steps.rootCause")}
                open={openStep >= 7}
                onHeaderClick={() => goToStep(7)}
              >
                <p className="mb-2 text-xs text-(--text-muted)">{t("riskInvestigation.rootCauseCaption")}</p>
                <ol className="space-y-2">
                  {trace.causalChain.map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm text-(--text-secondary)">
                      <span className="shrink-0 font-medium text-(--series-1)">{i + 1}.</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ol>
                <NextButton onClick={() => goToStep(8)} label={t("riskInvestigation.nextStep")} />
              </StepCard>

              {/* Step 8: Business impact */}
              <StepCard
                index={8}
                title={t("riskInvestigation.steps.impact")}
                open={openStep >= 8}
                onHeaderClick={() => goToStep(8)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <Stat
                    label={t("riskInvestigation.revenueAtRiskForSku")}
                    valueLabel={formatKrw(trace.revenueAtRisk)}
                    tone="critical"
                    emphasize
                  />
                  {eventSummary ? (
                    <Stat
                      label={t("riskInvestigation.revenueAtRiskForEvent")}
                      valueLabel={formatKrw(eventSummary.revenueAtRisk)}
                      tone="critical"
                    />
                  ) : null}
                </div>

                <div className="mt-4 rounded-md border border-(--border-hairline) bg-(--surface-page) p-3">
                  <div className="text-sm font-medium text-(--text-primary)">
                    {t("riskInvestigation.nextStepsTitle")}
                  </div>
                  <p className="mt-1 text-xs text-(--text-secondary)">{t("riskInvestigation.nextStepsBody")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/assistant?sku=${activeSkuId}&q=${encodeURIComponent(
                        locale === "ko" ? "왜 이 상품의 재고가 부족한가?" : "Why is this product's inventory short?"
                      )}`}
                      className="rounded-md bg-(--series-1) px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      {t("riskInvestigation.askAiAboutThis")}
                    </Link>
                    <span className="cursor-not-allowed rounded-md border border-dashed border-(--border-hairline) px-3 py-1.5 text-xs text-(--text-muted) opacity-60">
                      {t("riskInvestigation.whatIfComingSoon")}
                    </span>
                  </div>
                </div>
              </StepCard>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function StepCard({
  index,
  title,
  open,
  onHeaderClick,
  children,
}: {
  index: number;
  title: string;
  open: boolean;
  onHeaderClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-(--border-hairline) bg-(--surface-card)">
      <button
        onClick={onHeaderClick}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-(--surface-page)"
      >
        <span className="text-sm font-semibold text-(--text-primary)">{title}</span>
        <span className="text-xs text-(--text-muted)">
          {index}/{TOTAL_STEPS}
        </span>
      </button>
      {open ? <div className="border-t border-(--border-hairline) px-4 py-4">{children}</div> : null}
    </div>
  );
}

function NextButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 rounded-md border border-(--series-1) px-3 py-1.5 text-xs font-medium text-(--series-1) hover:bg-(--series-1)/10"
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  valueLabel,
  tone,
  emphasize,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
  tone?: "critical";
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-md border border-(--border-hairline) bg-(--surface-page) px-3 py-2">
      <div className="text-xs text-(--text-muted)">{label}</div>
      <div
        className={`mt-1 tabular-nums ${emphasize ? "text-xl font-semibold" : "text-base font-medium"} ${
          tone === "critical" ? "text-(--status-critical)" : "text-(--text-primary)"
        }`}
      >
        {valueLabel ?? value?.toLocaleString()}
      </div>
    </div>
  );
}

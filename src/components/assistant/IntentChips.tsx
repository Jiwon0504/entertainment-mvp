"use client";

import { ParsedQuery } from "@/lib/ai/parser";
import { getCountryById } from "@/lib/data";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeCategory, localizeCity, localizeCountry } from "@/lib/i18n/domain";

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-(--border-hairline) bg-(--surface-page) px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-(--text-muted)">{label}</div>
      <div className="text-sm font-medium text-(--text-primary)">{value}</div>
    </div>
  );
}

export function IntentChips({ parsed }: { parsed: ParsedQuery }) {
  const { locale, t } = useLocale();

  const chips: { label: string; value: string }[] = [
    { label: t("assistant.chips.intent"), value: t(`assistant.intentLabel.${parsed.intent}`) },
  ];
  if (parsed.concertCity) {
    chips.push({ label: t("assistant.chips.event"), value: `${localizeCity(parsed.concertCity, locale)}` });
  }
  if (parsed.countryName) {
    chips.push({ label: t("assistant.chips.location"), value: localizeCountry(parsed.countryName, locale) });
  }
  if (parsed.timeHorizonDays != null) {
    chips.push({ label: t("assistant.chips.timeHorizon"), value: `D-${parsed.timeHorizonDays}` });
  }
  if (parsed.productCategory) {
    chips.push({ label: t("assistant.chips.entity"), value: localizeCategory(parsed.productCategory, locale) });
  }
  if (parsed.transfer) {
    const fromName = getCountryById(parsed.transfer.fromCountryId)?.name ?? parsed.transfer.fromCountryId;
    const toName = getCountryById(parsed.transfer.toCountryId)?.name ?? parsed.transfer.toCountryId;
    chips.push({
      label: t("assistant.chips.transfer"),
      value: `${localizeCountry(fromName, locale)} → ${localizeCountry(toName, locale)}`,
    });
  }
  chips.push({ label: t("assistant.chips.confidence"), value: `${Math.round(parsed.confidence * 100)}%` });

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Chip key={c.label} label={c.label} value={c.value} />
        ))}
      </div>
      {parsed.usedFallback ? (
        <p className="mt-2 text-xs text-(--status-warning)">{t("assistant.fallbackNotice")}</p>
      ) : null}
    </div>
  );
}

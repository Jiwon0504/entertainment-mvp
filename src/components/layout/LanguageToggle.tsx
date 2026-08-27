"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex items-center rounded-md border border-(--border-hairline) text-xs">
      <button
        type="button"
        onClick={() => setLocale("ko")}
        aria-pressed={locale === "ko"}
        className={`rounded-l-md px-2 py-1 font-medium ${
          locale === "ko" ? "bg-(--series-1) text-white" : "text-(--text-secondary) hover:text-(--text-primary)"
        }`}
      >
        {t("language.korean")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={`rounded-r-md px-2 py-1 font-medium ${
          locale === "en" ? "bg-(--series-1) text-white" : "text-(--text-secondary) hover:text-(--text-primary)"
        }`}
      >
        {t("language.english")}
      </button>
    </div>
  );
}

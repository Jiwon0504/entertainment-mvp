"use client";

import { useTheme } from "@/lib/theme/ThemeContext";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  return (
    <div className="flex items-center rounded-md border border-(--border-hairline) text-xs">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        className={`rounded-l-md px-2 py-1 font-medium ${
          theme === "light" ? "bg-(--series-1) text-white" : "text-(--text-secondary) hover:text-(--text-primary)"
        }`}
      >
        {t("theme.light")}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        className={`rounded-r-md px-2 py-1 font-medium ${
          theme === "dark" ? "bg-(--series-1) text-white" : "text-(--text-secondary) hover:text-(--text-primary)"
        }`}
      >
        {t("theme.dark")}
      </button>
    </div>
  );
}

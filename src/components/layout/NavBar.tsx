"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";

export function NavBar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const links = [
    { href: "/dashboard", label: t("nav.controlTower") },
    { href: "/inventory", label: t("nav.inventory") },
    { href: "/assistant", label: t("nav.assistant") },
  ];
  const disabled = [t("nav.supplyChainMap"), t("nav.whatIfSimulation")];

  return (
    <header className="border-b border-(--border-hairline) bg-(--surface-card)">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-(--text-primary)">
          NOVA Supply Chain Control Tower
        </span>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-6 pb-2.5">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-(--series-1)/15 text-(--series-1)"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <span className="mx-1 h-4 w-px bg-(--border-hairline)" aria-hidden />
        {disabled.map((label) => (
          <span
            key={label}
            aria-disabled="true"
            title={t("nav.soon")}
            className="cursor-not-allowed whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-(--text-muted) opacity-60"
          >
            {label} · {t("nav.soon")}
          </span>
        ))}
      </nav>
    </header>
  );
}

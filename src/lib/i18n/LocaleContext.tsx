"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionary, Locale } from "./dictionary";

const STORAGE_KEY = "nova.locale";
const DEFAULT_LOCALE: Locale = "ko";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  tList: (path: string) => string[];
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function resolvePath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Read the persisted preference after mount (not in a lazy initializer) so the
    // client's first render matches the server-rendered default and avoids a
    // hydration mismatch; this one-time sync-from-storage is intentional.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "ko" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionary[locale];
    const t = (path: string, vars?: Record<string, string | number>) => {
      const value = resolvePath(dict, path);
      if (typeof value !== "string") return path;
      return interpolate(value, vars);
    };
    const tList = (path: string) => {
      const value = resolvePath(dict, path);
      return Array.isArray(value) ? (value as string[]) : [];
    };
    return { locale, setLocale, t, tList };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

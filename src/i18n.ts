import localesData from "../locales.json";

type LocaleCatalog = Record<string, Record<string, string>>;

export type SupportedLocale = "es" | "en" | "fr";

export const DEFAULT_LOCALE: SupportedLocale = "es";
const SUPPORTED_LOCALES: SupportedLocale[] = ["es", "en", "fr"];

const catalog = localesData as LocaleCatalog;

let activeLocale: SupportedLocale = DEFAULT_LOCALE;

function resolveSupportedLocale(locale?: string | null): SupportedLocale {
  const normalized = locale?.split("-")[0]?.toLowerCase();

  if (normalized && SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  return DEFAULT_LOCALE;
}

function getLocaleMessages(locale: SupportedLocale): Record<string, string> {
  return catalog[locale] ?? catalog[DEFAULT_LOCALE] ?? {};
}

export function initializeLocale(): SupportedLocale {
  const detected = typeof navigator !== "undefined"
    ? resolveSupportedLocale(navigator.language)
    : DEFAULT_LOCALE;

  activeLocale = detected;

  return activeLocale;
}

export function setLocale(locale: SupportedLocale) {
  activeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function getLocale(): SupportedLocale {
  return activeLocale;
}

initializeLocale();

export function t(key: string, params?: Record<string, string | number>): string {
  const message =
    getLocaleMessages(activeLocale)[key] ??
    getLocaleMessages(DEFAULT_LOCALE)[key] ??
    key;

  if (!params) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];

    return value === undefined ? `{${name}}` : String(value);
  });
}

export function n(keyOne: string, keyMany: string, count: number): string {
  return count === 1 ? t(keyOne) : t(keyMany);
}

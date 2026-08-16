import localesData from "../locales.json";

export type SupportedLocale =
  "es" | "en" | "fr";

type Messages =
  Record<string, string>;

const SUPPORTED_LOCALES:
  SupportedLocale[] = [
    "es",
    "en",
    "fr",
  ];

function isSupportedLocale(
  locale: string,
): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(
    locale as SupportedLocale,
  );
}

export const DEFAULT_LOCALE:
  SupportedLocale =
  isSupportedLocale(
    localesData.defaultLocale,
  )
    ? localesData.defaultLocale
    : "es";

const catalog:
  Record<
    SupportedLocale,
    Messages
  > = {
  es:
    localesData.es,

  en:
    localesData.en,

  fr:
    localesData.fr,
};

let activeLocale:
  SupportedLocale =
  DEFAULT_LOCALE;

function resolveSupportedLocale(
  locale?: string | null,
): SupportedLocale {
  const normalized =
    locale
      ?.split("-")[0]
      ?.toLowerCase();

  if (
    normalized &&
    isSupportedLocale(
      normalized,
    )
  ) {
    return normalized;
  }

  return DEFAULT_LOCALE;
}

function getLocaleMessages(
  locale:
    SupportedLocale,
): Messages {
  return catalog[locale];
}

export function initializeLocale():
  SupportedLocale {
  const detected =
    typeof navigator !==
      "undefined"
      ? resolveSupportedLocale(
        navigator.language,
      )
      : DEFAULT_LOCALE;

  activeLocale =
    detected;

  return activeLocale;
}

export function setLocale(
  locale:
    SupportedLocale,
) {
  activeLocale =
    isSupportedLocale(
      locale,
    )
      ? locale
      : DEFAULT_LOCALE;
}

export function getLocale():
  SupportedLocale {
  return activeLocale;
}

initializeLocale();

export function t(
  key: string,
  params?:
    Record<
      string,
      string | number
    >,
): string {
  const message =
    getLocaleMessages(
      activeLocale,
    )[key] ??
    getLocaleMessages(
      DEFAULT_LOCALE,
    )[key] ??
    key;

  if (!params) {
    return message;
  }

  return message.replace(
    /\{(\w+)\}/g,
    (
      _,
      name: string,
    ) => {
      const value =
        params[name];

      return value ===
        undefined
        ? `{${name}}`
        : String(value);
    },
  );
}

export function n(
  keyOne: string,
  keyMany: string,
  count: number,
): string {
  return count === 1
    ? t(keyOne)
    : t(keyMany);
}
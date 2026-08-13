"use strict";

const LANGUAGE_CODES = [
  "af", "sq", "am", "ar", "hy", "az", "eu", "be", "bn", "bs", "bg", "my", "ca", "ceb",
  "zh-Hans", "zh-Hant", "co", "hr", "cs", "da", "nl", "en", "eo", "et", "fi", "fr", "fy",
  "gl", "ka", "de", "el", "gu", "ht", "ha", "haw", "he", "hi", "hmn", "hu", "is", "ig",
  "id", "ga", "it", "ja", "jv", "kn", "kk", "km", "ko", "ku", "ky", "lo", "la", "lv",
  "lt", "lb", "mk", "mg", "ms", "ml", "mt", "mi", "mr", "mn", "ne", "no", "ny", "or",
  "ps", "fa", "pl", "pt", "pa", "ro", "ru", "sm", "gd", "sr", "st", "sn", "sd", "si",
  "sk", "sl", "so", "es", "su", "sw", "sv", "tl", "tg", "ta", "tt", "te", "th", "tr",
  "tk", "uk", "ur", "ug", "uz", "vi", "cy", "xh", "yi", "yo", "zu",
];

const normalize = (value) => String(value || "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

export function languageCatalog(uiLanguage = "es") {
  const locale = uiLanguage === "en" ? "en" : "es";
  const currentNames = new Intl.DisplayNames([locale], { type: "language" });
  const spanishNames = new Intl.DisplayNames(["es"], { type: "language" });
  const englishNames = new Intl.DisplayNames(["en"], { type: "language" });
  return LANGUAGE_CODES.map((code) => ({
    code,
    name: currentNames.of(code) || code,
    search: normalize(`${code} ${spanishNames.of(code)} ${englishNames.of(code)}`),
  })).sort((left, right) => left.name.localeCompare(right.name, locale));
}

export function normalizeLanguageSearch(value) { return normalize(value); }

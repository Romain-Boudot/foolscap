import type { MathJsInstance } from "mathjs";

export type CurrencyRates = Record<string, number>;

/**
 * Snapshot of exchange rates. Each value is "1 UNIT = N USD" (i.e. how many
 * USD one unit of the given currency is worth). USD is the base, omitted here.
 * Refresh from a live source if you care about precision; these are good
 * enough for back-of-envelope work.
 */
export const FALLBACK_RATES: CurrencyRates = {
  EUR: 1.08,
  GBP: 1.25,
  JPY: 0.00667,
  CHF: 1.14,
  CAD: 0.74,
  AUD: 0.66,
  CNY: 0.139,
  HKD: 0.128,
  SEK: 0.095,
  NZD: 0.6,
  MXN: 0.055,
  BRL: 0.18,
  INR: 0.012,
  KRW: 0.00075,
  SGD: 0.74,
  NOK: 0.094,
  DKK: 0.145,
  PLN: 0.25,
  ZAR: 0.054,
  RUB: 0.011,
  TRY: 0.03,
};

export const CURRENCY_CODES: ReadonlySet<string> = new Set([
  "USD",
  ...Object.keys(FALLBACK_RATES),
]);

const ALIASES: Record<string, string[]> = Object.fromEntries(
  Array.from(CURRENCY_CODES).map((code) => [code, [code.toLowerCase()]]),
);

// mathjs forbids overriding a *base* unit (`override: true` only works for
// derived units with a `definition`). USD is our base, so we register it
// exactly once per process and from then on only refresh the derived
// currencies on rate updates.
let usdRegistered = false;

export function registerCurrencies(
  math: MathJsInstance,
  rates: CurrencyRates = FALLBACK_RATES,
): void {
  if (!usdRegistered) {
    math.createUnit("USD", { aliases: ALIASES.USD });
    usdRegistered = true;
  }
  for (const [code, rate] of Object.entries(rates)) {
    if (code === "USD") continue;
    math.createUnit(
      code,
      { definition: `${rate} USD`, aliases: ALIASES[code] ?? [] },
      { override: true },
    );
  }
}

// ---------- Symbol input ----------

const SYMBOL_TO_CODE: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₽": "RUB",
  "₩": "KRW",
  "₺": "TRY",
};

const SYMBOL_CLASS = `[${Object.keys(SYMBOL_TO_CODE).join("")}]`;
const NUMBER_PART = String.raw`\d+(?:,\d{3})*(?:\.\d+)?|\.\d+`;
const PREFIX_RE = new RegExp(`(${SYMBOL_CLASS})\\s*(${NUMBER_PART})`, "g");
const SUFFIX_RE = new RegExp(`(${NUMBER_PART})\\s*(${SYMBOL_CLASS})`, "g");

/**
 * Rewrite symbol-money patterns into mathjs-friendly form.
 * `$100` and `100$` both become ` 100 USD ` (with surrounding whitespace
 * so the tokens never glue onto neighboring expressions).
 */
export function preprocessSymbols(expr: string): string {
  return expr
    .replace(
      PREFIX_RE,
      (_, sym, num) => ` ${stripSep(num)} ${SYMBOL_TO_CODE[sym]} `,
    )
    .replace(
      SUFFIX_RE,
      (_, num, sym) => ` ${stripSep(num)} ${SYMBOL_TO_CODE[sym]} `,
    );
}

function stripSep(num: string): string {
  return num.replace(/,/g, "");
}

// ---------- Conversion keyword aliases ----------

// Map FR/EN conversion keywords to mathjs's `to`. Trade-off: these words
// can no longer be used as variable names (same constraint mathjs already
// has on `to` and `in`).
const KEYWORDS_RE = /\b(?:en|vers|into)\b/gi;

export function preprocessKeywords(expr: string): string {
  return expr.replace(KEYWORDS_RE, "to");
}

export function preprocessExpression(expr: string): string {
  return preprocessKeywords(preprocessSymbols(expr));
}

// ---------- Money output ----------

type CurrencyFormat = { symbol: string; before: boolean; decimals: number };

export function currencySymbol(code: string): string | null {
  return CURRENCY_FORMAT[code]?.symbol ?? null;
}

const CURRENCY_FORMAT: Record<string, CurrencyFormat> = {
  USD: { symbol: "$", before: true, decimals: 2 },
  EUR: { symbol: "€", before: true, decimals: 2 },
  GBP: { symbol: "£", before: true, decimals: 2 },
  JPY: { symbol: "¥", before: true, decimals: 0 },
  INR: { symbol: "₹", before: true, decimals: 2 },
  KRW: { symbol: "₩", before: true, decimals: 0 },
  RUB: { symbol: "₽", before: false, decimals: 2 },
  TRY: { symbol: "₺", before: true, decimals: 2 },
};

export function formatMoney(value: number, code: string): string {
  const fmt = CURRENCY_FORMAT[code];
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (fmt) {
    const num = formatNumber(abs, fmt.decimals);
    return fmt.before ? `${sign}${fmt.symbol}${num}` : `${sign}${num} ${fmt.symbol}`;
  }
  return `${sign}${formatNumber(abs, 2)} ${code}`;
}

function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  const [intPart, fracPart] = fixed.split(".");
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fracPart ? `${withSep}.${fracPart}` : withSep;
}

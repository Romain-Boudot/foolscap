import Database from "@tauri-apps/plugin-sql";
import { ref } from "vue";
import {
  type CurrencyRates,
  FALLBACK_RATES,
  registerCurrencies,
} from "./currencies";
import { math } from "./instance";

const ENDPOINT = "https://api.frankfurter.dev/v1/latest?from=USD";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const CACHE_KEY = "currency_rates";
const FETCH_TIMEOUT_MS = 8000;

type CacheEntry = {
  fetchedAt: number;
  rates: CurrencyRates;
};

export type RatesStatus = "idle" | "loading" | "fresh" | "offline";

export const ratesStatus = ref<RatesStatus>("idle");
export const ratesLastUpdated = ref<number | null>(null);
/** Bumped whenever the math instance's currency units are re-registered.
 *  Components can watch this to trigger re-evaluation. */
export const ratesVersion = ref(0);
/** Currently registered rates (merged: live or cache, then bundled fallback). */
export const currentRates = ref<CurrencyRates>({ ...FALLBACK_RATES });

let dbPromise: Promise<Database> | null = null;
function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = Database.load("sqlite:foolscap.db");
  return dbPromise;
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    const db = await getDb();
    const rows = await db.select<{ value: string }[]>(
      "SELECT value FROM settings WHERE key = $1",
      [CACHE_KEY],
    );
    if (rows.length === 0) return null;
    const parsed = JSON.parse(rows[0].value) as CacheEntry;
    if (
      typeof parsed.fetchedAt !== "number" ||
      typeof parsed.rates !== "object"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(entry: CacheEntry): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [CACHE_KEY, JSON.stringify(entry)],
  );
}

async function fetchLiveRates(): Promise<CurrencyRates | null> {
  const ctrl = new AbortController();
  const timeoutId = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates: Record<string, number> };
    // Frankfurter returns "1 USD = N CODE". We want "1 CODE = N USD".
    const out: CurrencyRates = {};
    for (const [code, rate] of Object.entries(json.rates)) {
      if (typeof rate === "number" && rate > 0) out[code] = 1 / rate;
    }
    return out;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function applyRates(rates: CurrencyRates) {
  // Merge with bundled fallbacks so any currency missing from the live
  // feed still resolves (e.g. RUB has been excluded from ECB since 2022).
  const merged = { ...FALLBACK_RATES, ...rates };
  registerCurrencies(math, merged);
  currentRates.value = merged;
  ratesVersion.value += 1;
}

export async function loadAndApplyRates(): Promise<void> {
  if (ratesStatus.value === "loading") return;
  ratesStatus.value = "loading";
  const cache = await readCache();
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_MAX_AGE_MS) {
    applyRates(cache.rates);
    ratesLastUpdated.value = cache.fetchedAt;
    ratesStatus.value = "fresh";
    return;
  }
  const live = await fetchLiveRates();
  if (live) {
    await writeCache({ fetchedAt: now, rates: live });
    applyRates(live);
    ratesLastUpdated.value = now;
    ratesStatus.value = "fresh";
    return;
  }
  if (cache) {
    applyRates(cache.rates);
    ratesLastUpdated.value = cache.fetchedAt;
  }
  ratesStatus.value = "offline";
}

export async function refreshRates(): Promise<void> {
  if (ratesStatus.value === "loading") return;
  ratesStatus.value = "loading";
  const live = await fetchLiveRates();
  if (live) {
    const now = Date.now();
    await writeCache({ fetchedAt: now, rates: live });
    applyRates(live);
    ratesLastUpdated.value = now;
    ratesStatus.value = "fresh";
  } else {
    ratesStatus.value = "offline";
  }
}

import { ref } from "vue";
import { emit, listen } from "../../bridge/event";
import Database from "../../bridge/sql";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const LIFETIME_KEY = "ephemeral_lifetime_days";
const WARNING_KEY = "ephemeral_warning_hours";
const CHANGED_EVENT = "ephemeral-settings-changed";

const DEFAULT_LIFETIME_DAYS = 7;
const DEFAULT_WARNING_HOURS = 24;

/** User-tunable lifetime for un-pinned notes (days since last edit). */
export const ephemeralLifetimeDays = ref(DEFAULT_LIFETIME_DAYS);
/** How far ahead of expiry to flag a note in the palette (hours). */
export const ephemeralWarningHours = ref(DEFAULT_WARNING_HOURS);

let dbPromise: Promise<Database> | null = null;
function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = Database.load("sqlite:foolscap.db");
  return dbPromise;
}

async function readSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

async function writeSetting(key: string, value: string) {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

function clampDays(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_LIFETIME_DAYS;
  return Math.max(1, Math.min(365, Math.floor(n)));
}

function clampHours(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_WARNING_HOURS;
  return Math.max(1, Math.min(168, Math.floor(n)));
}

let loaded = false;

/** Load persisted values + subscribe to cross-window changes. Idempotent. */
export async function loadEphemeralSettings() {
  if (loaded) return;
  loaded = true;
  try {
    const days = await readSetting(LIFETIME_KEY);
    const hours = await readSetting(WARNING_KEY);
    if (days !== null) ephemeralLifetimeDays.value = clampDays(parseInt(days, 10));
    if (hours !== null) ephemeralWarningHours.value = clampHours(parseInt(hours, 10));
  } catch {
    // Defaults already in place.
  }
  await listen<{ lifetimeDays: number; warningHours: number }>(
    CHANGED_EVENT,
    (e) => {
      if (!e.payload) return;
      ephemeralLifetimeDays.value = clampDays(e.payload.lifetimeDays);
      ephemeralWarningHours.value = clampHours(e.payload.warningHours);
    },
  );
}

let saveTimer: number | null = null;

/** Update + debounce-persist + broadcast. */
export function setEphemeralSettings(opts: {
  lifetimeDays?: number;
  warningHours?: number;
}) {
  if (opts.lifetimeDays !== undefined) {
    ephemeralLifetimeDays.value = clampDays(opts.lifetimeDays);
  }
  if (opts.warningHours !== undefined) {
    ephemeralWarningHours.value = clampHours(opts.warningHours);
  }
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void writeSetting(LIFETIME_KEY, String(ephemeralLifetimeDays.value));
    void writeSetting(WARNING_KEY, String(ephemeralWarningHours.value));
    void emit(CHANGED_EVENT, {
      lifetimeDays: ephemeralLifetimeDays.value,
      warningHours: ephemeralWarningHours.value,
    }).catch(() => {});
  }, 150);
}

// ---- pure helpers (read the refs synchronously) --------------------------

interface ExpirableNote {
  updated_at: number;
  pinned: number;
}

function lifetimeMs(): number {
  return ephemeralLifetimeDays.value * DAY_MS;
}
function warningMs(): number {
  return ephemeralWarningHours.value * HOUR_MS;
}

export function expiryTime(note: ExpirableNote): number | null {
  if (note.pinned) return null;
  return note.updated_at + lifetimeMs();
}

export function isExpired(note: ExpirableNote, now = Date.now()): boolean {
  const exp = expiryTime(note);
  return exp !== null && exp <= now;
}

export function expiresSoon(note: ExpirableNote, now = Date.now()): boolean {
  const exp = expiryTime(note);
  if (exp === null) return false;
  const remaining = exp - now;
  return remaining > 0 && remaining <= warningMs();
}

/** Pretty-print remaining ms as "23h" / "7d" / "12m". Negative → "now". */
export function formatTimeUntil(ms: number): string {
  if (ms <= 0) return "now";
  if (ms < HOUR_MS) return `${Math.ceil(ms / 60_000)}m`;
  if (ms < DAY_MS) return `${Math.ceil(ms / HOUR_MS)}h`;
  return `${Math.ceil(ms / DAY_MS)}d`;
}

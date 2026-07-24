import { ref } from "vue";
import { emit, listen } from "../../bridge/event";
import Database from "../../bridge/sql";

const KEY = "theme_mode";
const CHANGED_EVENT = "theme-settings-changed";

export type ThemeMode = "light" | "dark" | "system";
const MODES: ThemeMode[] = ["light", "dark", "system"];

export const themeMode = ref<ThemeMode>("system");

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

function clamp(s: string | null): ThemeMode {
  return MODES.includes(s as ThemeMode) ? (s as ThemeMode) : "system";
}

let loaded = false;

export async function loadThemeSettings() {
  if (loaded) return;
  loaded = true;
  try {
    themeMode.value = clamp(await readSetting(KEY));
  } catch {
    // Default stays.
  }
  await listen<{ mode: ThemeMode }>(CHANGED_EVENT, (e) => {
    if (!e.payload) return;
    themeMode.value = clamp(e.payload.mode);
  });
}

let saveTimer: number | null = null;

export function setThemeMode(mode: ThemeMode) {
  themeMode.value = clamp(mode);
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void writeSetting(KEY, themeMode.value);
    void emit(CHANGED_EVENT, { mode: themeMode.value }).catch(() => {});
  }, 150);
}

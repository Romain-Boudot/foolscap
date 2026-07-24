import { ref } from "vue";
import { emit, listen } from "../../bridge/event";
import Database from "../../bridge/sql";

const MODE_KEY = "bg_mode";
const GRID_KEY = "bg_grid";
const CHANGED_EVENT = "background-settings-changed";

export type BgMode = "transparent" | "blur" | "solid";
export type GridMode = "off" | "small" | "large";

const MODES: BgMode[] = ["transparent", "blur", "solid"];
const GRIDS: GridMode[] = ["off", "small", "large"];

export const bgMode = ref<BgMode>("blur");
export const gridMode = ref<GridMode>("off");

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

function clampMode(s: string | null): BgMode {
  return MODES.includes(s as BgMode) ? (s as BgMode) : "blur";
}
function clampGrid(s: string | null): GridMode {
  return GRIDS.includes(s as GridMode) ? (s as GridMode) : "off";
}

let loaded = false;

export async function loadBackgroundSettings() {
  if (loaded) return;
  loaded = true;
  try {
    bgMode.value = clampMode(await readSetting(MODE_KEY));
    gridMode.value = clampGrid(await readSetting(GRID_KEY));
  } catch {
    // Defaults already in place.
  }
  await listen<{ mode: BgMode; grid: GridMode }>(CHANGED_EVENT, (e) => {
    if (!e.payload) return;
    bgMode.value = clampMode(e.payload.mode);
    gridMode.value = clampGrid(e.payload.grid);
  });
}

let saveTimer: number | null = null;

export function setBackgroundSettings(opts: { mode?: BgMode; grid?: GridMode }) {
  if (opts.mode !== undefined) bgMode.value = clampMode(opts.mode);
  if (opts.grid !== undefined) gridMode.value = clampGrid(opts.grid);
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void writeSetting(MODE_KEY, bgMode.value);
    void writeSetting(GRID_KEY, gridMode.value);
    void emit(CHANGED_EVENT, {
      mode: bgMode.value,
      grid: gridMode.value,
    }).catch(() => {});
  }, 150);
}

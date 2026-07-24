import { ref } from "vue";
import { emit, listen } from "../../bridge/event";
import Database from "../../bridge/sql";

const VOLUME_KEY = "chime_volume";
const MUTED_KEY = "chime_muted";
const CHANGED_EVENT = "chime-settings-changed";

export const chimeVolume = ref(0.6); // 0..1
export const chimeMuted = ref(false);

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

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.6;
  return Math.max(0, Math.min(1, n));
}

let loaded = false;

/** Load persisted volume/mute and subscribe to cross-window changes.
 *  Idempotent — safe to call from multiple windows. */
export async function loadChimeSettings() {
  if (loaded) return;
  loaded = true;
  try {
    const v = await readSetting(VOLUME_KEY);
    const m = await readSetting(MUTED_KEY);
    if (v !== null) chimeVolume.value = clamp01(parseFloat(v));
    if (m !== null) chimeMuted.value = m === "1";
  } catch {
    // Defaults already set above.
  }
  await listen<{ volume: number; muted: boolean }>(CHANGED_EVENT, (e) => {
    if (!e.payload) return;
    chimeVolume.value = clamp01(e.payload.volume);
    chimeMuted.value = e.payload.muted;
  });
}

let saveTimer: number | null = null;

/** Update the in-memory refs immediately + debounce-save to DB and
 *  broadcast so peer windows (the toast-window hub) sync. */
export function setChimeSettings(opts: { volume?: number; muted?: boolean }) {
  if (opts.volume !== undefined) chimeVolume.value = clamp01(opts.volume);
  if (opts.muted !== undefined) chimeMuted.value = opts.muted;
  if (saveTimer !== null) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void writeSetting(VOLUME_KEY, String(chimeVolume.value));
    void writeSetting(MUTED_KEY, chimeMuted.value ? "1" : "0");
    void emit(CHANGED_EVENT, {
      volume: chimeVolume.value,
      muted: chimeMuted.value,
    }).catch(() => {});
  }, 150);
}

import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import Database from "@tauri-apps/plugin-sql";
import { parseTimerLine, formatDuration, type TimerSpec } from "./parser";
import { createTimer, advance, type ActiveTimer } from "./state";
import { pushToast } from "../toast/store";
import { playChime } from "./chime";
import { loadChimeSettings } from "./chimeSettings";

/** The hub is the single owner of timer firing. It runs in the toast
 *  window, reads all notes directly from SQLite, and fires toasts when
 *  timers come due. Note windows do NOT fire — they only keep local
 *  state for the inline widget countdown. This avoids the multi-window
 *  duplication where 10 hidden note webviews each fire the same timer.
 *
 *  Timers are persisted to the `timers` table so they survive app
 *  restart. On boot, the hub loads active timers from DB; any whose
 *  next_fire_at is in the past fires once on the next tick (catch-up
 *  for one missed interval, not catchup-fire-all). Timers in a "done"
 *  state are kept in DB so the user's still-present timer line doesn't
 *  re-create a fresh one — edit/retype the line to restart. */

const activeTimers = new Map<string, ActiveTimer>();
let dbPromise: Promise<Database> | null = null;
let intervalId: number | null = null;
const unlistens: UnlistenFn[] = [];

function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = Database.load("sqlite:foolscap.db");
  return dbPromise;
}

function key(noteId: string, lineText: string): string {
  return `${noteId} ${lineText}`;
}

// ---- persistence ----------------------------------------------------------

interface TimerRow {
  id: string;
  note_id: string;
  label: string | null;
  kind: string;
  next_fire_at: number;
  config: string;
  active: number;
}

interface TimerConfig {
  spec: TimerSpec;
  startedAt: number;
  firedCount: number;
  lineText: string;
  pomodoroPhase: "work" | "break";
  pomodoroRound: number;
  done: boolean;
}

function timerToConfig(t: ActiveTimer): TimerConfig {
  return {
    spec: t.spec,
    startedAt: t.startedAt,
    firedCount: t.firedCount,
    lineText: t.lineText,
    pomodoroPhase: t.pomodoroPhase,
    pomodoroRound: t.pomodoroRound,
    done: t.done,
  };
}

function rowToTimer(row: TimerRow): ActiveTimer | null {
  try {
    const cfg = JSON.parse(row.config) as TimerConfig;
    return {
      noteId: row.note_id,
      lineText: cfg.lineText,
      spec: cfg.spec,
      startedAt: cfg.startedAt,
      nextFireAt: row.next_fire_at,
      firedCount: cfg.firedCount,
      pomodoroPhase: cfg.pomodoroPhase,
      pomodoroRound: cfg.pomodoroRound,
      done: cfg.done,
    };
  } catch {
    return null;
  }
}

async function dbInsert(t: ActiveTimer) {
  const db = await getDb();
  await db.execute(
    "INSERT OR REPLACE INTO timers (id, note_id, label, kind, next_fire_at, config, active) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      key(t.noteId, t.lineText),
      t.noteId,
      t.spec.label || null,
      t.spec.kind,
      t.nextFireAt,
      JSON.stringify(timerToConfig(t)),
      t.done ? 0 : 1,
    ],
  );
}

async function dbUpdate(t: ActiveTimer) {
  const db = await getDb();
  await db.execute(
    "UPDATE timers SET next_fire_at = $1, config = $2, active = $3 WHERE id = $4",
    [
      t.nextFireAt,
      JSON.stringify(timerToConfig(t)),
      t.done ? 0 : 1,
      key(t.noteId, t.lineText),
    ],
  );
}

async function dbDelete(noteId: string, lineText: string) {
  const db = await getDb();
  await db.execute("DELETE FROM timers WHERE id = $1", [key(noteId, lineText)]);
}

async function dbSelectAllActive(): Promise<TimerRow[]> {
  const db = await getDb();
  return db.select<TimerRow[]>("SELECT * FROM timers WHERE active = 1");
}

async function dbSelectByNote(noteId: string): Promise<TimerRow[]> {
  const db = await getDb();
  return db.select<TimerRow[]>("SELECT * FROM timers WHERE note_id = $1", [
    noteId,
  ]);
}

async function loadActiveTimersFromDb() {
  const rows = await dbSelectAllActive();
  for (const row of rows) {
    const t = rowToTimer(row);
    if (t) activeTimers.set(key(t.noteId, t.lineText), t);
  }
}

// ---- sync (doc → in-memory + DB) -----------------------------------------

async function syncOneNote(noteId: string, content: string) {
  const existingRows = await dbSelectByNote(noteId);
  const existingById = new Map(existingRows.map((r) => [r.id, r]));

  const lines = (content ?? "").split(/\r?\n/);
  const seen = new Set<string>();

  for (const line of lines) {
    const spec = parseTimerLine(line);
    if (!spec) continue;
    const k = key(noteId, line);
    seen.add(k);
    if (activeTimers.has(k)) continue;

    const row = existingById.get(k);
    if (row) {
      // active=0 means the timer already fired-and-finished previously.
      // Keep that state — the line in the doc is a *record* of past
      // completion, not a re-arm. To restart, the user edits the line.
      if (row.active === 1) {
        const t = rowToTimer(row);
        if (t) activeTimers.set(k, t);
      }
      continue;
    }

    // Brand-new timer — create + persist.
    const t = createTimer(noteId, line, spec, Date.now());
    activeTimers.set(k, t);
    void dbInsert(t);
  }

  // Lines that disappeared from THIS note's doc → drop in-memory + DB.
  const toRemove: ActiveTimer[] = [];
  for (const [k, t] of activeTimers) {
    if (t.noteId !== noteId) continue;
    if (!seen.has(k)) toRemove.push(t);
  }
  for (const t of toRemove) {
    activeTimers.delete(key(t.noteId, t.lineText));
    void dbDelete(t.noteId, t.lineText);
  }
}

async function syncAllNotes() {
  const db = await getDb();
  const rows = await db.select<{ id: string; content: string }[]>(
    "SELECT id, content FROM notes",
  );
  const liveNoteIds = new Set(rows.map((r) => r.id));
  for (const r of rows) await syncOneNote(r.id, r.content ?? "");
  // Drop timers whose note no longer exists at all. DB CASCADE deletes
  // them when the note row is deleted, but if that didn't happen for any
  // reason, fall back to in-memory cleanup here.
  for (const [k, t] of activeTimers) {
    if (!liveNoteIds.has(t.noteId)) activeTimers.delete(k);
  }
}

// ---- firing ---------------------------------------------------------------

function fire(timer: ActiveTimer) {
  const label = timer.spec.label;
  let icon = "";
  let title = "";
  let body = "";
  switch (timer.spec.kind) {
    case "countdown":
      icon = "⏱";
      title = label || "Timer done";
      body = `${formatDuration(timer.spec.durationSec)} elapsed`;
      break;
    case "recurring":
      icon = "↻";
      title = label || "Reminder";
      body = `Every ${formatDuration(timer.spec.intervalSec)}`;
      break;
    case "at_time":
      icon = "🕒";
      title = label || "Reminder";
      body = `It's ${timer.spec.hour}:${String(timer.spec.minute).padStart(2, "0")}`;
      break;
    case "pomodoro": {
      icon = "🍅";
      const suffix = label ? ` (${label})` : "";
      if (timer.pomodoroPhase === "work") {
        title = "Pomodoro · break time";
        body = `Take a ${timer.spec.breakMin}min break${suffix}`;
      } else if (timer.pomodoroRound >= timer.spec.rounds) {
        title = "Pomodoro · complete";
        body = `${timer.spec.rounds} rounds done${suffix}`;
      } else {
        title = `Pomodoro · round ${timer.pomodoroRound + 1}`;
        body = `Back to work${suffix}`;
      }
      break;
    }
  }
  pushToast({ kind: timer.spec.kind, icon, title, body });
  playChime();
}

function tick() {
  const now = Date.now();
  for (const t of activeTimers.values()) {
    if (t.done) continue;
    if (now < t.nextFireAt) continue;
    fire(t);
    advance(t, now);
    void dbUpdate(t);
  }
}

// ---- lifecycle ------------------------------------------------------------

export async function startTimerHub() {
  if (intervalId !== null) return;
  await loadChimeSettings();
  await loadActiveTimersFromDb();
  await syncAllNotes();

  unlistens.push(
    await listen("notes-changed", () => {
      void syncAllNotes();
    }),
  );

  unlistens.push(
    await listen<{ id: string; content: string }>(
      "note-content-saved",
      (event) => {
        if (event.payload) {
          void syncOneNote(event.payload.id, event.payload.content);
        }
      },
    ),
  );

  intervalId = window.setInterval(tick, 1000);
}

export function stopTimerHub() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  for (const u of unlistens) {
    try {
      u();
    } catch {
      // ignore
    }
  }
  unlistens.length = 0;
  activeTimers.clear();
}

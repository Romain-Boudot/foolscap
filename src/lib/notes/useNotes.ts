import { computed, onBeforeUnmount, ref, watch } from "vue";
import Database from "@tauri-apps/plugin-sql";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ephemeralLifetimeDays,
  loadEphemeralSettings,
} from "./ephemeral";

const NOTES_CHANGED_EVENT = "notes-changed";
const NEW_NOTE_PLEASE_EVENT = "new-note-please";

let purgedThisProcess = false;

export type Note = {
  id: string;
  content: string;
  position: number;
  pinned: number;
  created_at: number;
  updated_at: number;
  auto_delete_at: number | null;
};

let dbPromise: Promise<Database> | null = null;
function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = Database.load("sqlite:foolscap.db");
  return dbPromise;
}

const SAVE_DEBOUNCE_MS = 250;
const SAVED_FLASH_MS = 1200;

async function readSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

async function writeSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value],
  );
}

export function useNotes() {
  const winLabel = getCurrentWindow().label;
  const currentNoteKey = `current_note_id__${winLabel}`;

  const notes = ref<Note[]>([]);
  const currentId = ref<string | null>(null);
  const ready = ref(false);
  const saveState = ref<"idle" | "dirty" | "saving" | "saved">("idle");

  const current = computed(
    () => notes.value.find((n) => n.id === currentId.value) ?? null,
  );
  const currentIndex = computed(() =>
    notes.value.findIndex((n) => n.id === currentId.value),
  );

  let saveTimer: number | null = null;
  let savedFlashTimer: number | null = null;

  async function refresh() {
    const db = await getDb();
    const fresh = await db.select<Note[]>(
      "SELECT * FROM notes ORDER BY pinned DESC, position DESC",
    );
    // If we have unsaved local edits in the current note, the DB version
    // is stale by a few keystrokes — keep our content so the editor isn't
    // overwritten (and the cursor doesn't jump to the top of the doc).
    const dirty =
      saveState.value === "dirty" || saveState.value === "saving";
    if (dirty && currentId.value) {
      const localCurrent = notes.value.find((n) => n.id === currentId.value);
      const freshCurrent = fresh.find((n) => n.id === currentId.value);
      if (localCurrent && freshCurrent) {
        freshCurrent.content = localCurrent.content;
      }
    }
    notes.value = fresh;
    if (
      currentId.value &&
      !notes.value.some((n) => n.id === currentId.value)
    ) {
      currentId.value = notes.value[0]?.id ?? null;
    }
  }

  async function readSavedId(): Promise<string | null> {
    const fresh = await readSetting(currentNoteKey);
    if (fresh) return fresh;
    if (winLabel === "main") {
      // Pre-multiwindow data used a single shared key.
      const legacy = await readSetting("current_note_id");
      if (legacy) {
        await writeSetting(currentNoteKey, legacy);
        return legacy;
      }
    }
    return null;
  }

  async function purgeExpired() {
    // Ephemeral cleanup happens once per process (boot). Pinned notes
    // never expire; for everything else we drop rows whose updated_at
    // is older than the configured lifetime. The FK cascade also clears
    // any timers tied to those notes.
    if (purgedThisProcess) return;
    purgedThisProcess = true;
    try {
      const db = await getDb();
      const cutoff =
        Date.now() - ephemeralLifetimeDays.value * 86_400_000;
      await db.execute(
        "DELETE FROM notes WHERE pinned = 0 AND updated_at < $1",
        [cutoff],
      );
    } catch {
      // Don't block boot on cleanup failure.
    }
  }

  async function load() {
    // Lifetime must be known before purge so the cutoff is correct.
    await loadEphemeralSettings();
    await purgeExpired();
    await refresh();
    if (notes.value.length === 0) {
      await create();
    } else {
      const savedId = await readSavedId();
      if (savedId && notes.value.some((n) => n.id === savedId)) {
        currentId.value = savedId;
      } else {
        currentId.value = notes.value[0].id;
      }
    }
    ready.value = true;
  }

  watch(currentId, (id) => {
    if (id) void writeSetting(currentNoteKey, id);
  });

  // Track all subscriptions so HMR / unmount actually cleans them up —
  // otherwise reloaded modules leave orphan listeners around, and a single
  // event ends up firing once per stale listener (= 10 notes on Mod+Shift+N).
  const unlistens: Promise<UnlistenFn>[] = [];

  try {
    unlistens.push(
      getCurrentWindow().onFocusChanged(({ payload }) => {
        if (payload) void refresh();
      }),
    );
  } catch {
    /* focus listen may not be permitted; degrade gracefully */
  }

  // Cross-window sync: any window that mutates the DB broadcasts this
  // event; peers refresh their snapshot.
  unlistens.push(
    listen(NOTES_CHANGED_EVENT, () => {
      void refresh();
    }),
  );

  // From Rust: when Mod+Shift+N reveals a hidden pool window, the target
  // label is sent as the event payload — we only spawn a fresh note if it's
  // addressed to us. (Tauri's JS listen() doesn't filter by target.)
  unlistens.push(
    listen<string>(NEW_NOTE_PLEASE_EVENT, (event) => {
      if (event.payload === winLabel) {
        void create();
      }
    }),
  );

  onBeforeUnmount(async () => {
    for (const p of unlistens) {
      try {
        const fn = await p;
        fn();
      } catch {
        /* ignore */
      }
    }
  });

  function broadcastNotesChanged() {
    void emit(NOTES_CHANGED_EVENT).catch(() => {});
  }

  async function create() {
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = Date.now();
    const nextPos =
      notes.value.reduce((m, n) => Math.max(m, n.position), -1) + 1;
    await db.execute(
      "INSERT INTO notes (id, content, position, created_at, updated_at) VALUES ($1, '', $2, $3, $3)",
      [id, nextPos, now],
    );
    await refresh();
    currentId.value = id;
    broadcastNotesChanged();
  }

  async function deleteCurrent() {
    if (!current.value) return;
    await deleteById(current.value.id);
  }

  async function deleteById(id: string) {
    const existed = notes.value.some((n) => n.id === id);
    if (!existed) return;
    const wasCurrent = currentId.value === id;
    const prevIdx = wasCurrent ? currentIndex.value : -1;
    const db = await getDb();
    await db.execute("DELETE FROM notes WHERE id = $1", [id]);
    await refresh();
    if (notes.value.length === 0) {
      await create();
    } else if (wasCurrent) {
      const nextIdx = Math.min(Math.max(prevIdx, 0), notes.value.length - 1);
      currentId.value = notes.value[nextIdx].id;
    }
    broadcastNotesChanged();
  }

  async function togglePinById(id: string) {
    const target = notes.value.find((n) => n.id === id);
    if (!target) return;
    const db = await getDb();
    const next = target.pinned ? 0 : 1;
    await db.execute(
      "UPDATE notes SET pinned = $1, updated_at = $2 WHERE id = $3",
      [next, Date.now(), id],
    );
    await refresh();
    broadcastNotesChanged();
  }

  async function togglePin() {
    if (!current.value) return;
    const db = await getDb();
    const next = current.value.pinned ? 0 : 1;
    await db.execute(
      "UPDATE notes SET pinned = $1, updated_at = $2 WHERE id = $3",
      [next, Date.now(), current.value.id],
    );
    const focusId = current.value.id;
    await refresh();
    currentId.value = focusId;
    broadcastNotesChanged();
  }

  function switchTo(id: string) {
    currentId.value = id;
  }

  function next() {
    if (notes.value.length < 2) return;
    const i = (currentIndex.value + 1) % notes.value.length;
    currentId.value = notes.value[i].id;
  }

  function prev() {
    if (notes.value.length < 2) return;
    const i =
      (currentIndex.value - 1 + notes.value.length) % notes.value.length;
    currentId.value = notes.value[i].id;
  }

  function jumpTo(oneBased: number) {
    const i = oneBased - 1;
    if (i < 0 || i >= notes.value.length) return;
    currentId.value = notes.value[i].id;
  }

  function updateContent(value: string) {
    if (!current.value) return;
    const targetId = current.value.id;
    current.value.content = value;
    saveState.value = "dirty";

    if (saveTimer !== null) window.clearTimeout(saveTimer);
    if (savedFlashTimer !== null) window.clearTimeout(savedFlashTimer);

    saveTimer = window.setTimeout(async () => {
      saveState.value = "saving";
      const db = await getDb();
      await db.execute(
        "UPDATE notes SET content = $1, updated_at = $2 WHERE id = $3",
        [value, Date.now(), targetId],
      );
      // Intentionally NOT broadcasting `notes-changed` here: content saves
      // happen every 250ms during typing, and a self-receive of that
      // broadcast races against mid-flight keystrokes (state transitions +
      // smart-refresh) and occasionally rolls back what you just typed.
      // Other note windows pick up content on their next focus.
      //
      // `note-content-saved` is a hub-only signal — only the timer hub in
      // the toast window listens for it (to re-sync timer lines). Note
      // windows ignore it, so there's no self-receive refresh race.
      void emit("note-content-saved", { id: targetId, content: value }).catch(
        () => {},
      );
      if (saveState.value === "saving") {
        saveState.value = "saved";
        savedFlashTimer = window.setTimeout(() => {
          if (saveState.value === "saved") saveState.value = "idle";
        }, SAVED_FLASH_MS);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  load().catch((e) => console.error("notes load failed", e));

  return {
    notes,
    current,
    currentIndex,
    ready,
    saveState,
    create,
    deleteCurrent,
    deleteById,
    togglePin,
    togglePinById,
    switchTo,
    next,
    prev,
    jumpTo,
    updateContent,
  };
}

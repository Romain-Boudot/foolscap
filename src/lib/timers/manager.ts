import { ref, watch, onBeforeUnmount, type Ref } from "vue";
import { parseTimerLine } from "./parser";
import { createTimer, advance, type ActiveTimer } from "./state";

/** Note-window-side timer state. Drives the inline widget countdown only.
 *  Firing (toasts, chime, side effects) is owned by the hub running in the
 *  toast window — see hub.ts. We keep a parallel local map here just so
 *  every editor widget can render a live countdown without needing IPC
 *  for every tick. Slight skew vs. the hub's authoritative clock (≤ a few
 *  hundred ms) is acceptable for visual feedback. */

const localTimers = new Map<string, ActiveTimer>();

/** Reactive wall clock bumped every second; Editor.vue watches it to
 *  dispatch the widget refresh effect. */
export const nowMs = ref(Date.now());

let intervalId: number | null = null;
let refCount = 0;

function key(noteId: string, lineText: string): string {
  return `${noteId} ${lineText}`;
}

export function getActiveTimer(
  noteId: string,
  lineText: string,
): ActiveTimer | null {
  return localTimers.get(key(noteId, lineText)) ?? null;
}

/** Register a local widget timer if it doesn't exist yet. Used by the
 *  editor extension so newly-typed timer lines start counting down
 *  immediately, without waiting for the next doc-watch sync. */
export function ensureTimer(
  noteId: string,
  lineText: string,
): ActiveTimer | null {
  const k = key(noteId, lineText);
  const existing = localTimers.get(k);
  if (existing) return existing;
  const spec = parseTimerLine(lineText);
  if (!spec) return null;
  const t = createTimer(noteId, lineText, spec, Date.now());
  localTimers.set(k, t);
  return t;
}

function tick() {
  const now = Date.now();
  nowMs.value = now;
  for (const t of localTimers.values()) {
    if (t.done) continue;
    if (now < t.nextFireAt) continue;
    // Advance local state so the widget reflects "done" / next phase.
    // No toast / chime — the hub handles that.
    advance(t, now);
  }
}

function startLoop() {
  refCount++;
  if (intervalId !== null) return;
  intervalId = window.setInterval(tick, 1000);
}

function stopLoop() {
  refCount--;
  if (refCount <= 0 && intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
    refCount = 0;
  }
}

export function useTimerManager(opts: {
  noteId: Ref<string | null | undefined>;
  doc: Ref<string>;
}) {
  function sync() {
    const noteId = opts.noteId.value;
    if (!noteId) return;
    const doc = opts.doc.value ?? "";
    const lines = doc.split(/\r?\n/);
    const seen = new Set<string>();

    for (const lineText of lines) {
      const spec = parseTimerLine(lineText);
      if (!spec) continue;
      const k = key(noteId, lineText);
      seen.add(k);
      if (!localTimers.has(k)) {
        localTimers.set(k, createTimer(noteId, lineText, spec, Date.now()));
      }
    }

    for (const [k, t] of localTimers) {
      if (t.noteId !== noteId) continue;
      if (!seen.has(k)) localTimers.delete(k);
    }
  }

  watch([opts.noteId, opts.doc], sync, { immediate: true });
  startLoop();

  onBeforeUnmount(() => {
    stopLoop();
  });
}

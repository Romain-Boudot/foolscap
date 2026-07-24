import { onBeforeUnmount, watch, type Ref } from "vue";
import { invoke } from "../../bridge/core";
import { listen, type UnlistenFn } from "../../bridge/event";
import { getCurrentWindow } from "../../bridge/window";
import type { Note } from "../notes/useNotes";
import { noteTitle } from "../notes/title";

/** Pushes pinned-note titles into the OS tray menu and wires the
 *  "click a pinned note in the tray" handler. Run from the main
 *  window only — other windows ignore it. */
export function useTray(opts: {
  notes: Ref<Note[]>;
  onSwitchTo: (id: string) => void;
}) {
  const winLabel = getCurrentWindow().label;
  if (winLabel !== "main") return;

  const TITLE_MAX = 36;

  function truncate(s: string): string {
    if (s.length <= TITLE_MAX) return s;
    return s.slice(0, TITLE_MAX - 1) + "…";
  }

  async function pushPinned() {
    const pinned = opts.notes.value
      .filter((n) => n.pinned === 1)
      .map((n) => ({ id: n.id, title: truncate(noteTitle(n.content)) }));
    try {
      await invoke("update_tray_pinned", { pinned });
    } catch {
      // Best-effort; tray might not exist on this platform / build.
    }
  }

  // Re-sync whenever the pinned set (or any pinned title) changes.
  watch(
    () => opts.notes.value.map((n) => `${n.id}:${n.pinned}:${n.content.slice(0, 40)}`).join("|"),
    () => {
      void pushPinned();
    },
    { immediate: true },
  );

  let unlistenSwitch: UnlistenFn | null = null;
  void listen<string>("tray-switch-to-note", (e) => {
    if (typeof e.payload === "string") opts.onSwitchTo(e.payload);
  }).then((un) => {
    unlistenSwitch = un;
  });

  onBeforeUnmount(() => {
    unlistenSwitch?.();
  });
}

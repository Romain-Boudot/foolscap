import { onBeforeUnmount, onMounted } from "vue";

export type ShortcutHandler = (e: KeyboardEvent) => unknown;

function combo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push("mod");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");
  // Layout-agnostic digit row: match the physical key, not the produced char.
  // (On AZERTY the unshifted "1" key produces "&", so we'd otherwise miss Mod+1.)
  const digit = /^Digit([0-9])$/.exec(e.code);
  parts.push(digit ? digit[1] : e.key.toLowerCase());
  return parts.join("+");
}

/**
 * Bind keyboard shortcuts at the window level using the capture phase
 * so they fire before CodeMirror absorbs the key.
 *
 * Keys use a normalized form: "mod+n", "mod+shift+backspace", "mod+1".
 * `mod` matches Cmd on macOS and Ctrl elsewhere.
 */
export function useShortcuts(map: Partial<Record<string, ShortcutHandler>>) {
  const handler = (e: KeyboardEvent) => {
    // Skip OS keyboard auto-repeat — holding a shortcut shouldn't fire it
    // dozens of times (e.g. Mod+Shift+N opening 10 windows on a held key).
    if (e.repeat) return;
    const key = combo(e);
    const fn = map[key];
    if (import.meta.env.DEV && (e.ctrlKey || e.metaKey || e.altKey)) {
      // eslint-disable-next-line no-console
      console.log("[shortcut]", key, "→", fn ? "MATCH" : "no match");
    }
    if (!fn) return;
    const result = fn(e);
    if (result !== false) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  onMounted(() => window.addEventListener("keydown", handler, true));
  onBeforeUnmount(() => window.removeEventListener("keydown", handler, true));
}

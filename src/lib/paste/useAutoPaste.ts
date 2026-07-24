import { onBeforeUnmount, watch, type Ref } from "vue";
import { readText } from "../../bridge/clipboard";

const POLL_MS = 800;

/** When `enabled` flips on, polls the system clipboard every ~800ms.
 *  Each time the text changes, calls `onCopy` with the new text.
 *  When `enabled` flips off, stops polling immediately. */
export function useAutoPaste(opts: {
  enabled: Ref<boolean>;
  onCopy: (text: string) => void;
}) {
  let lastSeen: string | null = null;
  let intervalId: number | null = null;

  async function poll() {
    try {
      const text = await readText();
      if (!text) return;
      if (text === lastSeen) return;
      lastSeen = text;
      opts.onCopy(text);
    } catch {
      // Clipboard may temporarily refuse reads on Windows when another
      // process holds it. Swallow — we'll catch it next tick.
    }
  }

  function stop() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  async function start() {
    // Seed lastSeen with whatever is in the clipboard now, so flipping
    // the toggle on doesn't immediately paste the user's most recent
    // pre-toggle copy.
    try {
      lastSeen = (await readText()) ?? null;
    } catch {
      lastSeen = null;
    }
    if (intervalId === null) {
      intervalId = window.setInterval(() => void poll(), POLL_MS);
    }
  }

  watch(
    opts.enabled,
    (on) => {
      if (on) void start();
      else stop();
    },
    { immediate: true },
  );

  onBeforeUnmount(stop);
}

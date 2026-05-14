<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Editor from "./lib/editor/Editor.vue";
import TitleBar from "./lib/ui/TitleBar.vue";
import FooterBar from "./lib/ui/FooterBar.vue";
import { useNotes } from "./lib/notes/useNotes";
import { useShortcuts } from "./lib/shortcuts/useShortcuts";
import { useTimerManager } from "./lib/timers/manager";
import { useTray } from "./lib/tray/useTray";
import { useAutoPaste } from "./lib/paste/useAutoPaste";
import { useBarVisibility } from "./lib/ui/useBarVisibility";
import {
  bgMode,
  gridMode,
  loadBackgroundSettings,
} from "./lib/background/backgroundSettings";
import { useBackgroundEffects } from "./lib/background/useBackgroundEffects";
import { loadThemeSettings } from "./lib/theme/themeSettings";
import { useTheme } from "./lib/theme/useTheme";
import { loadAndApplyRates } from "./lib/math/rates";
import { countTasks } from "./lib/checklist/parse";
import NotePalette from "./lib/palette/NotePalette.vue";
import ConfirmDialog from "./lib/ui/ConfirmDialog.vue";
import { noteTitle } from "./lib/notes/title";

const winLabel = getCurrentWindow().label;

const {
  notes,
  current,
  currentIndex,
  ready,
  saveState,
  create,
  deleteById,
  togglePin,
  togglePinById,
  switchTo,
  next,
  prev,
  jumpTo,
  updateContent,
} = useNotes();

const paletteOpen = ref(false);

// --- confirm dialog plumbing ---
const confirmOpen = ref(false);
const confirmMessage = ref("");
const confirmDanger = ref(false);
const confirmLabel = ref("Delete");
let confirmResolve: ((v: boolean) => void) | null = null;

function askConfirm(opts: {
  message: string;
  danger?: boolean;
  confirmLabel?: string;
}): Promise<boolean> {
  if (confirmOpen.value) return Promise.resolve(false);
  confirmMessage.value = opts.message;
  confirmDanger.value = opts.danger ?? false;
  confirmLabel.value = opts.confirmLabel ?? "Confirm";
  confirmOpen.value = true;
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function resolveConfirm(value: boolean) {
  confirmOpen.value = false;
  const r = confirmResolve;
  confirmResolve = null;
  r?.(value);
}

async function confirmDelete(id: string) {
  const note = notes.value.find((n) => n.id === id);
  if (!note) return;
  const title = noteTitle(note.content) || "this note";
  const message = note.pinned
    ? `“${title}” is pinned — long-term note. Delete it anyway?`
    : `Delete “${title}”?`;
  const ok = await askConfirm({
    message,
    danger: true,
    confirmLabel: "Delete",
  });
  if (ok) await deleteById(id);
}

async function confirmDeleteCurrent() {
  if (!current.value) return;
  await confirmDelete(current.value.id);
}

const alwaysOnTop = ref(false);
const autopaste = ref(false);

const editorValue = computed(() => current.value?.content ?? "");
const currentNoteId = computed(() => current.value?.id ?? null);
const pinned = computed(() => current.value?.pinned === 1);
const tasks = computed(() => countTasks(current.value?.content ?? ""));

useTimerManager({ noteId: currentNoteId, doc: editorValue });
useTray({ notes, onSwitchTo: (id) => switchTo(id) });
useAutoPaste({
  enabled: autopaste,
  onCopy: (text) => {
    if (!current.value) return;
    const existing = current.value.content;
    const sep = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    updateContent(existing + sep + text);
  },
});

const { visible: barsVisible } = useBarVisibility();
useBackgroundEffects();
useTheme();

onMounted(() => {
  void loadAndApplyRates();
  void loadBackgroundSettings();
  void loadThemeSettings();
});

async function toggleAOT() {
  alwaysOnTop.value = !alwaysOnTop.value;
  await invoke("set_always_on_top", {
    on: alwaysOnTop.value,
    label: winLabel,
  });
}

async function hide() {
  await invoke("hide_window");
}

// When the palette owns the keyboard, let it handle Mod+digits / Mod+Backspace /
// Mod+P (return false → useShortcuts won't preventDefault, event bubbles to the
// palette's input handler).
const passthroughIfPalette = (fn: () => void) => () => {
  if (paletteOpen.value) return false;
  fn();
};

useShortcuts({
  "mod+n": () => create(),
  "mod+shift+backspace": passthroughIfPalette(() => void confirmDeleteCurrent()),
  "mod+p": passthroughIfPalette(() => void togglePin()),
  "mod+j": () => next(),
  "mod+k": () => prev(),
  "mod+0": passthroughIfPalette(() => jumpTo(10)),
  "mod+1": passthroughIfPalette(() => jumpTo(1)),
  "mod+2": passthroughIfPalette(() => jumpTo(2)),
  "mod+3": passthroughIfPalette(() => jumpTo(3)),
  "mod+4": passthroughIfPalette(() => jumpTo(4)),
  "mod+5": passthroughIfPalette(() => jumpTo(5)),
  "mod+6": passthroughIfPalette(() => jumpTo(6)),
  "mod+7": passthroughIfPalette(() => jumpTo(7)),
  "mod+8": passthroughIfPalette(() => jumpTo(8)),
  "mod+9": passthroughIfPalette(() => jumpTo(9)),
  "mod+,": () => invoke("open_settings"),
  "mod+shift+n": () => invoke("new_note_window"),
  "mod+shift+p": () => {
    paletteOpen.value = !paletteOpen.value;
  },
});
</script>

<template>
  <div class="app" :class="[`bg-${bgMode}`, `grid-${gridMode}`]">
    <main class="editor-wrap">
      <Editor
        v-if="ready && current"
        :key="current.id"
        :value="editorValue"
        :note-id="current.id"
        @update="updateContent"
      />
    </main>
    <TitleBar
      :always-on-top="alwaysOnTop"
      :pinned="pinned"
      :autopaste="autopaste"
      :visible="barsVisible"
      @toggle-aot="toggleAOT"
      @toggle-pin="togglePin"
      @toggle-autopaste="autopaste = !autopaste"
      @hide="hide"
    />
    <FooterBar
      :index="currentIndex"
      :total="notes.length"
      :pinned="pinned"
      :save-state="saveState"
      :tasks="tasks"
      :visible="barsVisible"
      @prev="prev"
      @next="next"
      @new="create"
      @delete="confirmDeleteCurrent"
    />
    <NotePalette
      :open="paletteOpen"
      :notes="notes"
      :current-id="current?.id ?? null"
      @close="paletteOpen = false"
      @select="(id) => switchTo(id)"
      @delete-request="(id) => void confirmDelete(id)"
      @toggle-pin="(id) => void togglePinById(id)"
    />
    <ConfirmDialog
      :open="confirmOpen"
      :message="confirmMessage"
      :danger="confirmDanger"
      :confirm-label="confirmLabel"
      @cancel="resolveConfirm(false)"
      @confirm="resolveConfirm(true)"
    />
  </div>
</template>

<style scoped>
.app {
  position: relative;
  height: 100vh;
  background: var(--bg);
  color: var(--fg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 var(--inset-highlight),
    inset 0 0 0 1px var(--inset-outline);
}

/* --- background modes -------------------------------------------------- */
.app.bg-transparent {
  background: var(--bg); /* rgba(24, 24, 27, 0.88) — see-through */
}
.app.bg-blur {
  /* The actual blur comes from the Rust acrylic call (see acrylic.rs).
     We layer a theme-aware CSS tint over it to keep text legible. */
  background: var(--bg-blur-layer);
}
.app.bg-solid {
  background: rgb(20, 20, 23);
}

/* --- optional grid overlay --------------------------------------------
   The grid is rendered as a background-image on the editor's scrollable
   content (.cm-content, see editor/theme.ts). That way it scrolls with
   the text instead of being painted on a fixed surface. We just publish
   the parameters here via CSS variables that cascade down. */
.app {
  --grid-bg-image: none;
  --grid-bg-size: auto;
}
.app.grid-small,
.app.grid-large {
  --grid-bg-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
}
.app.grid-small {
  --grid-bg-size: 20px 20px;
}
.app.grid-large {
  --grid-bg-size: 40px 40px;
}

.editor-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { editorTheme } from "./theme";
import { mathExtension, refreshMathEffect } from "../math/extension";
import { ratesVersion } from "../math/rates";
import { checklistExtension } from "../checklist/extension";
import { toggleTaskCommand } from "../checklist/commands";
import { headingExtension } from "../heading/extension";
import { inlineMarkdownExtension } from "../inline/extension";
import { timerExtension, refreshTimerEffect } from "../timers/extension";
import { nowMs } from "../timers/manager";
import { evaluateDoc } from "../math/evaluator";
import { mathCompletions } from "../math/autocomplete";

function copyMathResultIfNoSelection(view: EditorView, raw: boolean): boolean {
  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  const line = view.state.doc.lineAt(sel.head);
  const results = evaluateDoc(view.state.doc.toString());
  const r = results[line.number - 1];
  const text = raw ? r?.raw : r?.display;
  if (!text) return false;
  void writeText(text).catch(() => {});
  return true;
}

function selectCurrentLine(view: EditorView): boolean {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  view.dispatch({ selection: { anchor: line.from, head: line.to } });
  return true;
}

const props = defineProps<{ value: string; noteId: string }>();
const emit = defineEmits<{ (e: "update", value: string): void }>();

const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

onMounted(() => {
  if (!host.value) return;
  const state = EditorState.create({
    doc: props.value,
    extensions: [
      history(),
      placeholder("Start typing…"),
      keymap.of([
        { key: "Mod-Enter", run: toggleTaskCommand, preventDefault: true },
        { key: "Mod-c", run: (v) => copyMathResultIfNoSelection(v, false) },
        { key: "Mod-Shift-c", run: (v) => copyMathResultIfNoSelection(v, true) },
        { key: "Mod-l", run: selectCurrentLine, preventDefault: true },
        ...completionKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      autocompletion({
        override: [mathCompletions],
        activateOnTyping: true,
        defaultKeymap: false,
        icons: true,
      }),
      editorTheme,
      mathExtension,
      checklistExtension,
      headingExtension,
      inlineMarkdownExtension,
      timerExtension(props.noteId),
      EditorView.lineWrapping,
      EditorView.updateListener.of((v) => {
        if (v.docChanged) emit("update", v.state.doc.toString());
      }),
    ],
  });
  view = new EditorView({ state, parent: host.value });
  view.focus();
});

function minimalChange(a: string, b: string): { from: number; to: number; insert: string } {
  let start = 0;
  const minLen = Math.min(a.length, b.length);
  while (start < minLen && a.charCodeAt(start) === b.charCodeAt(start)) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) {
    endA--;
    endB--;
  }
  return { from: start, to: endA, insert: b.slice(start, endB) };
}

watch(
  () => props.value,
  (nextVal) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === nextVal) return;
    // Dispatch only the minimal range that actually changed. CodeMirror's
    // selection mapping then keeps the cursor in place if your edit point
    // is outside that range — instead of snapping to position 0 on every
    // external sync.
    const change = minimalChange(current, nextVal);
    view.dispatch({ changes: change });
  },
);

watch(ratesVersion, () => {
  if (!view) return;
  view.dispatch({ effects: refreshMathEffect.of(null) });
});

watch(nowMs, () => {
  if (!view) return;
  view.dispatch({ effects: refreshTimerEffect.of(null) });
});

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="host" class="editor" />
</template>

<style scoped>
.editor {
  height: 100%;
  width: 100%;
}

.editor :deep(.cm-editor) {
  height: 100%;
  font-family:
    "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 13.5px;
  line-height: 1.65;
}

.editor :deep(.cm-scroller) {
  padding: 0;
}

/* Content padding is set in editor/theme.ts so it can clear the
   floating title + footer bars. Leaving this empty so we don't
   double-pad. */

.editor :deep(.cm-placeholder) {
  color: var(--fg-dim);
  opacity: 0.5;
  font-style: italic;
}
</style>

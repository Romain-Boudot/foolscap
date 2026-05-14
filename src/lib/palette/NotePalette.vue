                                                                        <script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { Note } from "../notes/useNotes";
import { notePreview, noteTitle } from "../notes/title";
import {
  expiresSoon,
  expiryTime,
  formatTimeUntil,
} from "../notes/ephemeral";
import IconPin from "../ui/icons/IconPin.vue";

const props = defineProps<{
  open: boolean;
  notes: Note[];
  currentId: string | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", id: string): void;
  (e: "delete-request", id: string): void;
  (e: "toggle-pin", id: string): void;
}>();

type Item = { note: Note; originalIndex: number };

const query = ref("");
const activeIndex = ref(0);
const searchInput = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLDivElement | null>(null);

const filtered = computed<Item[]>(() => {
  const items: Item[] = props.notes.map((note, originalIndex) => ({
    note,
    originalIndex,
  }));
  const q = query.value.trim().toLowerCase();
  if (!q) return items;
  return items.filter(({ note }) => note.content.toLowerCase().includes(q));
});

watch(
  () => props.open,
  async (open) => {
    if (open) {
      query.value = "";
      const currentIdx = props.notes.findIndex((n) => n.id === props.currentId);
      activeIndex.value = currentIdx >= 0 ? currentIdx : 0;
      await nextTick();
      searchInput.value?.focus();
      scrollActiveIntoView();
    }
  },
);

watch(filtered, () => {
  if (activeIndex.value >= filtered.value.length) {
    activeIndex.value = Math.max(0, filtered.value.length - 1);
  }
});

watch(activeIndex, async () => {
  await nextTick();
  scrollActiveIntoView();
});

function scrollActiveIntoView() {
  const el = listEl.value?.querySelector(".palette-item.active");
  el?.scrollIntoView({ block: "nearest" });
}

function moveUp() {
  if (filtered.value.length === 0) return;
  activeIndex.value =
    (activeIndex.value - 1 + filtered.value.length) % filtered.value.length;
}

function moveDown() {
  if (filtered.value.length === 0) return;
  activeIndex.value = (activeIndex.value + 1) % filtered.value.length;
}

function selectActive() {
  const item = filtered.value[activeIndex.value];
  if (item) selectId(item.note.id);
}

function selectId(id: string) {
  emit("select", id);
  emit("close");
}

function jumpToIndex(n: number) {
  // 1-indexed; n=10 maps to the 10th filtered item.
  const item = filtered.value[n - 1];
  if (item) selectId(item.note.id);
}

function onSearchKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case "ArrowUp":
      e.preventDefault();
      moveUp();
      return;
    case "ArrowDown":
      e.preventDefault();
      moveDown();
      return;
    case "Enter":
      e.preventDefault();
      selectActive();
      return;
    case "Escape":
      e.preventDefault();
      emit("close");
      return;
  }

  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;

  const digit = /^Digit([0-9])$/.exec(e.code);
  if (digit) {
    e.preventDefault();
    const n = parseInt(digit[1], 10);
    jumpToIndex(n === 0 ? 10 : n);
    return;
  }

  if (e.shiftKey && e.key === "Backspace") {
    e.preventDefault();
    const item = filtered.value[activeIndex.value];
    if (item) emit("delete-request", item.note.id);
    return;
  }

  if (e.key.toLowerCase() === "p") {
    e.preventDefault();
    const item = filtered.value[activeIndex.value];
    if (item) emit("toggle-pin", item.note.id);
    return;
  }
}

function lineCount(content: string): number {
  if (!content.trim()) return 0;
  return content.split("\n").length;
}

function expiryLabel(note: Note): string | null {
  if (!expiresSoon(note)) return null;
  const exp = expiryTime(note);
  if (exp === null) return null;
  return `expires ${formatTimeUntil(exp - Date.now())}`;
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="palette-backdrop"
      @mousedown.self="$emit('close')"
    >
      <div class="palette" @mousedown.stop>
        <input
          ref="searchInput"
          v-model="query"
          class="palette-search"
          placeholder="Search notes..."
          autocomplete="off"
          spellcheck="false"
          @keydown="onSearchKeydown"
        />
        <div ref="listEl" class="palette-list">
          <div
            v-for="(item, i) in filtered"
            :key="item.note.id"
            class="palette-item"
            :class="{
              active: i === activeIndex,
              current: item.note.id === currentId,
            }"
            @mouseenter="activeIndex = i"
            @click="selectId(item.note.id)"
          >
            <span class="num">{{ item.originalIndex + 1 }}</span>
            <IconPin
              v-if="item.note.pinned"
              :filled="true"
              class="pin"
              title="Pinned"
            />
            <div class="info">
              <div class="title">
                {{ noteTitle(item.note.content) }}
                <span
                  v-if="expiryLabel(item.note)"
                  class="expiry"
                  :title="`Will be deleted on next app launch unless edited or pinned (Mod+P)`"
                >
                  {{ expiryLabel(item.note) }}
                </span>
              </div>
              <div v-if="notePreview(item.note.content)" class="preview">
                {{ notePreview(item.note.content) }}
              </div>
            </div>
            <span class="meta">{{ lineCount(item.note.content) }}L</span>
          </div>
          <div v-if="filtered.length === 0" class="empty">
            No matches for "{{ query }}"
          </div>
        </div>
        <div class="palette-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> nav</span>
          <span><kbd>Enter</kbd> open</span>
          <span><kbd>Mod+1..0</kbd> jump</span>
          <span><kbd>Mod+Shift+⌫</kbd> delete</span>
          <span><kbd>Mod+P</kbd> pin</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.palette {
  width: 88%;
  max-width: 480px;
  max-height: 65vh;
  background: var(--surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
}

.palette-search {
  background: transparent;
  border: none;
  outline: none;
  color: var(--fg);
  padding: 12px 16px;
  font-size: 14px;
  font-family: inherit;
  border-bottom: 1px solid var(--border);
}
.palette-search::placeholder {
  color: var(--fg-dim);
  opacity: 0.6;
}

.palette-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
}
.palette-item.active {
  background: rgba(122, 167, 255, 0.14);
}
.palette-item.active .title {
  color: var(--accent);
}

.palette-item .num {
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas,
    monospace;
  font-size: 10px;
  color: var(--fg-dim);
  min-width: 14px;
  text-align: right;
}

.palette-item .pin {
  color: var(--accent);
  margin-left: -4px;
  flex: 0 0 auto;
}

.palette-item .info {
  flex: 1;
  min-width: 0;
}

.palette-item .title {
  font-size: 13px;
  color: var(--fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.palette-item.current .title::after {
  content: " · current";
  color: var(--fg-dim);
  font-size: 11px;
}

.palette-item .expiry {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #ffc857;
  background: rgba(255, 200, 87, 0.12);
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
  vertical-align: middle;
}

.palette-item .preview {
  font-size: 11px;
  color: var(--fg-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.palette-item .meta {
  font-size: 10px;
  color: var(--fg-dim);
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas,
    monospace;
  opacity: 0.5;
}

.empty {
  text-align: center;
  padding: 24px;
  color: var(--fg-dim);
  font-size: 12px;
}

.palette-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  font-size: 10px;
  color: var(--fg-dim);
}
.palette-footer kbd {
  display: inline-block;
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas,
    monospace;
  background: var(--bg-elev);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  border: 1px solid var(--border);
  margin: 0 2px;
}
</style>

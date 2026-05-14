<script setup lang="ts">
import { computed } from "vue";

type SaveState = "idle" | "dirty" | "saving" | "saved";

const props = defineProps<{
  index: number;
  total: number;
  pinned: boolean;
  saveState: SaveState;
  tasks: { done: number; total: number };
  visible: boolean;
}>();

defineEmits<{
  (e: "prev"): void;
  (e: "next"): void;
  (e: "new"): void;
  (e: "delete"): void;
}>();

const positionLabel = computed(() => {
  if (props.total === 0) return "0 / 0";
  return `${props.index + 1} / ${props.total}`;
});

const saveLabel = computed(() => {
  switch (props.saveState) {
    case "dirty":
      return "editing";
    case "saving":
      return "saving";
    case "saved":
      return "saved";
    default:
      return "";
  }
});
</script>

<template>
  <footer class="footer" :class="{ hidden: !visible }">
    <div class="group">
      <button
        class="nav"
        :disabled="total < 2"
        title="Previous note (Mod+K)"
        @click="$emit('prev')"
      >
        ‹
      </button>
      <span class="position" :class="{ pinned }">
        <span v-if="pinned" class="pin-dot" />
        {{ positionLabel }}
      </span>
      <button
        class="nav"
        :disabled="total < 2"
        title="Next note (Mod+J)"
        @click="$emit('next')"
      >
        ›
      </button>
    </div>

    <div class="group center">
      <button class="add" title="New note (Mod+N)" @click="$emit('new')">
        + new
      </button>
    </div>

    <div class="group right">
      <span
        v-if="tasks.total > 0"
        class="tasks"
        :title="`${tasks.done} of ${tasks.total} tasks done`"
      >
        {{ tasks.done }}/{{ tasks.total }}
      </span>
      <span class="save" :data-state="saveState">{{ saveLabel }}</span>
      <button
        class="trash"
        title="Delete note (Mod+Shift+Backspace)"
        @click="$emit('delete')"
      >
        ×
      </button>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 30px;
  padding: 0 8px;
  background: var(--bar-bg);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  font-size: 11px;
  color: var(--fg-dim);
  user-select: none;
  -webkit-user-select: none;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.footer.hidden {
  opacity: 0;
  pointer-events: none;
}

.group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.group.center {
  justify-self: center;
}
.group.right {
  justify-self: end;
  gap: 6px;
}

.nav {
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
}
.nav:disabled {
  opacity: 0.25;
  cursor: default;
  background: transparent !important;
}

.position {
  font-variant-numeric: tabular-nums;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.position.pinned {
  color: var(--accent);
}
.pin-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.add {
  font-size: 11px;
  letter-spacing: 0.03em;
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid transparent;
}
.add:hover {
  border-color: var(--border);
  background: var(--bg-elev);
}

.tasks {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--fg-dim);
  padding: 0 4px;
}

.save {
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  min-width: 48px;
  text-align: right;
  transition: opacity 0.25s ease, color 0.25s ease;
  opacity: 0;
}
.save[data-state="dirty"] {
  opacity: 0.55;
  color: var(--fg-dim);
}
.save[data-state="saving"] {
  opacity: 0.85;
  color: var(--accent);
}
.save[data-state="saved"] {
  opacity: 0.7;
  color: #6cd187;
}

.trash {
  width: 22px;
  height: 22px;
  padding: 0;
  font-size: 14px;
  line-height: 1;
}
.trash:hover {
  background: rgba(255, 80, 80, 0.18);
  color: #ff9a9a;
}
</style>

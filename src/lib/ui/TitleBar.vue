<script setup lang="ts">
import { getCurrentWindow } from "@tauri-apps/api/window";
import IconPin from "./icons/IconPin.vue";
import IconClose from "./icons/IconClose.vue";
import IconAutoPaste from "./icons/IconAutoPaste.vue";
import IconAlwaysOnTop from "./icons/IconAlwaysOnTop.vue";

defineProps<{
  alwaysOnTop: boolean;
  pinned: boolean;
  autopaste: boolean;
  visible: boolean;
}>();

defineEmits<{
  (e: "toggle-aot"): void;
  (e: "toggle-pin"): void;
  (e: "toggle-autopaste"): void;
  (e: "hide"): void;
}>();

const win = getCurrentWindow();

function onMouseDown(e: MouseEvent) {
  if ((e.target as HTMLElement).closest("button")) return;
  if (e.buttons === 1) win.startDragging();
}
</script>

<template>
  <header
    class="title-bar"
    :class="{ hidden: !visible }"
    @mousedown="onMouseDown"
  >
    <span class="brand">foolscap</span>
    <div class="actions">
      <button
        :class="{ active: autopaste }"
        :title="
          autopaste
            ? 'AutoPaste ON — system copies append here. Click to stop.'
            : 'AutoPaste OFF — click to capture everything you copy.'
        "
        @click="$emit('toggle-autopaste')"
      >
        <IconAutoPaste :active="autopaste" />
      </button>
      <button
        :class="{ active: pinned }"
        :title="pinned ? 'Unpin note (Mod+P)' : 'Pin note (Mod+P)'"
        @click="$emit('toggle-pin')"
      >
        <IconPin :filled="pinned" />
      </button>
      <button
        :class="{ active: alwaysOnTop }"
        :title="alwaysOnTop ? 'Disable always-on-top' : 'Enable always-on-top'"
        @click="$emit('toggle-aot')"
      >
        <IconAlwaysOnTop :filled="alwaysOnTop" />
      </button>
      <button class="close" title="Hide (Alt+A)" @click="$emit('hide')">
        <IconClose />
      </button>
    </div>
  </header>
</template>

<style scoped>
.title-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 12px;
  height: 28px;
  user-select: none;
  -webkit-user-select: none;
  background: var(--bar-bg);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  cursor: default;
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.title-bar.hidden {
  opacity: 0;
  pointer-events: none;
}

.brand {
  font-size: 10.5px;
  color: var(--fg-dim);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 500;
  opacity: 0.7;
}

.actions {
  display: flex;
  gap: 2px;
}

.actions button {
  height: 20px;
  width: 20px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
}

.actions button.close:hover {
  background: rgba(255, 80, 80, 0.18);
  color: #ff9a9a;
}

</style>

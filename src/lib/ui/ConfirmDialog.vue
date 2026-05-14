<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}>();

const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "confirm"): void;
}>();

const confirmBtn = ref<HTMLButtonElement | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick();
      // Focus the confirm button so Enter triggers it immediately — these
      // are quick notes, no reason to slow people down.
      confirmBtn.value?.focus();
    }
  },
);

function onWindowKey(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    emit("cancel");
  }
}

// Capture phase, so we win over any other window-level listeners.
onMounted(() => window.addEventListener("keydown", onWindowKey, true));
onBeforeUnmount(() => window.removeEventListener("keydown", onWindowKey, true));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="confirm-backdrop"
      @mousedown.self="$emit('cancel')"
    >
      <div class="confirm-dialog" :class="{ danger }">
        <h2 v-if="title">{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="actions">
          <button class="btn cancel" @click="$emit('cancel')">
            {{ cancelLabel ?? "Cancel" }}
          </button>
          <button
            ref="confirmBtn"
            class="btn confirm"
            :class="{ danger }"
            @click="$emit('confirm')"
          >
            {{ confirmLabel ?? "Confirm" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}

.confirm-dialog {
  background: var(--surface);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  padding: 20px 22px 16px;
  min-width: 320px;
  max-width: 420px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

.confirm-dialog.danger {
  border-color: rgba(255, 90, 90, 0.45);
  box-shadow: 0 24px 64px rgba(160, 30, 30, 0.35);
}

.confirm-dialog h2 {
  font-size: 12px;
  margin: 0 0 8px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fg-dim);
}

.confirm-dialog p {
  font-size: 14px;
  line-height: 1.5;
  color: var(--fg);
  margin: 0 0 18px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}

.btn:focus-visible {
  outline: 1.5px solid var(--accent);
  outline-offset: 1px;
}

.btn.cancel:hover {
  background: var(--bg-elev);
}

.btn.confirm {
  border-color: rgba(255, 255, 255, 0.18);
}
.btn.confirm:hover {
  background: var(--bg-elev);
  color: var(--accent);
  border-color: var(--accent);
}

.btn.confirm.danger {
  color: #ff9a9a;
  border-color: rgba(255, 154, 154, 0.4);
}
.btn.confirm.danger:hover,
.btn.confirm.danger:focus-visible {
  background: rgba(255, 80, 80, 0.18);
  color: #ffb3b3;
  border-color: #ff9a9a;
  outline-color: #ff9a9a;
}
</style>

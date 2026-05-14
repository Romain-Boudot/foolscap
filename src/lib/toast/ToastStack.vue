<script setup lang="ts">
import { toasts, dismiss } from "./store";
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toast-stack">
    <button
      v-for="t in toasts"
      :key="t.id"
      :class="['toast', `toast-${t.kind}`]"
      :title="`${t.title}${t.body ? ' · ' + t.body : ''}`"
      @click="dismiss(t.id)"
    >
      <span class="toast-icon">{{ t.icon }}</span>
      <span class="toast-text">
        <span class="toast-title">{{ t.title }}</span>
        <span v-if="t.body" class="toast-body">{{ t.body }}</span>
      </span>
    </button>
  </TransitionGroup>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  top: 8px;
  right: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  z-index: 9000;
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px 10px 12px;
  border-radius: 8px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-left-width: 3px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--fg);
  text-align: left;
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
  max-width: 280px;
  min-width: 220px;
}
.toast:hover {
  background: var(--bg);
}

.toast-icon {
  font-size: 16px;
  line-height: 1.2;
  flex: 0 0 auto;
}

.toast-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.toast-title {
  font-weight: 500;
  color: var(--fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast-body {
  color: var(--fg-dim);
  font-size: 11px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast-countdown {
  border-left-color: #ffc857;
}
.toast-recurring {
  border-left-color: #5eead4;
}
.toast-at_time {
  border-left-color: #c084fc;
}
.toast-pomodoro {
  border-left-color: #ff7e6b;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(110%);
}
.toast-enter-active {
  transition:
    opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.toast-move {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>

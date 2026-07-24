<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from "vue";
import {
  currentMonitor,
  getCurrentWindow,
  PhysicalPosition,
} from "../bridge/window";
import ToastStack from "../lib/toast/ToastStack.vue";
import { toasts } from "../lib/toast/store";
import { startTimerHub, stopTimerHub } from "../lib/timers/hub";

const win = getCurrentWindow();

async function positionAtTopRight() {
  const monitor = await currentMonitor();
  if (!monitor) return;
  const size = await win.outerSize();
  const margin = 20;
  const x = monitor.position.x + monitor.size.width - size.width - margin;
  const y = monitor.position.y + margin;
  await win.setPosition(new PhysicalPosition(x, y));
}

onMounted(async () => {
  await positionAtTopRight();
  await startTimerHub();
});

onBeforeUnmount(() => {
  stopTimerHub();
});

// Show window only when there are toasts to display. Empty + transparent
// window still intercepts clicks in its rect, so we keep it hidden when idle.
watch(
  () => toasts.value.length,
  async (n) => {
    if (n > 0) {
      await win.show();
    } else {
      await win.hide();
    }
  },
);
</script>

<template>
  <ToastStack />
</template>

<style>
html,
body,
#app {
  background: transparent !important;
  margin: 0;
  padding: 0;
  height: 100vh;
  overflow: hidden;
}
</style>

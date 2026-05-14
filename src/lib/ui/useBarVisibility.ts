import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const EDGE_ZONE_PX = 80;
const MOUSE_FRESH_MS = 500;
const HIDE_DELAY_MS = 200;
const TICK_MS = 250;

/** Floating title + footer bars: hidden by default. Visible when:
 *   - the mouse moved in the last MOUSE_FRESH_MS, OR
 *   - the mouse is parked within EDGE_ZONE_PX of the top or bottom.
 *  Otherwise hidden — including when the mouse is in the middle of the
 *  window but immobile (focused-writing posture). */
export function useBarVisibility() {
  const lastMoveAt = ref(0);
  const lastMouseY = ref(0);
  const mouseInside = ref(false);
  const tick = ref(0);

  let tickInterval: number | null = null;
  let hideTimer: number | null = null;

  const visible = computed(() => {
    void tick.value; // recompute on each tick
    if (!mouseInside.value) return false;
    const now = Date.now();
    const movedRecently = now - lastMoveAt.value < MOUSE_FRESH_MS;
    const winH = window.innerHeight;
    const inEdge =
      lastMouseY.value <= EDGE_ZONE_PX ||
      lastMouseY.value >= winH - EDGE_ZONE_PX;
    return movedRecently || inEdge;
  });

  function onMouseMove(e: MouseEvent) {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
    mouseInside.value = true;
    lastMouseY.value = e.clientY;
    lastMoveAt.value = Date.now();
  }

  function onMouseLeave() {
    if (hideTimer !== null) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      mouseInside.value = false;
      hideTimer = null;
    }, HIDE_DELAY_MS);
  }

  onMounted(() => {
    window.addEventListener("mousemove", onMouseMove);
    document.documentElement.addEventListener("mouseleave", onMouseLeave);
    tickInterval = window.setInterval(() => {
      tick.value++;
    }, TICK_MS);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("mousemove", onMouseMove);
    document.documentElement.removeEventListener("mouseleave", onMouseLeave);
    if (tickInterval !== null) window.clearInterval(tickInterval);
    if (hideTimer !== null) window.clearTimeout(hideTimer);
  });

  return { visible };
}

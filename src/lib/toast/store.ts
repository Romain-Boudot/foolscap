import { ref } from "vue";

export type ToastKind = "countdown" | "recurring" | "at_time" | "pomodoro";

export interface Toast {
  id: number;
  kind: ToastKind;
  icon: string;
  title: string;
  body?: string;
}

const DEFAULT_DURATION_MS = 6000;

export const toasts = ref<Toast[]>([]);
let nextId = 1;
const dismissTimers = new Map<number, number>();

export function pushToast(t: Omit<Toast, "id">, durationMs = DEFAULT_DURATION_MS) {
  const id = nextId++;
  toasts.value.push({ ...t, id });
  const handle = window.setTimeout(() => dismiss(id), durationMs);
  dismissTimers.set(id, handle);
}

export function dismiss(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
  const h = dismissTimers.get(id);
  if (h !== undefined) {
    window.clearTimeout(h);
    dismissTimers.delete(id);
  }
}

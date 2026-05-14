import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { themeMode } from "./themeSettings";

/** Resolves the user's preference into the *effective* theme that the
 *  CSS variables in global.css need (light or dark). Tracks the OS
 *  preference via `prefers-color-scheme` so "system" updates live. */
export type EffectiveTheme = "light" | "dark";

const systemDark = ref(false);

function readSystemPref(): boolean {
  return typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : true;
}

export const effectiveTheme = computed<EffectiveTheme>(() => {
  if (themeMode.value === "system") return systemDark.value ? "dark" : "light";
  return themeMode.value;
});

/** Apply the effective theme to <html data-theme="..."> and keep it in
 *  sync with both the user setting and the OS preference. Run once per
 *  window. */
export function useTheme() {
  let mediaQuery: MediaQueryList | null = null;
  let onChange: ((e: MediaQueryListEvent) => void) | null = null;

  onMounted(() => {
    systemDark.value = readSystemPref();
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    onChange = (e) => {
      systemDark.value = e.matches;
    };
    mediaQuery.addEventListener("change", onChange);
  });

  onBeforeUnmount(() => {
    if (mediaQuery && onChange) mediaQuery.removeEventListener("change", onChange);
  });

  watch(
    effectiveTheme,
    (t) => {
      document.documentElement.dataset.theme = t;
    },
    { immediate: true },
  );
}

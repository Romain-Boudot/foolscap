import { watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { bgMode, type BgMode } from "./backgroundSettings";
import { effectiveTheme } from "../theme/useTheme";

// Tint components for the persistent acrylic blur. Passed as four u8s
// rather than a packed u32 to dodge any signed/unsigned serialization
// surprise in the JS → Rust IPC bridge.
// Dark: alpha 0xB0 (~69%), BGR matches --bg dark slate.
// Light: alpha 0xB8 (~72%) of a near-pure warm white — pushes the blur
// strongly toward white instead of looking grey-ish.
const TINT_DARK = { a: 0xb0, b: 0x1b, g: 0x18, r: 0x18 };
const TINT_LIGHT = { a: 0xb8, b: 0xfa, g: 0xfc, r: 0xff };

/** Apply the right window-level effect for the current background mode.
 *  Delegates to a Rust command that uses the undocumented
 *  `SetWindowCompositionAttribute` with `ACCENT_ENABLE_ACRYLICBLURBEHIND`
 *  to get persistent acrylic. The tint changes with the active theme so
 *  text stays legible in both light and dark. */
async function applyEffectFor(mode: BgMode, theme: "light" | "dark") {
  try {
    if (mode === "blur") {
      const t = theme === "light" ? TINT_LIGHT : TINT_DARK;
      await invoke("enable_blur", { a: t.a, b: t.b, g: t.g, r: t.r });
    } else {
      await invoke("disable_blur");
    }
  } catch (e) {
    // Surface the failure so we don't lose acrylic silently.
    console.error("[acrylic] invoke failed:", e);
  }
}

/** Watch both bg mode and effective theme: any change reapplies the
 *  matching native effect. Call once per window. */
export function useBackgroundEffects() {
  watch(
    [bgMode, effectiveTheme],
    ([m, t]) => void applyEffectFor(m, t),
    { immediate: true },
  );
}

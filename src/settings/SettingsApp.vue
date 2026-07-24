<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { getCurrentWindow } from "../bridge/window";
import { useShortcuts } from "../lib/shortcuts/useShortcuts";
import {
  bgMode,
  loadBackgroundSettings,
} from "../lib/background/backgroundSettings";
import { useBackgroundEffects } from "../lib/background/useBackgroundEffects";
import { loadThemeSettings } from "../lib/theme/themeSettings";
import { useTheme } from "../lib/theme/useTheme";
import SettingsSection from "./sections/SettingsSection.vue";
import ShortcutsSection from "./sections/ShortcutsSection.vue";
import FormattingSection from "./sections/FormattingSection.vue";
import MathSection from "./sections/MathSection.vue";
import MoneySection from "./sections/MoneySection.vue";
import UnitsSection from "./sections/UnitsSection.vue";
import ConversionsSection from "./sections/ConversionsSection.vue";
import TimersSection from "./sections/TimersSection.vue";
import AboutSection from "./sections/AboutSection.vue";

type SectionId =
  | "settings"
  | "shortcuts"
  | "formatting"
  | "math"
  | "money"
  | "units"
  | "conversions"
  | "timers"
  | "about";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "settings", label: "Settings" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "formatting", label: "Formatting" },
  { id: "math", label: "Math" },
  { id: "money", label: "Money" },
  { id: "units", label: "Units" },
  { id: "conversions", label: "Conversions" },
  { id: "timers", label: "Timers" },
  { id: "about", label: "About" },
];

const active = ref<SectionId>("settings");
const contentEl = ref<HTMLElement | null>(null);
const win = getCurrentWindow();

useBackgroundEffects();
useTheme();

// Reset scroll position whenever the user switches section — the freshly
// mounted section should always start from the top.
watch(active, async () => {
  await nextTick();
  contentEl.value?.scrollTo({ top: 0, behavior: "instant" });
});

onMounted(() => {
  void loadBackgroundSettings();
  void loadThemeSettings();
});

function close() {
  // Hide, don't close. `win.close()` destroys the static window instance
  // and breaks subsequent open_settings invocations (which only look up
  // the existing window via app.get_webview_window).
  void win.hide();
}

useShortcuts({
  escape: () => close(),
  "mod+,": () => close(),
  "mod+w": () => close(),
});
</script>

<template>
  <div
    class="settings-app"
    :class="[`bg-${bgMode}`]"
  >
    <header class="title-bar">
      <span class="brand">foolscap <span class="sep">/</span> settings</span>
      <button class="close" title="Close (Esc)" @click="close">×</button>
    </header>
    <div class="body">
      <nav class="sidebar">
        <button
          v-for="s in SECTIONS"
          :key="s.id"
          :class="{ active: active === s.id }"
          @click="active = s.id"
        >
          {{ s.label }}
        </button>
      </nav>
      <main ref="contentEl" class="content">
        <SettingsSection v-if="active === 'settings'" />
        <ShortcutsSection v-else-if="active === 'shortcuts'" />
        <FormattingSection v-else-if="active === 'formatting'" />
        <MathSection v-else-if="active === 'math'" />
        <MoneySection v-else-if="active === 'money'" />
        <UnitsSection v-else-if="active === 'units'" />
        <ConversionsSection v-else-if="active === 'conversions'" />
        <TimersSection v-else-if="active === 'timers'" />
        <AboutSection v-else-if="active === 'about'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.settings-app {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--fg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    inset 0 0 0 1px rgba(255, 255, 255, 0.09);
}

.settings-app.bg-transparent {
  background: var(--bg);
}
.settings-app.bg-blur {
  background: var(--bg-blur-layer);
}
.settings-app.bg-solid {
  background: rgb(20, 20, 23);
}

.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px 0 14px;
  height: 36px;
  flex: 0 0 36px;
  user-select: none;
  -webkit-user-select: none;
  border-bottom: 1px solid var(--border);
  background: var(--bg-elev);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  cursor: default;
  -webkit-app-region: drag;
}

.brand {
  font-size: 11px;
  color: var(--fg-dim);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
}
.brand .sep {
  opacity: 0.4;
  margin: 0 4px;
}

.title-bar .close {
  height: 24px;
  width: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 14px;
  line-height: 1;
  -webkit-app-region: no-drag;
}
.title-bar .close:hover {
  background: rgba(255, 80, 80, 0.18);
  color: #ff9a9a;
}

.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sidebar {
  width: 180px;
  flex: 0 0 180px;
  border-right: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.15);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar button {
  text-align: left;
  padding: 7px 12px;
  border-radius: 5px;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--fg-dim);
  width: 100%;
}
.sidebar button:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--fg);
}
.sidebar button.active {
  background: rgba(122, 167, 255, 0.12);
  color: var(--accent);
}

.content {
  flex: 1;
  overflow: auto;
  padding: 28px 36px;
  min-width: 0;
}
</style>

<style>
/* Doc styles shared across all setting sections (intentionally not scoped) */
.doc h1 {
  font-size: 18px;
  margin: 0 0 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg);
}
.doc h2 {
  font-size: 11px;
  margin: 24px 0 8px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-dim);
}
.doc p {
  font-size: 13px;
  line-height: 1.6;
  color: var(--fg);
  margin: 0 0 12px;
}
.doc .lede {
  color: var(--fg-dim);
  font-size: 13px;
}
.doc kbd {
  display: inline-block;
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  background: var(--bg-elev);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  border: 1px solid var(--border);
  color: var(--fg);
  white-space: nowrap;
  line-height: 1.4;
}
.doc code {
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  background: var(--bg-elev);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 12px;
  color: var(--accent);
}
.doc pre {
  background: rgba(0, 0, 0, 0.25);
  padding: 12px 14px;
  border-radius: 6px;
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  overflow-x: auto;
  margin: 0 0 12px;
  border: 1px solid var(--border);
  color: var(--fg);
}
.doc pre .c {
  color: var(--fg-dim);
}
.doc pre .r {
  color: var(--accent);
}
.doc table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin: 0 0 8px;
}
.doc table td {
  padding: 7px 4px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}
.doc table td:first-child {
  width: 38%;
  white-space: nowrap;
}
.doc table tr:last-child td {
  border-bottom: none;
}
.doc ul {
  margin: 0 0 12px;
  padding: 0 0 0 18px;
  font-size: 13px;
  line-height: 1.7;
}
.doc .pill {
  display: inline-block;
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  background: var(--bg-elev);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  border: 1px solid var(--border);
  margin: 0 4px 4px 0;
  color: var(--fg);
}
.doc .grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 4px;
}

.toggle-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.toggle-row:last-child {
  border-bottom: none;
}
.toggle-row .info {
  flex: 1;
}
.toggle-row .info .label {
  font-size: 13px;
  color: var(--fg);
}
.toggle-row .info .hint {
  font-size: 11px;
  color: var(--fg-dim);
  margin-top: 3px;
  line-height: 1.4;
}
.toggle-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
  margin-top: 2px;
}
.toggle-row input[type="checkbox"]:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.coming-soon {
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fg-dim);
  background: var(--bg-elev);
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 6px;
  vertical-align: middle;
}
</style>

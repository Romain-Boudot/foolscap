<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { invoke } from "../../bridge/core";
import {
  ratesLastUpdated,
  ratesStatus,
  refreshRates,
} from "../../lib/math/rates";
import {
  ephemeralLifetimeDays,
  ephemeralWarningHours,
  loadEphemeralSettings,
  setEphemeralSettings,
} from "../../lib/notes/ephemeral";
import {
  bgMode,
  gridMode,
  loadBackgroundSettings,
  setBackgroundSettings,
  type BgMode,
  type GridMode,
} from "../../lib/background/backgroundSettings";
import {
  themeMode,
  loadThemeSettings,
  setThemeMode,
  type ThemeMode,
} from "../../lib/theme/themeSettings";

const alwaysOnTop = ref(false);

async function toggleAOT(e: Event) {
  const target = e.target as HTMLInputElement;
  alwaysOnTop.value = target.checked;
  await invoke("set_always_on_top", { on: alwaysOnTop.value });
}

onMounted(() => {
  void loadEphemeralSettings();
  void loadBackgroundSettings();
  void loadThemeSettings();
});

function setBgMode(m: BgMode) {
  setBackgroundSettings({ mode: m });
}
function setGridMode(g: GridMode) {
  setBackgroundSettings({ grid: g });
}
function pickTheme(m: ThemeMode) {
  setThemeMode(m);
}

function onLifetimeInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  setEphemeralSettings({ lifetimeDays: v });
}

function onWarningInput(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  setEphemeralSettings({ warningHours: v });
}

const lastUpdatedLabel = computed(() => {
  const ts = ratesLastUpdated.value;
  if (!ts) return "never";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
});

const ratesHint = computed(() => {
  switch (ratesStatus.value) {
    case "loading":
      return "Fetching live rates…";
    case "fresh":
      return `Live — updated ${lastUpdatedLabel.value}`;
    case "offline":
      return "Offline — using bundled snapshot";
    default:
      return "Bundled snapshot";
  }
});
</script>

<template>
  <div class="doc">
    <h1>Settings</h1>
    <p class="lede">App preferences and behavior toggles.</p>

    <div class="toggle-row">
      <div class="info">
        <div class="label">Always on top</div>
        <div class="hint">
          Keep the note window above other windows. Toggle from the pin in the
          titlebar too.
        </div>
      </div>
      <input type="checkbox" :checked="alwaysOnTop" @change="toggleAOT" />
    </div>

    <div class="toggle-row">
      <div class="info">
        <div class="label">Currency rates</div>
        <div class="hint">
          {{ ratesHint }} ·
          source <a href="https://frankfurter.dev" target="_blank">frankfurter.dev</a>
          (ECB data, no key). Auto-fetched on launch, cached 24h.
        </div>
      </div>
      <button
        class="btn"
        :disabled="ratesStatus === 'loading'"
        @click="refreshRates"
      >
        {{ ratesStatus === "loading" ? "…" : "Refresh" }}
      </button>
    </div>

    <h2>Theme</h2>
    <div class="seg-row">
      <div class="info">
        <div class="label">Color scheme</div>
        <div class="hint">
          System follows your OS preference and updates live when it changes.
        </div>
      </div>
      <div class="seg">
        <button
          :class="{ active: themeMode === 'light' }"
          @click="pickTheme('light')"
        >Light</button>
        <button
          :class="{ active: themeMode === 'dark' }"
          @click="pickTheme('dark')"
        >Dark</button>
        <button
          :class="{ active: themeMode === 'system' }"
          @click="pickTheme('system')"
        >System</button>
      </div>
    </div>

    <h2>Background</h2>
    <p class="lede">
      How the note window's surface looks. Grid is an optional overlay
      independent of the mode.
    </p>

    <div class="seg-row">
      <div class="info">
        <div class="label">Mode</div>
        <div class="hint">
          Transparent = see slightly through · Blur = frosted glass over the
          desktop · Solid = fully opaque.
        </div>
      </div>
      <div class="seg">
        <button
          :class="{ active: bgMode === 'transparent' }"
          @click="setBgMode('transparent')"
        >Transparent</button>
        <button
          :class="{ active: bgMode === 'blur' }"
          @click="setBgMode('blur')"
        >Blur</button>
        <button
          :class="{ active: bgMode === 'solid' }"
          @click="setBgMode('solid')"
        >Solid</button>
      </div>
    </div>

    <div class="seg-row">
      <div class="info">
        <div class="label">Grid</div>
        <div class="hint">
          Subtle graph paper overlay on the note surface.
        </div>
      </div>
      <div class="seg">
        <button
          :class="{ active: gridMode === 'off' }"
          @click="setGridMode('off')"
        >Off</button>
        <button
          :class="{ active: gridMode === 'small' }"
          @click="setGridMode('small')"
        >Small</button>
        <button
          :class="{ active: gridMode === 'large' }"
          @click="setGridMode('large')"
        >Large</button>
      </div>
    </div>

    <h2>Ephemeral notes</h2>
    <p class="lede">
      Un-pinned notes get auto-deleted at the next app launch if they haven't
      been edited for a while. Pin a note (<kbd>Mod+P</kbd>) to keep it
      forever; edit it to reset its countdown.
    </p>

    <div class="slider-row">
      <div class="info">
        <div class="label">Lifetime</div>
        <div class="hint">
          Days since the last edit before a note is considered expired.
        </div>
      </div>
      <div class="slider-control">
        <input
          type="range"
          min="1"
          max="60"
          step="1"
          :value="ephemeralLifetimeDays"
          @input="onLifetimeInput"
        />
        <span class="slider-value">{{ ephemeralLifetimeDays }}d</span>
      </div>
    </div>

    <div class="slider-row">
      <div class="info">
        <div class="label">Expiry warning</div>
        <div class="hint">
          How far ahead of expiry the palette flags the note in amber.
        </div>
      </div>
      <div class="slider-control">
        <input
          type="range"
          min="1"
          max="72"
          step="1"
          :value="ephemeralWarningHours"
          @input="onWarningInput"
        />
        <span class="slider-value">{{ ephemeralWarningHours }}h</span>
      </div>
    </div>

    <h2>Hotkey</h2>
    <p>
      Global toggle: <kbd>Alt+A</kbd>. Hardcoded for now — rebinding lands
      in a later version.
    </p>

    <h2>Storage</h2>
    <p>
      Notes are stored locally in a SQLite file
      (<code>sqlite:foolscap.db</code>). No cloud, no sync, no account.
    </p>
  </div>
</template>

<style>
.doc .btn {
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 5px;
  border: 1px solid var(--border);
  color: var(--fg);
  background: transparent;
  white-space: nowrap;
}
.doc .btn:hover:not(:disabled) {
  background: var(--bg-elev);
  color: var(--accent);
  border-color: var(--accent);
}
.doc .btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.doc a {
  color: var(--accent);
  text-decoration: none;
}
.doc a:hover {
  text-decoration: underline;
}

.doc .slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.doc .slider-row .info {
  flex: 1;
}
.doc .slider-row .info .label {
  font-size: 13px;
  color: var(--fg);
}
.doc .slider-row .info .hint {
  font-size: 11px;
  color: var(--fg-dim);
  margin-top: 3px;
  line-height: 1.4;
}
.doc .slider-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}
.doc .slider-control input[type="range"] {
  width: 160px;
  accent-color: var(--accent);
  cursor: pointer;
}
.doc .slider-value {
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--fg-dim);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.doc .seg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.doc .seg-row .info {
  flex: 1;
}
.doc .seg-row .info .label {
  font-size: 13px;
  color: var(--fg);
}
.doc .seg-row .info .hint {
  font-size: 11px;
  color: var(--fg-dim);
  margin-top: 3px;
  line-height: 1.4;
}
.doc .seg {
  display: inline-flex;
  background: var(--bg-elev);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.doc .seg button {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  color: var(--fg-dim);
  background: transparent;
}
.doc .seg button:hover {
  color: var(--fg);
}
.doc .seg button.active {
  background: rgba(122, 167, 255, 0.18);
  color: var(--accent);
}
</style>

<script setup lang="ts">
import { onMounted } from "vue";
import {
  chimeMuted,
  chimeVolume,
  loadChimeSettings,
  setChimeSettings,
} from "../../lib/timers/chimeSettings";
import { playChime } from "../../lib/timers/chime";

onMounted(() => {
  void loadChimeSettings();
});

function onVolumeInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value);
  setChimeSettings({ volume: v });
}

function onVolumeRelease() {
  // Preview the new volume once the user stops dragging.
  playChime();
}

function onMutedChange(e: Event) {
  const m = (e.target as HTMLInputElement).checked;
  setChimeSettings({ muted: m });
}

const KINDS = [
  {
    syntax: "timer 5m: laundry",
    desc: "One-shot countdown. Compound durations work: 1h30m, 2h15m30s, 30s.",
  },
  {
    syntax: "every 25m: stretch",
    desc: "Recurring forever until you remove the line.",
  },
  {
    syntax: "every 1h x 8: water",
    desc: "Recurring, capped at N fires.",
  },
  {
    syntax: "at 14:30: meeting",
    desc: "Absolute time today (24-hour clock).",
  },
  {
    syntax: "pomodoro 25/5 x 4: focus",
    desc:
      "Pomodoro session: 4 cycles of 25min work / 5min break. Rounds default to 4 if omitted.",
  },
];
</script>

<template>
  <div class="doc">
    <h1>Timers</h1>
    <p class="lede">
      Type a timer line. It gets recognized inline with a colored, live-updating
      tag — the countdown ticks down every second and a toast pops in the
      corner of your screen when it hits zero. Timers keep running while the
      window is hidden; they reset on app restart.
    </p>

    <h2>Sound</h2>
    <div class="toggle-row">
      <div class="info">
        <div class="label">Mute chime</div>
        <div class="hint">Silence the notification sound but keep showing the toast.</div>
      </div>
      <input
        type="checkbox"
        :checked="chimeMuted"
        @change="onMutedChange"
      />
    </div>
    <div class="slider-row" :class="{ disabled: chimeMuted }">
      <div class="info">
        <div class="label">Volume</div>
        <div class="hint">Test it by releasing the slider.</div>
      </div>
      <div class="slider-control">
        <input
          type="range"
          min="0"
          max="1"
          step="0.02"
          :value="chimeVolume"
          :disabled="chimeMuted"
          @input="onVolumeInput"
          @change="onVolumeRelease"
        />
        <span class="slider-value">{{ Math.round(chimeVolume * 100) }}%</span>
      </div>
    </div>

    <h2>Syntax</h2>
    <table>
      <tbody>
        <tr v-for="k in KINDS" :key="k.syntax">
          <td><code>{{ k.syntax }}</code></td>
          <td>{{ k.desc }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Duration shorthand</h2>
    <p>
      <code>s</code> seconds · <code>m</code> minutes · <code>h</code> hours.
      Combine without spaces: <code>1h30m</code>, <code>2h15m30s</code>.
    </p>

    <h2>Color coding</h2>
    <ul>
      <li><span style="color: #ffc857">⏱ amber</span> — one-shot countdown</li>
      <li><span style="color: #5eead4">↻ teal</span> — recurring</li>
      <li><span style="color: #c084fc">🕒 purple</span> — at a specific time</li>
      <li><span style="color: #ff7e6b">🍅 red</span> — pomodoro session</li>
    </ul>

    <h2>Examples</h2>
    <pre>timer 5m: laundry
every 25m: stretch
every 1h x 8: water
at 14:30: meeting with claude
pomodoro 25/5 x 4: ship the demo</pre>
  </div>
</template>

<style scoped>
.slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.slider-row.disabled {
  opacity: 0.45;
}
.slider-row .info {
  flex: 1;
}
.slider-row .info .label {
  font-size: 13px;
  color: var(--fg);
}
.slider-row .info .hint {
  font-size: 11px;
  color: var(--fg-dim);
  margin-top: 3px;
  line-height: 1.4;
}

.slider-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.slider-control input[type="range"] {
  width: 160px;
  accent-color: var(--accent);
  cursor: pointer;
}
.slider-control input[type="range"]:disabled {
  cursor: not-allowed;
}

.slider-value {
  font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--fg-dim);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>

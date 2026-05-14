<script setup lang="ts">
const SHORTCUTS = [
  { combo: "Alt+A", desc: "Show or hide all note windows (global)" },
  { combo: "Mod+N", desc: "New note (in current window)" },
  { combo: "Mod+Shift+N", desc: "New note in a new window" },
  { combo: "Mod+J", desc: "Next note" },
  { combo: "Mod+K", desc: "Previous note" },
  { combo: "Mod+1 … Mod+9", desc: "Jump directly to note N" },
  { combo: "Mod+P", desc: "Pin / unpin the current note" },
  { combo: "Mod+Shift+Backspace", desc: "Delete the current note" },
  { combo: "Mod+,", desc: "Open this settings window" },
  { combo: "Mod+Shift+P", desc: "Open the note palette (search + switch)" },
  { combo: "Mod+Enter", desc: "Toggle task on current line (or prepend [ ])" },
  { combo: "Mod+C", desc: "Copy the math result on the current line (no selection only)" },
  { combo: "Mod+Shift+C", desc: "Copy the raw math result (no symbol/thousand seps)" },
  { combo: "Mod+L", desc: "Select the entire current line" },
  { combo: "Mod+Z / Mod+Y", desc: "Undo / redo (editor)" },
  { combo: "Esc", desc: "Close settings (when this window is focused)" },
];

const PALETTE_SHORTCUTS = [
  { combo: "↑ / ↓", desc: "Navigate results" },
  { combo: "Enter", desc: "Open the active note" },
  { combo: "Mod+1 … Mod+9", desc: "Jump to the Nth result" },
  { combo: "Mod+0", desc: "Jump to the 10th result" },
  { combo: "Mod+Shift+Backspace", desc: "Delete the active note (with confirm)" },
  { combo: "Mod+P", desc: "Pin / unpin the active note" },
  { combo: "Esc", desc: "Close the palette" },
];
</script>

<template>
  <div class="doc">
    <h1>Keyboard shortcuts</h1>
    <p class="lede">
      <kbd>Mod</kbd> means <kbd>Ctrl</kbd> on Windows / Linux and
      <kbd>Cmd</kbd> on macOS.
    </p>

    <table>
      <tbody>
        <tr v-for="s in SHORTCUTS" :key="s.combo">
          <td><kbd>{{ s.combo }}</kbd></td>
          <td>{{ s.desc }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Inside the palette</h2>
    <table>
      <tbody>
        <tr v-for="s in PALETTE_SHORTCUTS" :key="s.combo">
          <td><kbd>{{ s.combo }}</kbd></td>
          <td>{{ s.desc }}</td>
        </tr>
      </tbody>
    </table>

    <h2>AZERTY note</h2>
    <p>
      Number shortcuts (<kbd>Mod+1</kbd>…<kbd>Mod+9</kbd>) are matched on the
      physical key, so they work whether your <kbd>1</kbd> produces
      <code>1</code> (QWERTY) or <code>&amp;</code> (AZERTY).
    </p>
  </div>
</template>

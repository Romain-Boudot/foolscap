<script setup lang="ts">
import logoUrl from "../../assets/logo.svg";

const STACK = [
  { name: "Electron", what: "Native windows, tray, global hotkey" },
  { name: "Vue 3", what: "Frontend, Composition API" },
  { name: "CodeMirror 6", what: "Text editor" },
  { name: "mathjs", what: "Math engine, units, conversions" },
  { name: "SQLite", what: "Local-only storage" },
  { name: "bun", what: "Package manager / runtime" },
];
</script>

<template>
  <div class="doc">
    <header class="hero">
      <img :src="logoUrl" alt="Foolscap logo" class="logo" />
      <div class="title-block">
        <h1>Foolscap</h1>
        <p class="lede">
          Version 0.1.0 — a minimal, keyboard-first scratchpad.
        </p>
      </div>
    </header>

    <p>
      Ephemeral by design. One global hotkey, a stack of notes, an inline math
      engine. No cloud, no account, no sync. Local SQLite, that's it.
    </p>

    <h2>Stack</h2>
    <table>
      <tbody>
        <tr v-for="s in STACK" :key="s.name">
          <td><code>{{ s.name }}</code></td>
          <td>{{ s.what }}</td>
        </tr>
      </tbody>
    </table>

    <h2>Philosophy</h2>
    <ul>
      <li>Three-second rule — hotkey to first keystroke under 300 ms</li>
      <li>Ephemeral by default — notes rotate, don't pile up</li>
      <li>Keyboard-first — mouse is optional</li>
      <li>Plain text — markdown-light, no rich formatting</li>
      <li>Cross-platform parity — macOS and Windows feel the same</li>
    </ul>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}

.logo {
  width: 72px;
  height: 72px;
  flex: 0 0 auto;
  border-radius: 16px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

.title-block {
  flex: 1;
  min-width: 0;
}

.hero h1 {
  margin: 0 0 4px;
}

.hero .lede {
  margin: 0;
}
</style>

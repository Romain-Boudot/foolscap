import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";

// electron-vite drives three builds from one config:
//  - main:     the Electron main process (electron/main.ts)
//  - preload:  the context-bridge preload (electron/preload.ts)
//  - renderer: the existing Vue + Vite app (index.html → src/main.ts)
//
// `externalizeDepsPlugin` keeps node/native deps (better-sqlite3) out of the
// bundle so they're required from node_modules at runtime.
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "electron/main.ts") },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "electron/preload.ts") },
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [vue()],
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, "index.html") },
      },
    },
  },
});

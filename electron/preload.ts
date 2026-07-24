// Preload: exposes a single `window.foolscap` object to the renderer that
// the src/bridge/* shims build the old Tauri API surface on top of. All
// privileged access goes through IPC to the main process; the renderer stays
// sandboxed with contextIsolation.

import { contextBridge, ipcRenderer } from "electron";

// Which window are we? Passed as an additionalArgument from main — the
// equivalent of Tauri's `getCurrentWindow().label`.
const LABEL_FLAG = "--foolscap-label=";
const labelArg = process.argv.find((a) => a.startsWith(LABEL_FLAG));
const label = labelArg ? labelArg.slice(LABEL_FLAG.length) : "main";

// Cross-window event fan-in. Main rebroadcasts every emit() to all windows
// on the "event:message" channel; we dispatch to the registered callbacks.
type EventCallback = (event: { payload: unknown }) => void;
const eventListeners = new Map<string, Set<EventCallback>>();

ipcRenderer.on("event:message", (_e, name: string, payload: unknown) => {
  const set = eventListeners.get(name);
  if (!set) return;
  for (const cb of set) cb({ payload });
});

// Focus changes for the current window.
type FocusCallback = (event: { payload: boolean }) => void;
const focusListeners = new Set<FocusCallback>();

ipcRenderer.on("win:focus-changed", (_e, focused: boolean) => {
  for (const cb of focusListeners) cb({ payload: focused });
});

contextBridge.exposeInMainWorld("foolscap", {
  label,

  db: {
    select: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:select", sql, params),
    execute: (sql: string, params: unknown[] = []) =>
      ipcRenderer.invoke("db:execute", sql, params),
  },

  clipboard: {
    readText: () => ipcRenderer.invoke("clipboard:readText"),
    writeText: (text: string) =>
      ipcRenderer.invoke("clipboard:writeText", text),
  },

  invoke: (cmd: string, args?: unknown) =>
    ipcRenderer.invoke(`cmd:${cmd}`, args),

  emit: (name: string, payload?: unknown): Promise<void> => {
    ipcRenderer.send("event:emit", name, payload);
    return Promise.resolve();
  },

  listen: (name: string, cb: EventCallback): (() => void) => {
    let set = eventListeners.get(name);
    if (!set) {
      set = new Set();
      eventListeners.set(name, set);
    }
    set.add(cb);
    return () => set!.delete(cb);
  },

  win: {
    show: () => ipcRenderer.send("win:show"),
    hide: () => ipcRenderer.send("win:hide"),
    outerSize: () =>
      ipcRenderer.invoke("win:outerSize") as Promise<{
        width: number;
        height: number;
      }>,
    setPosition: (x: number, y: number) =>
      ipcRenderer.send("win:setPosition", x, y),
    currentMonitor: () => ipcRenderer.invoke("win:currentMonitor"),
    onFocusChanged: (cb: FocusCallback): (() => void) => {
      focusListeners.add(cb);
      return () => focusListeners.delete(cb);
    },
  },
});

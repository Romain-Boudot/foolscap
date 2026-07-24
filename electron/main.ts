// Foolscap main process. This replaces the entire Tauri Rust backend
// (src-tauri): static multi-window creation, the global Alt+A toggle,
// single-instance lock, the system tray, cursor-monitor centering, and the
// SQLite / clipboard / window IPC the renderer relies on.

import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  Tray,
  type Display,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
} from "electron";
import path from "node:path";
import { dbExecute, dbSelect, initDb } from "./db";

// ---- window model ---------------------------------------------------------

// The ten pre-created "pool" note windows. Mirrors NOTE_POOL in the old
// Rust commands module — Mod+Shift+N / the tray reveal the next hidden one.
const NOTE_POOL = [
  "note-1", "note-2", "note-3", "note-4", "note-5",
  "note-6", "note-7", "note-8", "note-9", "note-10",
];

const windows = new Map<string, BrowserWindow>();

// Labels of note-type windows the user explicitly wants open. Alt+A toggles
// only this set, so a window closed with × stays closed across Alt+A cycles.
// `main` is always in the set (closing it is just hiding).
const openedNotes = new Set<string>();

let tray: Tray | null = null;
let pinnedNotes: { id: string; title: string }[] = [];
let isQuitting = false;

const PRELOAD = path.join(__dirname, "../preload/index.js");

function resourcePath(name: string): string {
  // In dev, resources live in the project's `resources/` dir; when packaged,
  // electron-builder copies that dir under process.resourcesPath (see the
  // `extraResources` mapping in package.json).
  return app.isPackaged
    ? path.join(process.resourcesPath, "resources", name)
    : path.join(app.getAppPath(), "resources", name);
}

const NOTE_GEOMETRY = {
  width: 520,
  height: 640,
  minWidth: 360,
  minHeight: 320,
  resizable: true,
};

interface WinConfig
  extends Partial<Electron.BrowserWindowConstructorOptions> {
  width: number;
  height: number;
}

function configFor(label: string): WinConfig {
  if (label === "settings") {
    return {
      width: 760,
      height: 600,
      minWidth: 560,
      minHeight: 400,
      resizable: true,
      center: true,
    };
  }
  if (label === "toast") {
    return {
      width: 320,
      height: 520,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      x: 1580,
      y: 20,
    };
  }
  // main + note-1..note-10
  return { ...NOTE_GEOMETRY, center: true };
}

function createWindow(label: string): BrowserWindow {
  const cfg = configFor(label);
  const win = new BrowserWindow({
    ...cfg,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    // Electron 33 rounds frameless windows by default on Win11/macOS, so the
    // old DwmSetWindowAttribute corner hack (corners.rs) is no longer needed.
    roundedCorners: true,
    backgroundColor: "#00000000",
    icon: nativeImage.createFromPath(resourcePath("icon.png")),
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Keep hidden windows (esp. the toast timer hub) ticking on time and
      // processing cross-window events instead of being throttled.
      backgroundThrottling: false,
      // The renderer reads this to learn which window it is — the Tauri
      // equivalent of `getCurrentWindow().label`.
      additionalArguments: [`--foolscap-label=${label}`],
    },
  });

  windows.set(label, win);

  win.on("focus", () => win.webContents.send("win:focus-changed", true));
  win.on("blur", () => win.webContents.send("win:focus-changed", false));

  // Frameless windows have no native close button, but Alt+F4 / Cmd+W can
  // still fire a close. Hide instead of destroy so the window instance (and
  // its renderer) survives — matches the Tauri "hide, don't close" model.
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  return win;
}

// ---- monitor / positioning (ports window.rs) ------------------------------

function displayOfWindow(win: BrowserWindow): Display {
  return screen.getDisplayMatching(win.getBounds());
}

function centerOnDisplay(win: BrowserWindow, display: Display): void {
  const { width, height } = win.getBounds();
  const x = Math.round(display.bounds.x + (display.bounds.width - width) / 2);
  const y = Math.round(display.bounds.y + (display.bounds.height - height) / 2);
  win.setPosition(x, y);
}

// Center `win` on `display`, unless it's already there (preserves a
// user-dragged position when no monitor change is needed).
function moveWindowToMonitor(win: BrowserWindow, display: Display): void {
  if (displayOfWindow(win).id === display.id) return;
  centerOnDisplay(win, display);
}

function moveToCursorMonitor(win: BrowserWindow): void {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  moveWindowToMonitor(win, display);
}

function showAndFocus(win: BrowserWindow): void {
  if (!win.isVisible()) win.show();
  if (win.isMinimized()) win.restore();
  win.focus();
}

function openedWindows(): BrowserWindow[] {
  return [...openedNotes]
    .map((label) => windows.get(label))
    .filter((w): w is BrowserWindow => !!w);
}

function showAllNotes(): void {
  const wins = openedWindows();
  if (wins.length === 0) return;
  for (const w of wins) showAndFocus(w);
  const main = windows.get("main");
  if (main) {
    moveToCursorMonitor(main);
    main.focus();
  }
}

function toggleAllNotes(): void {
  const wins = openedWindows();
  if (wins.length === 0) return;
  const anyVisible = wins.some((w) => w.isVisible());
  if (anyVisible) {
    for (const w of wins) w.hide();
  } else {
    showAllNotes();
  }
}

// ---- native blur (best-effort port of acrylic.rs) -------------------------

// The old Windows implementation called the undocumented
// SetWindowCompositionAttribute to keep acrylic active even when unfocused.
// Electron doesn't expose that, so we use the built-in materials instead:
// `acrylic` on Windows, vibrancy on macOS. The theme-aware CSS tint layered
// on top (`--bg-blur-layer`) still handles legibility. Best-effort — swallow
// failures so a missing material never breaks the app.
function applyBlur(win: BrowserWindow | null, on: boolean): void {
  if (!win) return;
  try {
    if (process.platform === "win32" && "setBackgroundMaterial" in win) {
      win.setBackgroundMaterial(on ? "acrylic" : "none");
    } else if (process.platform === "darwin") {
      win.setVibrancy(on ? "under-window" : null);
    }
  } catch {
    /* material unsupported on this OS build — ignore */
  }
}

// ---- tray (ports tray.rs) -------------------------------------------------

function trayNewNote(): void {
  for (const label of NOTE_POOL) {
    const w = windows.get(label);
    if (!w || w.isVisible()) continue;
    w.show();
    w.focus();
    openedNotes.add(label);
    broadcast("new-note-please", label);
    return;
  }
}

function trayOpenSettings(): void {
  const settings = windows.get("settings");
  if (settings) showAndFocus(settings);
}

function buildTrayMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: "New note", click: trayNewNote },
    { label: "Settings…", click: trayOpenSettings },
    { type: "separator" },
  ];

  if (pinnedNotes.length === 0) {
    template.push({ label: "No pinned notes", enabled: false });
  } else {
    template.push({ label: "Pinned", enabled: false });
    for (const note of pinnedNotes) {
      template.push({
        label: note.title || "Untitled",
        click: () => {
          broadcast("tray-switch-to-note", note.id);
          const main = windows.get("main");
          if (main) showAndFocus(main);
        },
      });
    }
  }

  template.push(
    { type: "separator" },
    { label: "Show", click: showAllNotes },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  );

  return Menu.buildFromTemplate(template);
}

function setupTray(): void {
  try {
    const icon = nativeImage.createFromPath(resourcePath("tray.png"));
    tray = new Tray(icon);
    tray.setToolTip("Foolscap");
    tray.setContextMenu(buildTrayMenu());
    tray.on("click", showAllNotes);
  } catch (e) {
    // Tray creation can fail on some Linux setups — continue without it.
    console.error("[tray] setup failed, continuing without tray:", e);
  }
}

function rebuildTray(): void {
  if (tray) tray.setContextMenu(buildTrayMenu());
}

// ---- cross-window events (ports the Tauri event bus) ----------------------

function broadcast(name: string, payload?: unknown): void {
  for (const win of windows.values()) {
    if (!win.isDestroyed()) win.webContents.send("event:message", name, payload);
  }
}

// ---- IPC ------------------------------------------------------------------

function senderWindow(
  e: IpcMainEvent | IpcMainInvokeEvent,
): BrowserWindow | null {
  return BrowserWindow.fromWebContents(e.sender);
}

function labelOf(win: BrowserWindow): string | null {
  for (const [label, w] of windows) if (w === win) return label;
  return null;
}

function registerIpc(): void {
  // --- SQLite ---
  ipcMain.handle("db:select", (_e, sql: string, params: unknown[]) =>
    dbSelect(sql, params),
  );
  ipcMain.handle("db:execute", (_e, sql: string, params: unknown[]) =>
    dbExecute(sql, params),
  );

  // --- clipboard ---
  ipcMain.handle("clipboard:readText", () => clipboard.readText());
  ipcMain.handle("clipboard:writeText", (_e, text: string) =>
    clipboard.writeText(text),
  );

  // --- cross-window event bus ---
  ipcMain.on("event:emit", (_e, name: string, payload: unknown) =>
    broadcast(name, payload),
  );

  // --- per-window control / info ---
  ipcMain.on("win:show", (e) => senderWindow(e)?.show());
  ipcMain.on("win:hide", (e) => senderWindow(e)?.hide());
  ipcMain.on("win:setPosition", (e, x: number, y: number) =>
    senderWindow(e)?.setPosition(Math.round(x), Math.round(y)),
  );
  ipcMain.handle("win:outerSize", (e) => {
    const b = senderWindow(e)?.getBounds();
    return b ? { width: b.width, height: b.height } : { width: 0, height: 0 };
  });
  ipcMain.handle("win:currentMonitor", (e) => {
    const win = senderWindow(e);
    if (!win) return null;
    const d = displayOfWindow(win);
    return {
      position: { x: d.bounds.x, y: d.bounds.y },
      size: { width: d.bounds.width, height: d.bounds.height },
    };
  });

  // --- commands (were Tauri #[command]s invoked from the frontend) ---
  ipcMain.handle("cmd:toggle_window", () => toggleAllNotes());

  ipcMain.handle("cmd:hide_window", (e) => {
    const win = senderWindow(e);
    if (!win) return;
    win.hide();
    const label = labelOf(win);
    // Closing a pool note via × means "I'm done with it" — drop it from the
    // toggle set so Alt+A doesn't bring it back. Main / settings stay.
    if (label && label !== "main" && label !== "settings") {
      openedNotes.delete(label);
    }
  });

  ipcMain.handle(
    "cmd:set_always_on_top",
    (_e, args: { on: boolean; label?: string }) => {
      const target = windows.get(args.label ?? "main");
      target?.setAlwaysOnTop(!!args.on);
    },
  );

  ipcMain.handle("cmd:open_settings", (e) => {
    const settings = windows.get("settings");
    if (!settings) return;
    const src = senderWindow(e);
    if (src) moveWindowToMonitor(settings, displayOfWindow(src));
    showAndFocus(settings);
  });

  ipcMain.handle("cmd:new_note_window", (e) => {
    const src = senderWindow(e);
    const srcDisplay = src ? displayOfWindow(src) : null;
    for (const label of NOTE_POOL) {
      const w = windows.get(label);
      if (!w || w.isVisible()) continue;
      if (srcDisplay) moveWindowToMonitor(w, srcDisplay);
      w.show();
      w.focus();
      openedNotes.add(label);
      // Tell the freshly revealed window to spawn a note. Payload = target
      // label so only that window acts (broadcast reaches everyone).
      broadcast("new-note-please", label);
      return;
    }
    throw new Error("all note windows already open");
  });

  ipcMain.handle(
    "cmd:update_tray_pinned",
    (_e, args: { pinned: { id: string; title: string }[] }) => {
      pinnedNotes = args?.pinned ?? [];
      rebuildTray();
    },
  );

  ipcMain.handle("cmd:enable_blur", (e) => applyBlur(senderWindow(e), true));
  ipcMain.handle("cmd:disable_blur", (e) => applyBlur(senderWindow(e), false));
}

// ---- lifecycle ------------------------------------------------------------

function createAllWindows(): void {
  createWindow("main");
  createWindow("settings");
  createWindow("toast");
  for (const label of NOTE_POOL) createWindow(label);
}

function init(): void {
  initDb();
  registerIpc();
  createAllWindows();

  // Main is always "opened" — closing it is hiding, not removing.
  openedNotes.add("main");
  const main = windows.get("main");
  if (main) showAndFocus(main);

  globalShortcut.register("Alt+A", toggleAllNotes);
  setupTray();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  // Second launch → surface the running instance instead of starting a new one.
  app.on("second-instance", showAllNotes);
  app.whenReady().then(init);
}

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Windows are hidden rather than closed, so this rarely fires; keep the app
// alive (tray-resident) on all platforms if it ever does.
app.on("window-all-closed", () => {
  /* stay running in the tray */
});

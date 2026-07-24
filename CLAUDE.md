# CLAUDE.md

This file gives Claude Code the full context for this project. Read it before making changes.

---

## Project: Scratchpad (working name)

A cross-platform (macOS + Windows) minimalist scratchpad app inspired by [Antinote](https://antinote.io). The philosophy is **ephemeral, fast, keyboard-first**. One global hotkey wakes the app, you dump a thought / compute something / start a timer, and you move on.

This is **not** Notion, Obsidian, or Evernote. It is **not** a knowledge base. It is the digital equivalent of a sticky note pad next to your keyboard — but with superpowers.

### Core principles

1. **Three-second rule.** From hotkey press to first keystroke captured: under 300ms perceived latency.
2. **Ephemeral by default.** Notes auto-rotate / auto-delete. Organizing is overrated.
3. **Keyboard-first.** Every action reachable without a mouse. Mouse is optional, not required.
4. **Plain text.** No rich text. Markdown-light only (bold, italic, headers, code, checklists). Paste strips formatting.
5. **Minimalist aesthetic.** Slick, calm, low chrome. The note IS the UI.
6. **Cross-platform parity.** macOS and Windows behave identically. No platform should feel second-class.

---

## Stack

- **Framework:** Electron (Node main process + Chromium renderer). Built and bundled with `electron-vite`; packaged with `electron-builder`.
- **Frontend:** Vue 3 + TypeScript + Vite (renderer).
- **Storage:** SQLite via `sql.js` (SQLite compiled to WebAssembly) in the main process — pure JS/WASM, no native module to build — exposed to the renderer over IPC (local-only, no cloud in v1). The in-memory DB image is persisted to `foolscap.db` in `userData` after each write.
- **Math engine:** `mathjs` (JS).
- **Global hotkey / clipboard / tray / windows:** Electron `globalShortcut`, `clipboard`, `Tray`, and `BrowserWindow` — all driven from the main process (`electron/main.ts`).
- **Renderer ↔ main bridge:** a `contextBridge` preload (`electron/preload.ts`) exposes `window.foolscap`; the renderer imports thin shims from `src/bridge/*` that reproduce the small API surface the app was written against.

**Migration note:** the app originally shipped on Tauri 2 (Rust backend, `src-tauri/`). It was migrated to Electron. The Windows-specific window effects from the old backend — persistent acrylic (`SetWindowCompositionAttribute` + `ACCENT_ENABLE_ACRYLICBLURBEHIND`) and forced Win11 rounded corners (`DwmSetWindowAttribute`) — are restored in `electron/win-effects.ts` via `koffi` FFI (prebuilt N-API, no compiler needed), with a fallback to Electron's built-in `setBackgroundMaterial('acrylic')` if the native call is unavailable. macOS uses `setVibrancy`. All best-effort and guarded so a failure never breaks the app.

---

## Features (v1 scope)

We are deliberately **not** rebuilding all of Antinote. We are pushing four pillars further than Antinote does.

### 1. Math engine (the headline feature)

Beyond simple inline math. Think: a programmable scratchpad calculator.

- **Inline expressions:** `2 + 2 = 4` resolved on the line
- **Named variables:** `rent = 1200`, `salary = 5000`, then `salary - rent` resolves
- **Persistent formulas:** variables live for the duration of the note. Edit `rent`, downstream values recalc
- **Units & conversions:** `5 km in mi`, `100 usd in eur`, crypto support (`1 btc in usd` — needs price API, v1.5)
- **Functions:** `sum(...)`, `avg(...)`, `count(...)` over selections or labeled ranges
- **Comments:** `# this is a note`, ignored by parser
- **Future (v2):** mini-graphs inline (`plot(x, x^2, 0, 10)` → tiny inline SVG). Big idea, not v1.

**Implementation note:** parse line-by-line into an AST, maintain a per-note evaluation context, re-evaluate downstream lines when an upstream value changes. Debounce evaluation (~50ms after keystroke).

### 2. Programmable timers (push beyond Pomodoro)

- **Named timers:** `timer 5m: laundry`
- **Multiple in parallel:** unlimited concurrent timers per note
- **Recurring / programmable:**
  - `every 25m: stretch` → fires every 25 minutes until dismissed
  - `every 1h x 8: drink water` → fires every hour, 8 times total
  - `at 14:30: meeting` → one-shot at absolute time
  - `pomodoro 25/5 x 4` → full session, 4 work blocks of 25min with 5min breaks
- **Stats:** how many pomodoros today/week, longest streak, total focus time
- **Notifications:** native OS notif + optional full-screen alert + optional sound
- **Menu bar countdown** for the active timer

**Implementation note:** timers persist across app restarts (store next-fire timestamp in SQLite). A single "timer hub" runs in the hidden toast window's renderer (with `backgroundThrottling` disabled) so timers keep firing even when every visible window is hidden — no per-window duplication.

### 3. Checklists

Lightweight but powerful.

- `[ ] task` and `[x] done` (markdown standard)
- Toggle with cursor on line + keyboard shortcut (`Cmd/Ctrl + Enter`)
- **Nesting:** indent with Tab, supports sub-tasks
- **Quick-add keyword:** type `todo: foo` → auto-converts to `[ ] foo`
- **Bulk actions:** `Cmd/Ctrl + Shift + X` to clear all done, `Cmd/Ctrl + Shift + A` to check all
- **Progress indicator:** show `3/7` somewhere subtle in the note header
- **Drag to reorder** (mouse) + `Alt + Up/Down` (keyboard)

### 4. Paste mode (clipboard superpowers)

The most underrated Antinote feature, pushed further.

- **AutoPaste:** when the app is focused, anything copied system-wide gets appended to the current note. Toggle on/off per note.
- **Clipboard history:** last N items (default 20) accessible via a keystroke (`Cmd/Ctrl + Shift + V`). Pick one, paste it.
- **Auto-transformations on paste:**
  - URLs → auto-shrink with smart title fetch (background)
  - JSON → pretty-print
  - Multi-line code → wrap in backticks
  - Tabs/CSV → align as table (optional)
- **Templates:** define snippets with placeholders. `/email` → paste a template, tab through placeholders.
- **Strip formatting always.** Plain text only.

---

## Architecture

```
foolscap/
├── electron/               # Electron main process (Node) — replaces src-tauri
│   ├── main.ts             # windows, tray, Alt+A hotkey, single-instance, IPC
│   ├── preload.ts          # contextBridge → window.foolscap
│   └── db.ts               # SQLite (sql.js / WASM) + schema/migration
├── src/                    # Renderer — Vue 3 + TypeScript
│   ├── bridge/             # thin shims reproducing the old Tauri API surface
│   │   ├── sql.ts          # Database.load/select/execute (→ IPC)
│   │   ├── event.ts        # emit/listen cross-window bus
│   │   ├── core.ts         # invoke(cmd) → main-process command
│   │   ├── window.ts       # getCurrentWindow / currentMonitor
│   │   └── clipboard.ts    # readText / writeText
│   ├── lib/
│   │   ├── editor/         # CodeMirror 6 editor component
│   │   ├── math/           # math evaluator (mathjs wrapper)
│   │   ├── timers/         # timer parser + hub (runs in the toast window)
│   │   ├── checklist/      # checklist parser & renderer
│   │   ├── paste/          # paste handlers & transformations
│   │   └── theme/          # theme system
│   ├── settings/           # settings window app
│   ├── toast/              # toast/notification window app
│   └── main.ts             # renderer entry — mounts App/Settings/Toast by label
├── electron.vite.config.ts # electron-vite: main + preload + renderer builds
├── resources/              # runtime assets (tray icon) bundled via extraResources
├── build/                  # installer icons for electron-builder
├── CLAUDE.md
├── README.md
└── package.json
```

### Data model (SQLite)

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,           -- UUID
  content TEXT NOT NULL,
  position INTEGER NOT NULL,     -- ordering, 0 = front
  pinned INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  auto_delete_at INTEGER         -- nullable; if set, delete after this timestamp
);

CREATE TABLE timers (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  label TEXT,
  kind TEXT NOT NULL,            -- 'countdown' | 'recurring' | 'at_time' | 'pomodoro'
  next_fire_at INTEGER NOT NULL,
  config TEXT NOT NULL,          -- JSON: interval, max_fires, fires_so_far, etc.
  active INTEGER DEFAULT 1
);

CREATE TABLE clipboard_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  copied_at INTEGER NOT NULL
  -- pruned to last N items by trigger or background job
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Window modes (parity with Antinote)

- **Dock mode:** floating window, draggable, resizable, can be always-on-top
- **Menu mode:** anchored under a menu bar / system tray icon, click outside to dismiss
- **Dropdown mode:** slides down from top of screen (like Spotlight / Raycast)

Switch via settings. Must work on both macOS and Windows. Windows doesn't have a real "menu bar" — use system tray instead.

### Global hotkey

Default: `Alt + A` (cross-platform; `Option + A` on macOS is the same key). User-configurable. Pressing it:

1. If app is hidden → show + focus
2. If app is focused → hide
3. If app is visible but unfocused → focus

---

## What we are explicitly NOT building (v1)

- Cloud sync / accounts / multi-device
- Mobile (iOS, Android)
- Rich text formatting (bold via toolbar, fonts, colors in text)
- Image embedding (OCR-on-paste maybe, but no inline images)
- Collaboration / sharing
- Themes beyond 2-3 starters (theme maker is v2)
- JS extensions / plugins (v2)
- Vim mode (v2)
- Export to Obsidian/Bear/Apple Notes (v2 — focus on .txt and clipboard export only in v1)

Keep scope tight. Better to ship 4 features that feel like magic than 14 that feel okay.

---

## Code style & conventions

- **TypeScript strict mode.** No `any` unless justified in a comment. Applies to the renderer (`src/`) and the Electron main process (`electron/`) alike.
- **No unnecessary dependencies.** Every npm addition needs a one-line justification in the PR.
- **Components small and pure.** UI logic separated from business logic.
- **Math, timer, and parser modules:** pure functions with unit tests. These are the spots bugs hide.
- **Latency budget:** every user-facing action under 50ms (eval, save, render). Profile if not.

---

## Testing

- Vitest for the pure logic: math evaluator, checklist/timer parsers, paste transformations, ephemeral helpers
- E2E (later): Playwright (Electron support) — defer until v1 is feature-complete
- **No tests for UI styling.** Visual regression is not worth the setup at this stage.

---

## Roadmap

**v0.1 (skeleton, week 1-2)**
- Tauri shell, global hotkey, single-note editor, SQLite persistence, dock mode

**v0.2 (math, week 3)**
- Inline expressions, named variables, reactive recalc, basic conversions

**v0.3 (timers, week 4)**
- All four timer kinds, native notifications, menu bar countdown, persistence across restart

**v0.4 (checklists + paste mode, week 5)**
- Checklist parsing & keyboard shortcuts, clipboard history, autopaste, basic transformations

**v0.5 (polish, week 6)**
- Multi-note (swipe nav), 2-3 themes, menu + dropdown modes, settings UI

**v1.0**
- Cross-platform installer (macOS .dmg, Windows .msi), code signing, landing page

**v1.5+ ideas**
- Inline mini-graphs (the big idea)
- Templates with placeholders
- Crypto/currency conversion API
- Pomodoro stats dashboard

---

## Open questions for the developer / Claude

1. **Math engine location:** evaluate in JS (mathjs, fast iteration, easy graphs later) or Rust (faster, but graphs harder)? **Recommendation: start in JS with mathjs, port to Rust only if perf becomes an issue.**
2. **Editor:** roll our own contenteditable-based editor for full control, or use a tiny lib like CodeMirror 6 minimal? CodeMirror gives us syntax highlighting for math/checklists for free but adds ~150KB. **Recommendation: CodeMirror 6, tree-shaken aggressively.**
3. **Framework on frontend:** Svelte 5 (runes) vs Solid. Both are good. Svelte has bigger ecosystem; Solid is closer to React mental model. **Recommendation: Svelte 5 — better DX for small apps, smaller output.**
4. **Theme system:** CSS variables only, or a JSON theme spec? **Recommendation: CSS vars + a small JSON manifest per theme for metadata.**

These are not blocking — start building and revisit when the tradeoffs become concrete.

---

## Quick start for Claude Code

When you start a new task on this project:

1. Read this file first.
2. Check the relevant module's existing code before adding new code.
3. Default to small, focused PRs / commits — one feature or one bug per commit.
4. If a task touches the math engine, timer scheduler, or parser: write the test first.
5. If a task touches the UI: keep changes scoped, don't refactor adjacent code "while you're there".
6. If you hit an architectural fork, ask before committing to one direction.
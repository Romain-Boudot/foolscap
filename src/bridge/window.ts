// Drop-in replacement for the slice of `@tauri-apps/api/window` this app uses:
// `getCurrentWindow()`, `currentMonitor()`, and the `PhysicalPosition` class.
//
// Window dragging is handled by CSS `-webkit-app-region: drag` on the title
// bars (the idiomatic Electron approach), so `startDragging()` is a no-op kept
// only for API compatibility.

import type { UnlistenFn } from "./event";

export class PhysicalPosition {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

export interface Monitor {
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface AppWindow {
  label: string;
  startDragging(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  outerSize(): Promise<{ width: number; height: number }>;
  setPosition(pos: PhysicalPosition): Promise<void>;
  onFocusChanged(
    cb: (event: { payload: boolean }) => void,
  ): Promise<UnlistenFn>;
}

export function getCurrentWindow(): AppWindow {
  const f = window.foolscap;
  return {
    label: f.label,
    startDragging: () => Promise.resolve(),
    show: () => {
      f.win.show();
      return Promise.resolve();
    },
    hide: () => {
      f.win.hide();
      return Promise.resolve();
    },
    outerSize: () => f.win.outerSize(),
    setPosition: (pos: PhysicalPosition) => {
      f.win.setPosition(pos.x, pos.y);
      return Promise.resolve();
    },
    onFocusChanged: (cb: (event: { payload: boolean }) => void) =>
      Promise.resolve(f.win.onFocusChanged(cb)),
  };
}

export function currentMonitor(): Promise<Monitor | null> {
  return window.foolscap.win.currentMonitor();
}

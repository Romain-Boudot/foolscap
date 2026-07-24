// Windows-only native window effects, restored from the original Tauri backend
// (src-tauri/src/acrylic.rs + corners.rs) via koffi FFI. koffi ships prebuilt
// N-API binaries, so this needs NO compiler — the whole point of not going
// back to a build step.
//
// Two effects:
//  1. Persistent acrylic blur via the undocumented SetWindowCompositionAttribute
//     + ACCENT_ENABLE_ACRYLICBLURBEHIND. Unlike the DWM SystemBackdrop material
//     (Electron's setBackgroundMaterial), this does NOT dim to solid when the
//     window loses focus.
//  2. Rounded corners on the borderless/transparent window via
//     DwmSetWindowAttribute(DWMWA_WINDOW_CORNER_PREFERENCE = DWMWCP_ROUND) —
//     otherwise the acrylic is rendered into the square window shape.
//
// Everything is best-effort: any failure (non-Windows, missing export, koffi
// not loadable) is swallowed so the app keeps working. On non-Windows every
// function is a no-op and koffi is never even required.

import type { BrowserWindow } from "electron";

const DWMWA_WINDOW_CORNER_PREFERENCE = 33;
const DWMWCP_ROUND = 2;
const WCA_ACCENT_POLICY = 19;
const ACCENT_DISABLED = 0;
const ACCENT_ENABLE_ACRYLICBLURBEHIND = 4;

type DwmFn = (hwnd: bigint, attr: number, pv: Buffer, cb: number) => number;
type SwcaFn = (hwnd: bigint, data: unknown) => number;

let tried = false;
let dwmSetWindowAttribute: DwmFn | null = null;
let setWindowCompositionAttribute: SwcaFn | null = null;

function load(): void {
  if (tried) return;
  tried = true;
  if (process.platform !== "win32") return;
  try {
    // Required lazily so non-Windows never touches koffi's native binary.
    const koffi = require("koffi");
    const dwmapi = koffi.load("dwmapi.dll");
    const user32 = koffi.load("user32.dll");

    dwmSetWindowAttribute = dwmapi.func(
      "int __stdcall DwmSetWindowAttribute(uint64 hwnd, uint32 dwAttribute, void *pvAttribute, uint32 cbAttribute)",
    );

    koffi.struct("WINDOWCOMPOSITIONATTRIBDATA", {
      Attrib: "uint32",
      pvData: "void *",
      cbData: "size_t",
    });
    setWindowCompositionAttribute = user32.func(
      "int __stdcall SetWindowCompositionAttribute(uint64 hwnd, WINDOWCOMPOSITIONATTRIBDATA *data)",
    );
  } catch (e) {
    console.error("[win-effects] FFI unavailable, effects disabled:", e);
    dwmSetWindowAttribute = null;
    setWindowCompositionAttribute = null;
  }
}

function hwndOf(win: BrowserWindow): bigint {
  const buf = win.getNativeWindowHandle();
  return buf.length >= 8
    ? buf.readBigUInt64LE(0)
    : BigInt(buf.readUInt32LE(0));
}

/** Force Win11 rounded corners on a borderless/transparent window. No-op off
 *  Windows or if the FFI didn't load. */
export function roundCorners(win: BrowserWindow): void {
  load();
  if (!dwmSetWindowAttribute) return;
  try {
    const pref = Buffer.alloc(4);
    pref.writeInt32LE(DWMWCP_ROUND, 0);
    dwmSetWindowAttribute(
      hwndOf(win),
      DWMWA_WINDOW_CORNER_PREFERENCE,
      pref,
      4,
    );
  } catch (e) {
    console.error("[win-effects] roundCorners failed:", e);
  }
}

/** Enable/disable persistent acrylic with the given ABGR tint (packed u32,
 *  same layout the renderer sends). Returns true if the native call ran, so
 *  the caller can fall back to setBackgroundMaterial when it didn't. */
export function setAcrylic(
  win: BrowserWindow,
  on: boolean,
  tintAbgr: number,
): boolean {
  load();
  if (!setWindowCompositionAttribute) return false;
  try {
    // ACCENT_POLICY: { u32 AccentState; u32 AccentFlags; u32 GradientColor; u32 AnimationId; }
    const accent = Buffer.alloc(16);
    accent.writeUInt32LE(
      on ? ACCENT_ENABLE_ACRYLICBLURBEHIND : ACCENT_DISABLED,
      0,
    );
    accent.writeUInt32LE(0, 4);
    accent.writeUInt32LE(on ? tintAbgr >>> 0 : 0, 8);
    accent.writeUInt32LE(0, 12);
    // koffi passes the Buffer's address for the `void *pvData` field.
    setWindowCompositionAttribute(hwndOf(win), {
      Attrib: WCA_ACCENT_POLICY,
      pvData: accent,
      cbData: 16,
    });
    return true;
  } catch (e) {
    console.error("[win-effects] setAcrylic failed:", e);
    return false;
  }
}

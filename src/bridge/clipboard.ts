// Drop-in replacement for `@tauri-apps/plugin-clipboard-manager`. Reads/writes
// the system clipboard via Electron's `clipboard` module in the main process.

export function readText(): Promise<string> {
  return window.foolscap.clipboard.readText();
}

export function writeText(text: string): Promise<void> {
  return window.foolscap.clipboard.writeText(text);
}

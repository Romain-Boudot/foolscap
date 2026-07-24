// Drop-in replacement for `@tauri-apps/api/core`. `invoke(cmd, args)` calls
// the matching `cmd:<name>` IPC handler in the Electron main process.

export function invoke<T = void>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  return window.foolscap.invoke(cmd, args) as Promise<T>;
}

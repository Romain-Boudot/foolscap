// Drop-in replacement for `@tauri-apps/api/event`. `emit` broadcasts to every
// window (including the sender, matching Tauri semantics); `listen` returns a
// Promise<UnlistenFn> so existing call sites keep working unchanged.

export type UnlistenFn = () => void;

export function emit(name: string, payload?: unknown): Promise<void> {
  return window.foolscap.emit(name, payload);
}

export function listen<T = unknown>(
  name: string,
  cb: (event: { payload: T }) => void,
): Promise<UnlistenFn> {
  const un = window.foolscap.listen(
    name,
    cb as (event: { payload: unknown }) => void,
  );
  return Promise.resolve(un);
}

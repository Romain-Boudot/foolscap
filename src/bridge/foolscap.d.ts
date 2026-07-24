// Ambient type for the object the Electron preload injects on `window`.
// The bridge/* modules build the old Tauri API surface on top of this.

export {};

declare global {
  interface Window {
    foolscap: {
      label: string;
      db: {
        select(sql: string, params?: unknown[]): Promise<unknown>;
        execute(
          sql: string,
          params?: unknown[],
        ): Promise<{ rowsAffected: number; lastInsertId: number }>;
      };
      clipboard: {
        readText(): Promise<string>;
        writeText(text: string): Promise<void>;
      };
      invoke(cmd: string, args?: unknown): Promise<unknown>;
      emit(name: string, payload?: unknown): Promise<void>;
      listen(
        name: string,
        cb: (event: { payload: unknown }) => void,
      ): () => void;
      win: {
        show(): void;
        hide(): void;
        outerSize(): Promise<{ width: number; height: number }>;
        setPosition(x: number, y: number): void;
        currentMonitor(): Promise<{
          position: { x: number; y: number };
          size: { width: number; height: number };
        } | null>;
        onFocusChanged(cb: (event: { payload: boolean }) => void): () => void;
      };
    };
  }
}

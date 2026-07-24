// Drop-in replacement for `@tauri-apps/plugin-sql`. Same `Database.load()`
// / `.select()` / `.execute()` shape, backed by sql.js in the main process
// over IPC. There's a single shared DB, so `load()` ignores its
// connection-string argument and returns a lightweight handle.

export default class Database {
  // There's a single shared main-process DB; instances are just handles.
  private constructor() {}

  static async load(_name: string): Promise<Database> {
    return new Database();
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T> {
    return window.foolscap.db.select(sql, params) as Promise<T>;
  }

  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rowsAffected: number; lastInsertId: number }> {
    return window.foolscap.db.execute(sql, params);
  }
}

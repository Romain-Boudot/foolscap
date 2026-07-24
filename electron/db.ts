// SQLite layer for the main process. Replaces tauri-plugin-sql.
//
// The renderer speaks the same tiny API the Tauri plugin exposed —
// `select(sql, params)` / `execute(sql, params)` with `$1, $2, …`
// placeholders — so the business logic in the renderer is untouched.
// We translate those placeholders to positional `?` and run them through
// better-sqlite3 (synchronous, fast, battle-tested).

import Database from "better-sqlite3";
import { app } from "electron";
import path from "node:path";

let db: Database.Database | null = null;

// Same schema as the old Rust migration (src-tauri/src/db/mod.rs). SQLite
// is happy to run these repeatedly thanks to IF NOT EXISTS, so this doubles
// as a lightweight, idempotent migration on every boot.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    auto_delete_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS notes_position_idx ON notes(position);

  CREATE TABLE IF NOT EXISTS timers (
    id TEXT PRIMARY KEY,
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    label TEXT,
    kind TEXT NOT NULL,
    next_fire_at INTEGER NOT NULL,
    config TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS timers_next_fire_idx ON timers(next_fire_at) WHERE active = 1;

  CREATE TABLE IF NOT EXISTS clipboard_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    copied_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export function initDb(): void {
  const file = path.join(app.getPath("userData"), "foolscap.db");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
}

// Rewrite `$1, $2, …` into positional `?`, expanding the params array so a
// reused index (e.g. `VALUES ($1, '', $2, $3, $3)`) binds the same value
// again. better-sqlite3 only needs anonymous `?` this way, which is the
// most portable form.
function toPositional(
  sql: string,
  params: unknown[],
): { sql: string; params: unknown[] } {
  const expanded: unknown[] = [];
  const rewritten = sql.replace(/\$(\d+)/g, (_m, n: string) => {
    expanded.push(params[Number(n) - 1]);
    return "?";
  });
  return { sql: rewritten, params: expanded };
}

function ensureDb(): Database.Database {
  if (!db) throw new Error("database not initialized");
  return db;
}

export function dbSelect(sql: string, params: unknown[] = []): unknown[] {
  const q = toPositional(sql, params);
  return ensureDb().prepare(q.sql).all(...(q.params as never[]));
}

export function dbExecute(
  sql: string,
  params: unknown[] = [],
): { rowsAffected: number; lastInsertId: number } {
  const q = toPositional(sql, params);
  const info = ensureDb().prepare(q.sql).run(...(q.params as never[]));
  return {
    rowsAffected: info.changes,
    lastInsertId: Number(info.lastInsertRowid),
  };
}

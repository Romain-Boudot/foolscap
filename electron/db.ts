// SQLite layer for the main process, backed by sql.js — SQLite compiled to
// WebAssembly. Pure JS/WASM: no native module, no node-gyp, no compiler
// needed to install. That's the whole reason we don't use better-sqlite3.
//
// The renderer speaks the same tiny API the Tauri plugin exposed —
// `select(sql, params)` / `execute(sql, params)` with `$1, $2, …`
// placeholders — so the renderer business logic is untouched.
//
// sql.js runs entirely in memory, so we own persistence: read the .db file
// into the engine on boot, and write the full image back after every mutation
// (the DB is a few KB, so a synchronous write is sub-millisecond).

import initSqlJs, {
  type Database as SqlDatabase,
  type SqlJsStatic,
} from "sql.js";
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

let SQL: SqlJsStatic | null = null;
let db: SqlDatabase | null = null;
let dbPath = "";

// Same schema as the old Rust migration (src-tauri/src/db/mod.rs). SQLite is
// happy to run these repeatedly thanks to IF NOT EXISTS, so this doubles as a
// lightweight, idempotent migration on every boot.
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

// Where sql-wasm.wasm lives: shipped as an extraResource when packaged, read
// straight from node_modules in dev (see the extraResources map in
// package.json).
function wasmDir(): string {
  return app.isPackaged
    ? process.resourcesPath
    : path.join(app.getAppPath(), "node_modules", "sql.js", "dist");
}

export async function initDb(): Promise<void> {
  SQL = await initSqlJs({ locateFile: (file) => path.join(wasmDir(), file) });
  dbPath = path.join(app.getPath("userData"), "foolscap.db");
  const buffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = buffer ? new SQL.Database(buffer) : new SQL.Database();
  db.run("PRAGMA foreign_keys = ON");
  db.run(SCHEMA);
  flush();
}

function ensureDb(): SqlDatabase {
  if (!db) throw new Error("database not initialized");
  return db;
}

// Persist the whole in-memory DB image to disk. Called after each mutation;
// the file is tiny, so the synchronous write is negligible and guarantees no
// data loss on crash.
function flush(): void {
  if (!db) return;
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}

// Rewrite `$1, $2, …` into positional `?`, expanding the params array so a
// reused index (e.g. `VALUES ($1, '', $2, $3, $3)`) binds the same value
// again — the most portable placeholder form for sql.js.
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

type BindValue = number | string | Uint8Array | null;

export function dbSelect(sql: string, params: unknown[] = []): unknown[] {
  const q = toPositional(sql, params);
  const stmt = ensureDb().prepare(q.sql);
  try {
    stmt.bind(q.params as BindValue[]);
    const rows: unknown[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

export function dbExecute(
  sql: string,
  params: unknown[] = [],
): { rowsAffected: number; lastInsertId: number } {
  const q = toPositional(sql, params);
  const database = ensureDb();
  database.run(q.sql, q.params as BindValue[]);
  const rowsAffected = database.getRowsModified();
  const res = database.exec("SELECT last_insert_rowid()");
  const lastInsertId = Number(res[0]?.values[0]?.[0] ?? 0);
  flush();
  return { rowsAffected, lastInsertId };
}

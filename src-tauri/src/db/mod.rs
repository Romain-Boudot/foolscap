use tauri_plugin_sql::{Migration, MigrationKind};

pub fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial schema: notes, timers, clipboard_history, settings",
        sql: r#"
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
        "#,
        kind: MigrationKind::Up,
    }]
}

import Database from "better-sqlite3";

export type Db = Database.Database;

export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      slug        TEXT PRIMARY KEY,
      url         TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      expires_at  TEXT,
      clicks      INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS link_clicks (
      slug    TEXT NOT NULL REFERENCES links(slug) ON DELETE CASCADE,
      day     TEXT NOT NULL,
      clicks  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (slug, day)
    );
  `);
  db.pragma("foreign_keys = ON");
  return db;
}

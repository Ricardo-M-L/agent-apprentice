import {
  mkdirSync,
  openSync,
  closeSync,
  unlinkSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Database } from "better-sqlite3";
import type {
  Provider,
  Teacher,
  Session,
  Event,
  Capability,
  Snapshot,
} from "../protocol/index";
const require = createRequire(
  typeof __filename === "string" ? __filename : import.meta.url,
);
export const records = sqliteTable("records", {
  kind: text("kind").notNull(),
  id: text("id").notNull(),
  value: text("value").notNull(),
});
export class Store {
  private db: Database;
  readonly orm;
  private lock: string;
  constructor(readonly directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.lock = join(directory, "coordinator.lock");
    try {
      const fd = openSync(this.lock, "wx", 0o600);
      require("node:fs").writeFileSync(fd, String(process.pid));
      closeSync(fd);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      const pid = Number(readFileSync(this.lock, "utf8"));
      let alive = true;
      try {
        process.kill(pid, 0);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ESRCH") alive = false;
      }
      if (alive)
        throw new Error(
          "Another coordinator owns this data directory. Connect the CLI to its API, or close it first.",
        );
      unlinkSync(this.lock);
      const fd = openSync(this.lock, "wx", 0o600);
      require("node:fs").writeFileSync(fd, String(process.pid));
      closeSync(fd);
    }
    try {
      const SQLite = require(
        process.env.APPRENTICE_ELECTRON === "1"
          ? "sqlite-electron"
          : "better-sqlite3",
      );
      this.db = new SQLite(join(directory, "apprentice.db"));
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");
      this.db.exec(
        "CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(kind,id)); CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,session TEXT NOT NULL,at TEXT NOT NULL,kind TEXT NOT NULL,message TEXT NOT NULL,data TEXT); CREATE INDEX IF NOT EXISTS events_session ON events(session,id); PRAGMA user_version=1;",
      );
      this.orm = drizzle(this.db, { schema: { records } });
      for (const s of this.list<Session>("session"))
        if (s.status === "running" || s.status === "queued") {
          s.status = "interrupted";
          s.error =
            "Coordinator stopped. External actions are not replayed automatically.";
          s.endedAt = new Date().toISOString();
          this.put("session", s);
        }
    } catch (e) {
      unlinkSync(this.lock);
      throw e;
    }
  }
  put<T extends { id: string }>(kind: string, value: T) {
    this.db
      .prepare(
        "INSERT INTO records(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value",
      )
      .run(kind, value.id, JSON.stringify(value));
  }
  get<T>(kind: string, id: string): T | undefined {
    const r = this.db
      .prepare("SELECT value FROM records WHERE kind=? AND id=?")
      .get(kind, id) as { value: string } | undefined;
    return r ? JSON.parse(r.value) : undefined;
  }
  list<T>(kind: string): T[] {
    return (
      this.db
        .prepare("SELECT value FROM records WHERE kind=? ORDER BY rowid DESC")
        .all(kind) as { value: string }[]
    ).map((r) => JSON.parse(r.value));
  }
  remove(kind: string, id: string) {
    this.db.prepare("DELETE FROM records WHERE kind=? AND id=?").run(kind, id);
  }
  event(
    sessionId: string,
    kind: string,
    message: string,
    data?: unknown,
  ): Event {
    const at = new Date().toISOString();
    const r = this.db
      .prepare(
        "INSERT INTO events(session,at,kind,message,data) VALUES(?,?,?,?,?)",
      )
      .run(
        sessionId,
        at,
        kind,
        message,
        data === undefined ? null : JSON.stringify(data),
      );
    return {
      id: Number(r.lastInsertRowid),
      sessionId,
      at,
      kind,
      message,
      data,
    };
  }
  events(id: string): Event[] {
    return (
      this.db
        .prepare(
          "SELECT id,session AS sessionId,at,kind,message,data FROM events WHERE session=? ORDER BY id LIMIT 1000",
        )
        .all(id) as any[]
    ).map((r) => ({ ...r, data: r.data ? JSON.parse(r.data) : undefined }));
  }
  snapshot(): Snapshot {
    return {
      providers: this.list<Provider>("provider"),
      teachers: this.list<Teacher>("teacher"),
      sessions: this.list<Session>("session"),
      capabilities: this.list<Capability>("capability"),
    };
  }
  close() {
    this.db.close();
    try {
      unlinkSync(this.lock);
    } catch {
      /* already closed */
    }
  }
}

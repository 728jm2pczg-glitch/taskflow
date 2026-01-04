// @ts-check
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** @typedef {{ id: string, title: string, done: boolean, createdAt: string }} Task */

/** @param {string} filePath */
function ensureDirForFile(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * @param {string} dbPath
 */
export function openDb(dbPath) {
  ensureDirForFile(dbPath);

  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `);

  const stmtList = db.prepare(
    "SELECT id, title, done, createdAt FROM tasks ORDER BY createdAt DESC"
  );
  const stmtGet = db.prepare(
    "SELECT id, title, done, createdAt FROM tasks WHERE id = ?"
  );
  const stmtInsert = db.prepare(
    "INSERT INTO tasks (id, title, done, createdAt) VALUES (?, ?, ?, ?)"
  );
  const stmtUpdateDone = db.prepare("UPDATE tasks SET done = ? WHERE id = ?");
  const stmtDelete = db.prepare("DELETE FROM tasks WHERE id = ?");

  /** @returns {Task[]} */
  function listTasks() {
    const rows = stmtList.all();
    return rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      done: Number(r.done) === 1,
      createdAt: String(r.createdAt),
    }));
  }

  /** @param {Task} t */
  function insertTask(t) {
    stmtInsert.run(t.id, t.title, t.done ? 1 : 0, t.createdAt);
  }

  /** @param {string} id @param {boolean} done @returns {Task | null} */
  function setDone(id, done) {
    const r = stmtUpdateDone.run(done ? 1 : 0, id);
    if (!r || r.changes === 0) return null;

    const row = stmtGet.get(id);
    if (!row) return null;

    return {
      id: String(row.id),
      title: String(row.title),
      done: Number(row.done) === 1,
      createdAt: String(row.createdAt),
    };
  }

  /** @param {string} id @returns {boolean} */
  function deleteTask(id) {
    const r = stmtDelete.run(id);
    return !!r && r.changes > 0;
  }

  return { listTasks, insertTask, setDone, deleteTask };
}

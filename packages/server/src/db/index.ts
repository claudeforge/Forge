/**
 * Database connection
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { config } from "../config.js";

// Ensure data directory exists
const dbDir = dirname(config.dbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Create SQLite connection
const sqlite = new Database(config.dbPath);
sqlite.pragma("journal_mode = WAL");

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

// SQL statements for table creation
const createTableStatements = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_activity_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    priority INTEGER NOT NULL DEFAULT 0,
    depends_on TEXT NOT NULL DEFAULT '[]',
    scheduled_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    iteration INTEGER NOT NULL DEFAULT 0,
    config TEXT NOT NULL DEFAULT '{}',
    result TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS iterations (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    iteration_num INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    duration REAL NOT NULL,
    tokens INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    summary TEXT NOT NULL,
    criteria_results TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    iteration_num INTEGER NOT NULL,
    type TEXT NOT NULL,
    git_ref TEXT NOT NULL,
    metrics TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_iterations_task ON iterations(task_id);
  CREATE INDEX IF NOT EXISTS idx_checkpoints_task ON checkpoints(task_id);
`;

// Initialize tables (create if not exist)
export function initializeDatabase(): void {
  // Run each statement separately using better-sqlite3's run method
  const statements = createTableStatements
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    sqlite.prepare(statement).run();
  }
}

export { schema };

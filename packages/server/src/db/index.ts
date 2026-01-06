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
    created_at TEXT NOT NULL,
    sync_version INTEGER NOT NULL DEFAULT 1,
    locked_by TEXT,
    locked_at TEXT,
    lock_expires_at TEXT,
    task_type TEXT,
    complexity TEXT
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

  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL,
    display_name TEXT,
    capabilities TEXT NOT NULL DEFAULT '[]',
    registered_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    is_online INTEGER NOT NULL DEFAULT 0,
    logical_clock INTEGER NOT NULL DEFAULT 0,
    metadata TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS sync_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    logical_clock INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    params TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    result TEXT,
    created_at TEXT NOT NULL,
    applied_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_iterations_task ON iterations(task_id);
  CREATE INDEX IF NOT EXISTS idx_checkpoints_task ON checkpoints(task_id);
  CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project_id);
  CREATE INDEX IF NOT EXISTS idx_sync_log_project ON sync_log(project_id);
  CREATE INDEX IF NOT EXISTS idx_sync_log_task ON sync_log(task_id);
  CREATE INDEX IF NOT EXISTS idx_interventions_task ON interventions(task_id);
`;

// Migration statements for existing databases
const migrationStatements = [
  // Add sync columns to tasks table if they don't exist
  "ALTER TABLE tasks ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE tasks ADD COLUMN locked_by TEXT",
  "ALTER TABLE tasks ADD COLUMN locked_at TEXT",
  "ALTER TABLE tasks ADD COLUMN lock_expires_at TEXT",
  // Add type and complexity columns
  "ALTER TABLE tasks ADD COLUMN task_type TEXT",
  "ALTER TABLE tasks ADD COLUMN complexity TEXT",
];

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

  // Run migrations for existing databases (ignore errors for already-existing columns)
  for (const migration of migrationStatements) {
    try {
      sqlite.prepare(migration).run();
    } catch (err) {
      // Ignore "duplicate column name" errors - means migration already applied
      const error = err as Error;
      if (!error.message.includes("duplicate column name")) {
        console.warn(`Migration warning: ${error.message}`);
      }
    }
  }
}

export { schema };

/**
 * Database schema using Drizzle ORM
 *
 * Includes:
 * - Projects and Tasks (core entities)
 * - Iterations and Checkpoints (execution tracking)
 * - Nodes and TaskLocks (sync infrastructure)
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ============================================
// PROJECTS
// ============================================

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  createdAt: text("created_at").notNull(),
  lastActivityAt: text("last_activity_at"),
});

// ============================================
// TASKS
// ============================================

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("queued"),
  priority: integer("priority").notNull().default(0),
  dependsOn: text("depends_on").notNull().default("[]"), // JSON array
  scheduledAt: text("scheduled_at"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  iteration: integer("iteration").notNull().default(0),
  config: text("config").notNull().default("{}"), // JSON
  result: text("result"), // JSON, nullable
  createdAt: text("created_at").notNull(),

  // Sync fields (v2.0)
  syncVersion: integer("sync_version").notNull().default(1),
  lockedBy: text("locked_by"), // Node ID holding lock
  lockedAt: text("locked_at"),
  lockExpiresAt: text("lock_expires_at"),
});

// ============================================
// ITERATIONS
// ============================================

export const iterations = sqliteTable("iterations", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  iterationNum: integer("iteration_num").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull(),
  duration: real("duration").notNull(),
  tokens: integer("tokens").notNull(),
  outcome: text("outcome").notNull(),
  summary: text("summary").notNull(),
  criteriaResults: text("criteria_results").notNull().default("[]"), // JSON
  createdAt: text("created_at").notNull(),
});

// ============================================
// CHECKPOINTS
// ============================================

export const checkpoints = sqliteTable("checkpoints", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  iterationNum: integer("iteration_num").notNull(),
  type: text("type").notNull(), // auto | manual
  gitRef: text("git_ref").notNull(),
  metrics: text("metrics").notNull().default("{}"), // JSON
  createdAt: text("created_at").notNull(),
});

// ============================================
// NODES (Sync Infrastructure)
// ============================================

export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(), // nodeId (UUID)
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  nodeType: text("node_type").notNull(), // "plugin" | "server"
  displayName: text("display_name"),
  capabilities: text("capabilities").notNull().default("[]"), // JSON array
  registeredAt: text("registered_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  isOnline: integer("is_online", { mode: "boolean" }).notNull().default(false),
  logicalClock: integer("logical_clock").notNull().default(0),
  metadata: text("metadata").notNull().default("{}"), // JSON
});

// ============================================
// SYNC LOG (Operation History)
// ============================================

export const syncLog = sqliteTable("sync_log", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  operation: text("operation").notNull(), // "status_change" | "lock" | "unlock" | "heartbeat"
  oldValue: text("old_value"), // JSON
  newValue: text("new_value"), // JSON
  logicalClock: integer("logical_clock").notNull(),
  timestamp: text("timestamp").notNull(),
});

// ============================================
// INTERVENTIONS (Control Center Actions)
// ============================================

export const interventions = sqliteTable("interventions", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // InterventionType
  requestedBy: text("requested_by").notNull(),
  reason: text("reason").notNull(),
  params: text("params").notNull().default("{}"), // JSON
  status: text("status").notNull().default("pending"), // pending | applied | failed
  result: text("result"), // JSON
  createdAt: text("created_at").notNull(),
  appliedAt: text("applied_at"),
});

// ============================================
// TYPES
// ============================================

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Iteration = typeof iterations.$inferSelect;
export type NewIteration = typeof iterations.$inferInsert;

export type CheckpointRecord = typeof checkpoints.$inferSelect;
export type NewCheckpoint = typeof checkpoints.$inferInsert;

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;

export type SyncLogEntry = typeof syncLog.$inferSelect;
export type NewSyncLogEntry = typeof syncLog.$inferInsert;

export type Intervention = typeof interventions.$inferSelect;
export type NewIntervention = typeof interventions.$inferInsert;

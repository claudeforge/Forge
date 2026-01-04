/**
 * Database schema using Drizzle ORM
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
// COST LOG
// ============================================

export const costLog = sqliteTable("cost_log", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  tokens: integer("tokens").notNull(),
  cost: real("cost").notNull(),
  createdAt: text("created_at").notNull(),
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

export type CostLogEntry = typeof costLog.$inferSelect;
export type NewCostLogEntry = typeof costLog.$inferInsert;

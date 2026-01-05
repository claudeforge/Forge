/**
 * Specification-Driven Development Types
 */

import type { StuckStrategy } from "./state.js";

// ============================================
// TASK FILE STRUCTURE
// ============================================

/** Task complexity levels */
export type TaskComplexity = "low" | "medium" | "high";

/** Task types */
export type TaskType = "feature" | "bugfix" | "refactor" | "test" | "docs" | "chore";

/** Task status */
export type TaskFileStatus =
  | "pending"    // Not yet queued
  | "queued"     // In Control Center queue
  | "blocked"    // Waiting for dependencies
  | "running"    // Currently executing
  | "completed"  // Successfully finished
  | "failed"     // Failed after max attempts
  | "skipped";   // Skipped by user

/** Criterion definition in task file */
export interface TaskCriterion {
  type: string;
  name: string;
  config: Record<string, unknown>;
}

/** Technical details section */
export interface TaskTechnical {
  /** Implementation approach */
  approach: string;
  /** Files to create */
  files_to_create: string[];
  /** Files to modify */
  files_to_modify: string[];
  /** Technical considerations */
  considerations: string[];
}

/** Execution configuration */
export interface TaskExecution {
  /** Maximum iterations before failing */
  max_iterations: number;
  /** Create checkpoint every N iterations */
  checkpoint_every: number;
  /** What to do when stuck */
  on_stuck: StuckStrategy;
  /** Timeout in minutes */
  timeout_minutes: number | null;
}

/** Task source - where the task was created */
export type TaskSource =
  | "forge-plan"      // Created by /forge:forge-plan (proper workflow)
  | "forge-adopt"     // Adopted from WebUI via /forge:forge-adopt
  | "webui-direct"    // Created directly in WebUI (needs adoption)
  | "webui-quick"     // Quick-add from WebUI (needs adoption)
  | "api-import"      // Imported via API (needs adoption)
  | "manual";         // Hand-written YAML file

/** Complete task file structure */
export interface TaskDefinition {
  // Identity
  id: string;                    // t001, t002, etc.
  title: string;
  description: string;

  // Dependencies
  depends_on: string[];          // Task IDs this depends on
  blocks: string[];              // Task IDs blocked by this

  // Classification
  type: TaskType;
  priority: number;              // 1 = highest
  complexity: TaskComplexity;

  // Technical Details
  technical: TaskTechnical;

  // Success Criteria
  criteria: TaskCriterion[];

  // Execution Config
  execution: TaskExecution;

  // Goals (human-readable)
  goals: string[];

  // Status Tracking
  status: TaskFileStatus;
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  iterations: number;
  result: TaskDefResult | null;

  // Metadata
  spec_id: string | null;
  plan_id: string | null;
  created_at: string;
  created_by: string;

  // Source Tracking
  source: TaskSource;            // Where this task came from
  original_id?: string;          // Original ID if adopted
  needs_formalization: boolean;  // True if created outside proper workflow
}

/** Task definition execution result (local file) */
export interface TaskDefResult {
  success: boolean;
  iterations: number;
  duration: number;
  tokens: number;
  files_created: string[];
  files_modified: string[];
  summary: string;
  error?: string;
}

// ============================================
// SPECIFICATION STRUCTURE
// ============================================

/** Specification status */
export type SpecStatus = "draft" | "approved" | "in_progress" | "completed" | "cancelled";

/** Specification metadata */
export interface SpecMetadata {
  id: string;                    // spec-001, spec-002, etc.
  title: string;
  description: string;
  status: SpecStatus;

  // Linked resources
  plan_id: string | null;
  task_ids: string[];

  // Tracking
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;

  // Progress
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
}

// ============================================
// PLAN STRUCTURE
// ============================================

/** Plan status */
export type PlanStatus = "draft" | "approved" | "executing" | "completed" | "failed";

/** Plan metadata */
export interface PlanMetadata {
  id: string;                    // plan-001, plan-002, etc.
  title: string;
  spec_id: string;
  status: PlanStatus;

  // Architecture decisions
  decisions: string[];

  // Task breakdown
  task_ids: string[];
  task_order: string[];          // Execution order considering deps

  // Tracking
  created_at: string;
  started_at: string | null;
  completed_at: string | null;

  // Progress
  total_tasks: number;
  completed_tasks: number;
  current_task: string | null;
}

// ============================================
// DEPENDENCY GRAPH
// ============================================

/** Task node in dependency graph */
export interface TaskNode {
  id: string;
  title: string;
  status: TaskFileStatus;
  depends_on: string[];
  blocks: string[];
  depth: number;                 // 0 = no dependencies
}

/** Dependency graph for visualization */
export interface DependencyGraph {
  nodes: TaskNode[];
  edges: Array<{ from: string; to: string }>;
  execution_order: string[];     // Topologically sorted
}

// ============================================
// HELPERS
// ============================================

/** Default task execution config */
export const DEFAULT_TASK_EXECUTION: TaskExecution = {
  max_iterations: 30,
  checkpoint_every: 10,
  on_stuck: "retry-variation",
  timeout_minutes: null,
};

/** Create a new task ID */
export function createTaskId(num: number): string {
  return `t${String(num).padStart(3, "0")}`;
}

/** Create a new spec ID */
export function createSpecId(num: number): string {
  return `spec-${String(num).padStart(3, "0")}`;
}

/** Create a new plan ID */
export function createPlanId(num: number): string {
  return `plan-${String(num).padStart(3, "0")}`;
}

/** Parse task ID to get number */
export function parseTaskId(id: string): number {
  const match = id.match(/^t(\d+)$/);
  return match ? parseInt(match[1]!, 10) : 0;
}

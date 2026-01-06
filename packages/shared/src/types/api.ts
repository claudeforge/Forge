/**
 * API Types - Control Center REST API
 */

import type { ForgeMetrics, QualityGate } from "./state.js";
import type { TaskStatus } from "./sync.js";
import type { CompletionCriterion, CriterionResult } from "./criteria.js";
import type { TaskType, TaskComplexity } from "./spec.js";

// ============================================
// PROJECT
// ============================================

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastActivityAt: string | null;
}

export interface CreateProjectRequest {
  name: string;
  path: string;
}

// ============================================
// TASK
// ============================================

export interface Task {
  id: string;
  projectId: string;
  name: string;
  prompt: string;
  status: TaskStatus;
  priority: number;
  dependsOn: string[];
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  iteration: number;
  config: TaskConfig;
  result: TaskResult | null;
  createdAt: string;
  taskType: TaskType | null;
  complexity: TaskComplexity | null;
}

export interface TaskConfig {
  criteria: CompletionCriterion[];
  maxIterations: number;
  maxDuration: number | null;
  checkpointInterval: number;
  stuckStrategy: string;
  qualityGates: QualityGate[];
}

export interface TaskResult {
  iterations: number;
  metrics: ForgeMetrics;
  criteriaResults: CriterionResult[];
  outcome: "completed" | "failed" | "aborted";
  failureReason?: string;
}

export interface CreateTaskRequest {
  projectId: string;
  name: string;
  prompt: string;
  priority?: number;
  dependsOn?: string[];
  scheduledAt?: string;
  config?: Partial<TaskConfig>;
  taskType?: TaskType;
  complexity?: TaskComplexity;
}

export interface UpdateTaskRequest {
  status?: TaskStatus;
  priority?: number;
  scheduledAt?: string | null;
}

// ============================================
// QUEUE
// ============================================

export interface QueueStatus {
  running: Task | null;
  queued: Task[];
  concurrency: number;
  isProcessing: boolean;
}

export interface ReorderQueueRequest {
  taskIds: string[];
}

// ============================================
// STATS
// ============================================

export interface Stats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalIterations: number;
  totalDuration: number;
  tasksToday: number;
}

// ============================================
// WEBSOCKET
// ============================================

export type WSMessage =
  | { type: "connected"; clientId: string }
  | { type: "task:update"; task: Task }
  | { type: "queue:update"; queue: QueueStatus }
  | { type: "iteration"; taskId: string; iteration: number; record: object }
  | { type: "output"; taskId: string; content: string };

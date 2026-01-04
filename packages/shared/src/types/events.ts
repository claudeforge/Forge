/**
 * Webhook Event Types
 * Events sent from Plugin to Control Center
 */

import type { ForgeMetrics, IterationRecord, StuckStrategy, Checkpoint } from "./state.js";
import type { CompletionCriterion, CriterionResult } from "./criteria.js";

// ============================================
// BASE EVENT
// ============================================

interface BaseEvent {
  /** Event type */
  type: string;
  /** Project ID */
  projectId: string;
  /** Task ID */
  taskId: string;
  /** Timestamp (ISO) */
  timestamp: string;
}

// ============================================
// EVENT TYPES
// ============================================

/** Task started */
export interface TaskStartedEvent extends BaseEvent {
  type: "task:started";
  name: string;
  prompt: string;
  criteria: CompletionCriterion[];
}

/** Task progress (on each iteration) */
export interface TaskProgressEvent extends BaseEvent {
  type: "task:progress";
  iteration: number;
  iterationRecord: IterationRecord;
  metrics: ForgeMetrics;
  criteriaResults: CriterionResult[];
}

/** Task completed */
export interface TaskCompletedEvent extends BaseEvent {
  type: "task:completed";
  iterations: number;
  metrics: ForgeMetrics;
  criteriaResults: CriterionResult[];
}

/** Task failed */
export interface TaskFailedEvent extends BaseEvent {
  type: "task:failed";
  reason: "budget" | "timeout" | "max-iterations" | "error" | "aborted";
  message: string;
  metrics: ForgeMetrics;
}

/** Task stuck */
export interface TaskStuckEvent extends BaseEvent {
  type: "task:stuck";
  iteration: number;
  pattern: "same-output" | "no-progress" | "repeating-error";
  recovery: StuckStrategy;
}

/** Task paused */
export interface TaskPausedEvent extends BaseEvent {
  type: "task:paused";
  iteration: number;
}

/** Task resumed */
export interface TaskResumedEvent extends BaseEvent {
  type: "task:resumed";
  iteration: number;
}

/** Checkpoint created */
export interface CheckpointCreatedEvent extends BaseEvent {
  type: "checkpoint:created";
  checkpoint: Checkpoint;
}

/** Union of all events */
export type ForgeEvent =
  | TaskStartedEvent
  | TaskProgressEvent
  | TaskCompletedEvent
  | TaskFailedEvent
  | TaskStuckEvent
  | TaskPausedEvent
  | TaskResumedEvent
  | CheckpointCreatedEvent;

/**
 * FORGE State Types
 * Central state file: .claude/forge-state.json
 */

import type { CompletionCriterion, CriterionResult } from "./criteria.js";

// ============================================
// STATUS TYPES
// ============================================

/** Task status */
export type TaskStatus =
  | "running"    // Actively running
  | "paused"     // Paused
  | "completed"  // Successfully completed
  | "failed"     // Failed (budget, timeout, max-iter)
  | "stuck"      // Stuck and unrecoverable
  | "aborted";   // Manually aborted

/** Criteria evaluation mode */
export type CriteriaMode =
  | "all"       // All must pass
  | "any"       // Any one passes is OK
  | "weighted"; // Score >= requiredScore

/** Strategy when stuck */
export type StuckStrategy =
  | "retry-variation"  // Add "try different approach" to prompt
  | "simplify"         // Say "break down the task"
  | "rollback"         // Return to last checkpoint
  | "abort";           // Stop

/** Result of an iteration */
export type IterationOutcome =
  | "progress"      // Progress was made
  | "stuck"         // Stuck detected
  | "error"         // Error occurred
  | "gate-failed";  // Quality gate failed

// ============================================
// RECORD TYPES
// ============================================

/** Record of a single iteration */
export interface IterationRecord {
  /** Iteration number (starts from 1) */
  n: number;
  /** Start time (ISO) */
  startedAt: string;
  /** End time (ISO) */
  endedAt: string;
  /** Duration (seconds) */
  duration: number;
  /** Token count used */
  tokens: number;
  /** Outcome */
  outcome: IterationOutcome;
  /** Criteria evaluation results */
  criteriaResults: CriterionResult[];
  /** Brief summary */
  summary: string;
  /** Error message (if outcome=error) */
  error?: string;
}

/** Checkpoint record */
export interface Checkpoint {
  /** Unique ID */
  id: string;
  /** Which iteration it was created at */
  iteration: number;
  /** Creation time (ISO) */
  createdAt: string;
  /** How it was created */
  type: "auto" | "manual";
  /** Git reference (stash/commit) */
  gitRef: string;
  /** Metrics at that moment */
  metrics: ForgeMetrics;
}

/** Quality gate definition */
export interface QualityGate {
  /** Display name */
  name: string;
  /** Command to run */
  command: string;
  /** Run every N iterations */
  runEvery: number;
  /** Block loop on failure */
  blockOnFail: boolean;
  /** Auto-fix command (optional) */
  autoFix: string | null;
}

// ============================================
// METRICS & CONFIG TYPES
// ============================================

/** Collected metrics */
export interface ForgeMetrics {
  /** Total token usage */
  totalTokens: number;
  /** Total duration (milliseconds) */
  totalDuration: number;
  /** Created files */
  filesCreated: string[];
  /** Modified files */
  filesModified: string[];
}

/** Control Center connection settings */
export interface ControlCenterConfig {
  /** Is enabled */
  enabled: boolean;
  /** Control Center URL */
  url: string | null;
  /** Project ID */
  projectId: string | null;
  /** Task ID */
  taskId: string | null;
}

// ============================================
// MAIN STATE TYPE
// ============================================

/**
 * Main FORGE State
 * Stored in .claude/forge-state.json
 */
export interface ForgeState {
  /** Schema version */
  version: "1.0.0";

  /** Task information */
  task: {
    /** UUID */
    id: string;
    /** Display name */
    name: string;
    /** Original prompt */
    prompt: string;
    /** Start time (ISO) */
    startedAt: string;
    /** Current status */
    status: TaskStatus;
  };

  /** Iteration tracking */
  iteration: {
    /** Current iteration (starts from 1) */
    current: number;
    /** Maximum iterations (0 = unlimited) */
    max: number;
    /** Start of current iteration */
    currentStartedAt: string;
    /** History of all iterations */
    history: IterationRecord[];
  };

  /** Completion criteria */
  criteria: {
    /** Evaluation mode */
    mode: CriteriaMode;
    /** Required score for weighted mode (0-1) */
    requiredScore: number;
    /** Criteria list */
    items: CompletionCriterion[];
  };

  /** Resource limits */
  budget: {
    /** Maximum duration seconds (null = unlimited) */
    maxDuration: number | null;
    /** Maximum tokens (null = unlimited) */
    maxTokens: number | null;
  };

  /** Checkpoint settings */
  checkpoints: {
    /** Auto checkpoint config */
    auto: {
      enabled: boolean;
      /** Every N iterations */
      interval: number;
      /** Keep last N */
      keep: number;
    };
    /** Checkpoint list */
    items: Checkpoint[];
  };

  /** Stuck detection settings */
  stuckDetection: {
    enabled: boolean;
    /** Same output N times = stuck */
    sameOutputThreshold: number;
    /** N iterations no progress = stuck */
    noProgressThreshold: number;
    /** Recovery strategy */
    strategy: StuckStrategy;
  };

  /** Quality gates */
  qualityGates: QualityGate[];

  /** Collected metrics */
  metrics: ForgeMetrics;

  /** Control Center config */
  controlCenter: ControlCenterConfig;
}

// ============================================
// TASK FILE TYPES (stored in .forge/tasks/{id}/)
// ============================================

/**
 * Task configuration file
 * Stored in .forge/tasks/{taskId}/task.json
 */
export interface TaskFile {
  /** Task ID */
  id: string;
  /** Display name */
  name: string;
  /** Original prompt */
  prompt: string;
  /** Start time (ISO) */
  startedAt: string;
  /** End time (ISO, null if running) */
  endedAt: string | null;
  /** Current status */
  status: TaskStatus;
  /** Project info */
  project: {
    /** Project ID (from Control Center) */
    id: string | null;
    /** Control Center URL */
    controlUrl: string | null;
  };
  /** Task configuration */
  config: {
    /** Completion criteria */
    criteria: CompletionCriterion[];
    /** Max iterations (0 = unlimited) */
    maxIterations: number;
    /** Max duration seconds (null = unlimited) */
    maxDuration: number | null;
    /** Checkpoint interval */
    checkpointInterval: number;
    /** Stuck detection strategy */
    stuckStrategy: StuckStrategy;
  };
}

/**
 * Iteration result file
 * Stored in .forge/tasks/{taskId}/iterations/{num}.json
 */
export interface IterationFile {
  /** Iteration number */
  num: number;
  /** Start time (ISO) */
  startedAt: string;
  /** End time (ISO) */
  endedAt: string;
  /** Duration (seconds) */
  duration: number;
  /** Token usage */
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  /** Outcome */
  outcome: IterationOutcome;
  /** Criteria evaluation results */
  criteriaResults: Array<{
    id: string;
    name: string;
    passed: boolean;
    output: string;
    duration: number;
  }>;
  /** Brief summary of what happened */
  summary: string;
  /** Files changed in this iteration */
  filesChanged: string[];
  /** Error message (if outcome=error) */
  error?: string;
}

/**
 * Task result file
 * Stored in .forge/tasks/{taskId}/result.json
 */
export interface TaskResultFile {
  /** Final status */
  status: TaskStatus;
  /** Total iterations */
  iterations: number;
  /** Total duration (seconds) */
  duration: number;
  /** Total tokens used */
  tokens: number;
  /** Final criteria results */
  criteriaResults: Array<{
    id: string;
    name: string;
    passed: boolean;
  }>;
  /** Summary of what was accomplished */
  summary: string;
  /** All files created */
  filesCreated: string[];
  /** All files modified */
  filesModified: string[];
  /** Completion time (ISO) */
  completedAt: string;
}

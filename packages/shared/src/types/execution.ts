/**
 * Execution Status Types
 * 
 * This file defines the execution.json format - a single source of truth
 * for task execution state that lives in the project folder.
 * 
 * Both the plugin and server read/write this file for bidirectional sync.
 */

/**
 * Status of a task in the execution queue
 */
export type ExecutionTaskStatus = 
  | "queued"      // Waiting in queue
  | "running"     // Currently being executed
  | "completed"   // Successfully finished
  | "failed"      // Failed (error, max iterations, etc.)
  | "paused"      // Paused by user
  | "stuck"       // Detected as stuck
  | "aborted";    // Aborted by user

/**
 * A task in the execution queue
 */
export interface ExecutionTask {
  /** Task ID (from Control Center database) */
  id: string;
  
  /** Task display name */
  name: string;
  
  /** Current status */
  status: ExecutionTaskStatus;
  
  /** Queue priority (lower = higher priority) */
  priority: number;
  
  /** Task prompt/description */
  prompt: string;
  
  /** When task was queued */
  queuedAt: string;
  
  /** When task started running (if started) */
  startedAt: string | null;
  
  /** When task completed (if completed) */
  completedAt: string | null;
  
  /** Current iteration (if running) */
  iteration: number;
  
  /** Max iterations allowed */
  maxIterations: number;
  
  /** Result summary (if completed/failed) */
  result?: {
    success: boolean;
    iterations: number;
    duration: number;
    summary: string;
    error?: string;
  };
}

/**
 * Current execution state
 */
export interface ExecutionCurrent {
  /** ID of currently running task (null if none) */
  taskId: string | null;
  
  /** Current iteration number */
  iteration: number;
  
  /** When current task started */
  startedAt: string | null;
  
  /** Is queue paused? */
  isPaused: boolean;
}

/**
 * The execution.json file format
 * Lives at: {project}/.forge/execution.json
 */
export interface ExecutionFile {
  /** Schema version */
  version: "1.0";
  
  /** Project ID from Control Center */
  projectId: string;
  
  /** Control Center URL */
  controlUrl: string;
  
  /** Ordered task queue */
  queue: ExecutionTask[];
  
  /** Current execution state */
  current: ExecutionCurrent;
  
  /** Last time this file was updated */
  lastUpdated: string;
  
  /** Who last updated (plugin or server) */
  lastUpdatedBy: "plugin" | "server";
}

/**
 * Default empty execution file
 */
export const DEFAULT_EXECUTION: ExecutionFile = {
  version: "1.0",
  projectId: "",
  controlUrl: "",
  queue: [],
  current: {
    taskId: null,
    iteration: 0,
    startedAt: null,
    isPaused: false,
  },
  lastUpdated: new Date().toISOString(),
  lastUpdatedBy: "server",
};

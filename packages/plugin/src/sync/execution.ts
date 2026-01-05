/**
 * Execution File Manager
 * 
 * Manages the .forge/execution.json file which serves as the single source
 * of truth for task execution state between plugin and server.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { ExecutionFile, ExecutionTask, ExecutionTaskStatus } from "@claudeforge/forge-shared";
import { EXECUTION_FILE, FORGE_DIR } from "@claudeforge/forge-shared/constants";
import { DEFAULT_EXECUTION } from "@claudeforge/forge-shared";

/**
 * Load execution file, creating default if not exists
 */
export function loadExecution(): ExecutionFile {
  try {
    if (existsSync(EXECUTION_FILE)) {
      const content = readFileSync(EXECUTION_FILE, "utf-8");
      return JSON.parse(content) as ExecutionFile;
    }
  } catch (error) {
    console.error("[FORGE] Failed to load execution file:", error);
  }
  return { ...DEFAULT_EXECUTION };
}

/**
 * Save execution file
 */
export function saveExecution(execution: ExecutionFile): void {
  try {
    // Ensure directory exists
    if (!existsSync(FORGE_DIR)) {
      mkdirSync(FORGE_DIR, { recursive: true });
    }
    
    execution.lastUpdated = new Date().toISOString();
    execution.lastUpdatedBy = "plugin";
    
    writeFileSync(EXECUTION_FILE, JSON.stringify(execution, null, 2));
  } catch (error) {
    console.error("[FORGE] Failed to save execution file:", error);
  }
}

/**
 * Initialize execution file when starting a task
 */
export function initExecution(
  projectId: string,
  controlUrl: string,
  task: {
    id: string;
    name: string;
    prompt: string;
    maxIterations: number;
  }
): ExecutionFile {
  const execution = loadExecution();
  
  execution.projectId = projectId;
  execution.controlUrl = controlUrl;
  
  // Find or create task in queue
  let taskEntry = execution.queue.find(t => t.id === task.id);
  
  if (!taskEntry) {
    // Task not in queue yet (claimed from server)
    taskEntry = {
      id: task.id,
      name: task.name,
      status: "running",
      priority: execution.queue.length,
      prompt: task.prompt,
      queuedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      iteration: 1,
      maxIterations: task.maxIterations,
    };
    execution.queue.push(taskEntry);
  } else {
    // Update existing task
    taskEntry.status = "running";
    taskEntry.startedAt = new Date().toISOString();
    taskEntry.iteration = 1;
  }
  
  // Update current
  execution.current = {
    taskId: task.id,
    iteration: 1,
    startedAt: new Date().toISOString(),
    isPaused: false,
  };
  
  saveExecution(execution);
  return execution;
}

/**
 * Update task status in execution file
 */
export function updateTaskStatus(
  taskId: string,
  status: ExecutionTaskStatus,
  result?: ExecutionTask["result"]
): void {
  const execution = loadExecution();
  const task = execution.queue.find(t => t.id === taskId);
  
  if (!task) {
    console.error(`[FORGE] Task ${taskId} not found in execution queue`);
    return;
  }
  
  task.status = status;
  
  if (status === "completed" || status === "failed" || status === "aborted") {
    task.completedAt = new Date().toISOString();
    task.result = result;
    
    // Clear current if this was the running task
    if (execution.current.taskId === taskId) {
      execution.current = {
        taskId: null,
        iteration: 0,
        startedAt: null,
        isPaused: false,
      };
    }
  }
  
  saveExecution(execution);
}

/**
 * Update iteration count for current task
 */
export function updateIteration(taskId: string, iteration: number): void {
  const execution = loadExecution();
  const task = execution.queue.find(t => t.id === taskId);
  
  if (task) {
    task.iteration = iteration;
  }
  
  if (execution.current.taskId === taskId) {
    execution.current.iteration = iteration;
  }
  
  saveExecution(execution);
}

/**
 * Get next queued task from execution file
 */
export function getNextQueuedTask(): ExecutionTask | null {
  const execution = loadExecution();
  
  // Find first queued task by priority
  const queued = execution.queue
    .filter(t => t.status === "queued")
    .sort((a, b) => a.priority - b.priority);
  
  return queued[0] ?? null;
}

/**
 * Set queue paused state
 */
export function setQueuePaused(isPaused: boolean): void {
  const execution = loadExecution();
  execution.current.isPaused = isPaused;
  saveExecution(execution);
}

/**
 * Sync queue from server (called when server sends updated queue)
 */
export function syncQueueFromServer(
  queue: Array<{
    id: string;
    name: string;
    prompt: string;
    priority: number;
    status: string;
    maxIterations: number;
  }>
): void {
  const execution = loadExecution();
  
  // Merge server queue with local state
  const newQueue: ExecutionTask[] = queue.map((serverTask) => {
    const existing = execution.queue.find(t => t.id === serverTask.id);
    
    if (existing) {
      // Keep local state for running/completed tasks
      if (existing.status === "running" || existing.status === "completed" || existing.status === "failed") {
        return { ...existing, priority: serverTask.priority };
      }
    }
    
    // New or queued task from server
    return {
      id: serverTask.id,
      name: serverTask.name,
      status: serverTask.status as ExecutionTaskStatus,
      priority: serverTask.priority,
      prompt: serverTask.prompt,
      queuedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      iteration: 0,
      maxIterations: serverTask.maxIterations,
    };
  });
  
  execution.queue = newQueue;
  saveExecution(execution);
}

/**
 * Get execution summary for display
 */
export function getExecutionSummary(): {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  currentTask: string | null;
} {
  const execution = loadExecution();
  
  return {
    total: execution.queue.length,
    queued: execution.queue.filter(t => t.status === "queued").length,
    running: execution.queue.filter(t => t.status === "running").length,
    completed: execution.queue.filter(t => t.status === "completed").length,
    failed: execution.queue.filter(t => t.status === "failed").length,
    currentTask: execution.current.taskId,
  };
}

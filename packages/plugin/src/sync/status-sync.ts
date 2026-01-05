/**
 * Task Status Sync
 *
 * CRITICAL: This module ensures task status updates are NEVER lost.
 * If Control Center is unreachable, updates are queued and retried.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { ForgeState, CriterionResult } from "@claudeforge/forge-shared";

// ============================================
// TYPES
// ============================================

export type TaskStatusUpdate = {
  taskId: string;
  projectId: string;
  status: "running" | "completed" | "failed" | "paused" | "stuck" | "aborted";
  timestamp: string;
  result?: {
    success: boolean;
    iterations: number;
    duration: number;
    tokens: number;
    filesCreated: string[];
    filesModified: string[];
    summary: string;
    error?: string;
    criteriaResults?: Array<{ id: string; name: string; passed: boolean }>;
  };
};

interface PendingSyncQueue {
  updates: Array<{
    update: TaskStatusUpdate;
    controlUrl: string;
    attempts: number;
    lastAttempt: string;
  }>;
}

// ============================================
// CONSTANTS
// ============================================

const FORGE_DIR = ".forge";
const PENDING_SYNC_FILE = join(FORGE_DIR, "pending-sync.json");
const MAX_RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 1000;

// ============================================
// QUEUE MANAGEMENT
// ============================================

/**
 * Load pending sync queue
 */
function loadPendingQueue(): PendingSyncQueue {
  try {
    if (existsSync(PENDING_SYNC_FILE)) {
      return JSON.parse(readFileSync(PENDING_SYNC_FILE, "utf-8"));
    }
  } catch {
    // Corrupted file, start fresh
  }
  return { updates: [] };
}

/**
 * Save pending sync queue
 */
function savePendingQueue(queue: PendingSyncQueue): void {
  const dir = dirname(PENDING_SYNC_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(PENDING_SYNC_FILE, JSON.stringify(queue, null, 2));
}

/**
 * Add update to pending queue
 */
function queueUpdate(update: TaskStatusUpdate, controlUrl: string): void {
  const queue = loadPendingQueue();

  // Check if this task already has a pending update - replace it
  const existingIndex = queue.updates.findIndex(
    (u) => u.update.taskId === update.taskId
  );

  if (existingIndex >= 0) {
    queue.updates[existingIndex] = {
      update,
      controlUrl,
      attempts: 0,
      lastAttempt: new Date().toISOString(),
    };
  } else {
    queue.updates.push({
      update,
      controlUrl,
      attempts: 0,
      lastAttempt: new Date().toISOString(),
    });
  }

  savePendingQueue(queue);
}

/**
 * Remove update from queue after successful sync
 */
function removeFromQueue(taskId: string): void {
  const queue = loadPendingQueue();
  queue.updates = queue.updates.filter((u) => u.update.taskId !== taskId);
  savePendingQueue(queue);
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Send status update to Control Center
 * Returns true if successful
 */
async function sendStatusUpdate(
  controlUrl: string,
  update: TaskStatusUpdate
): Promise<boolean> {
  try {
    const response = await fetch(
      `${controlUrl}/api/projects/${update.projectId}/task-defs/${update.taskId}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: update.status,
          result: update.result,
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      console.error(
        `[FORGE] Status sync failed: ${response.status} ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[FORGE] Status sync error:", error);
    return false;
  }
}

/**
 * Sync task status with retry logic
 * GUARANTEED: If sync fails, update is queued for later retry
 */
export async function syncTaskStatus(
  state: ForgeState,
  status: TaskStatusUpdate["status"],
  result?: TaskStatusUpdate["result"]
): Promise<boolean> {
  const config = state.controlCenter;

  // Skip if not enabled
  if (!config.enabled || !config.url || !config.projectId) {
    return true; // No sync needed
  }

  const update: TaskStatusUpdate = {
    taskId: state.task.id,
    projectId: config.projectId,
    status,
    timestamp: new Date().toISOString(),
    result,
  };

  // Try to send immediately with retries
  for (let attempt = 1; attempt <= 3; attempt++) {
    const success = await sendStatusUpdate(config.url, update);
    if (success) {
      // Also remove any pending updates for this task
      removeFromQueue(update.taskId);
      console.error(`[FORGE] Status synced: ${status}`);
      return true;
    }

    // Wait before retry
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }

  // Failed after retries - queue for later
  console.error(`[FORGE] Status sync failed after 3 attempts, queuing for retry`);
  queueUpdate(update, config.url);
  return false;
}

/**
 * Helper to sync completed/failed task with full result
 */
export async function syncTaskComplete(
  state: ForgeState,
  criteriaResults: CriterionResult[]
): Promise<boolean> {
  return syncTaskStatus(state, state.task.status as TaskStatusUpdate["status"], {
    success: state.task.status === "completed",
    iterations: state.iteration.current,
    duration: state.metrics.totalDuration,
    tokens: state.metrics.totalTokens,
    filesCreated: state.metrics.filesCreated,
    filesModified: state.metrics.filesModified,
    summary: `Task ${state.task.status} after ${state.iteration.current} iterations`,
    criteriaResults: criteriaResults.map((r) => ({
      id: r.criterion.id,
      name: r.criterion.name,
      passed: r.passed,
    })),
  });
}

/**
 * Process pending sync queue
 * Call this on startup to retry failed syncs
 */
export async function processPendingSync(): Promise<{
  processed: number;
  failed: number;
}> {
  const queue = loadPendingQueue();

  if (queue.updates.length === 0) {
    return { processed: 0, failed: 0 };
  }

  console.error(`[FORGE] Processing ${queue.updates.length} pending status syncs...`);

  let processed = 0;
  let failed = 0;

  for (const item of queue.updates) {
    // Skip if too many attempts
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      console.error(
        `[FORGE] Giving up on task ${item.update.taskId} after ${item.attempts} attempts`
      );
      failed++;
      continue;
    }

    const success = await sendStatusUpdate(item.controlUrl, item.update);

    if (success) {
      removeFromQueue(item.update.taskId);
      processed++;
    } else {
      // Update attempt count
      item.attempts++;
      item.lastAttempt = new Date().toISOString();
      savePendingQueue(queue);
      failed++;
    }
  }

  // Clean up updates that exceeded max attempts
  const updatedQueue = loadPendingQueue();
  updatedQueue.updates = updatedQueue.updates.filter(
    (u) => u.attempts < MAX_RETRY_ATTEMPTS
  );
  savePendingQueue(updatedQueue);

  return { processed, failed };
}


/**
 * Complete the database task (the one claimed from queue)
 * This is separate from syncTaskComplete which handles task-defs
 */
export async function completeQueueTask(
  state: ForgeState,
  criteriaResults: CriterionResult[]
): Promise<boolean> {
  const config = state.controlCenter;

  // Skip if not enabled or no task ID
  if (!config.enabled || !config.url || !config.taskId) {
    return true;
  }

  try {
    const response = await fetch(
      `${config.url}/api/tasks/${config.taskId}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: state.task.status,
          result: {
            success: state.task.status === "completed",
            iterations: state.iteration.current,
            duration: state.metrics.totalDuration,
            tokens: state.metrics.totalTokens,
            filesCreated: state.metrics.filesCreated,
            filesModified: state.metrics.filesModified,
            summary: `Task ${state.task.status} after ${state.iteration.current} iterations`,
            criteriaResults: criteriaResults.map((r) => ({
              id: r.criterion.id,
              name: r.criterion.name,
              passed: r.passed,
            })),
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.error(`[FORGE] Queue task complete failed: ${response.status}`);
      return false;
    }

    console.error("[FORGE] Queue task marked as complete");
    return true;
  } catch (error) {
    console.error("[FORGE] Queue task complete error:", error);
    return false;
  }
}

/**
 * Get count of pending syncs
 */
export function getPendingSyncCount(): number {
  const queue = loadPendingQueue();
  return queue.updates.length;
}

/**
 * Check if a specific task has pending sync
 */
export function hasPendingSync(taskId: string): boolean {
  const queue = loadPendingQueue();
  return queue.updates.some((u) => u.update.taskId === taskId);
}

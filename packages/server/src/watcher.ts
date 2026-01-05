/**
 * Project File Watcher
 * 
 * Watches .forge/execution.json files in registered projects
 * and broadcasts changes to WebUI via WebSocket.
 */

import { watch, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FSWatcher } from "node:fs";
import { db } from "./db/index.js";
import { projects } from "./db/schema.js";
import { broadcast } from "./broadcast.js";

// Store active watchers
const watchers = new Map<string, FSWatcher>();

// Debounce map to prevent rapid-fire updates
const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Read and parse execution.json from a project
 */
function readExecutionFile(projectPath: string): any | null {
  const executionPath = join(projectPath, ".forge", "execution.json");

  if (!existsSync(executionPath)) {
    return null;
  }

  try {
    const content = readFileSync(executionPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`[Watcher] Failed to read execution.json for ${projectPath}:`, error);
    return null;
  }
}

/**
 * Read and parse forge-state.json for detailed execution info
 */
function readForgeState(projectPath: string): any | null {
  const statePath = join(projectPath, ".claude", "forge-state.json");

  if (!existsSync(statePath)) {
    return null;
  }

  try {
    const content = readFileSync(statePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`[Watcher] Failed to read forge-state.json for ${projectPath}:`, error);
    return null;
  }
}

/**
 * Build comprehensive execution update from both files
 */
function buildExecutionUpdate(projectId: string, projectPath: string): any | null {
  const execution = readExecutionFile(projectPath);
  const forgeState = readForgeState(projectPath);

  if (!execution && !forgeState) {
    return null;
  }

  // Base data from execution file
  const currentTask = execution?.queue?.find((t: any) => t.status === "running");

  const update: any = {
    projectId,
    status: forgeState?.task?.status ?? (currentTask ? "running" : "idle"),
    taskId: forgeState?.task?.id ?? currentTask?.id,
    taskName: forgeState?.task?.name ?? currentTask?.name,
    iteration: forgeState?.iteration?.current ?? currentTask?.iteration,
    maxIterations: forgeState?.iteration?.max ?? currentTask?.maxIterations,
  };

  // Add criteria status from forge-state (most recent results)
  if (forgeState?.iteration?.history?.length > 0) {
    const lastIteration = forgeState.iteration.history[forgeState.iteration.history.length - 1];
    if (lastIteration?.criteriaResults) {
      update.criteria = lastIteration.criteriaResults.map((cr: any) => ({
        name: cr.criterion?.name ?? "Unknown",
        type: cr.criterion?.type ?? "unknown",
        passed: cr.passed,
        required: cr.criterion?.required ?? false,
      }));
    }
  }

  // Add stuck detection info
  if (forgeState?.task?.status === "stuck") {
    const lastIteration = forgeState?.iteration?.history?.[forgeState.iteration.history.length - 1];
    update.stuckDetection = {
      isStuck: true,
      pattern: lastIteration?.outcome === "stuck" ? "Detected from iteration" : "Task marked as stuck",
      suggestion: `Recovery strategy: ${forgeState.stuckDetection?.strategy ?? "retry-variation"}`,
    };
  }

  // Add error info
  if (forgeState?.iteration?.history?.length > 0) {
    const lastIteration = forgeState.iteration.history[forgeState.iteration.history.length - 1];
    if (lastIteration?.error) {
      update.error = lastIteration.error;
    }
  }

  // Add metrics from forge-state
  if (forgeState?.metrics) {
    update.metrics = {
      totalTokens: forgeState.metrics.totalTokens ?? 0,
      totalDuration: forgeState.metrics.totalDuration ?? 0,
      filesCreated: forgeState.metrics.filesCreated ?? [],
      filesModified: forgeState.metrics.filesModified ?? [],
    };
  }

  return update;
}

/**
 * Handle execution file change
 */
function handleExecutionChange(projectId: string, projectPath: string): void {
  // Clear existing debounce timer
  const existingTimer = debounceTimers.get(projectId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Debounce to prevent multiple rapid updates
  const timer = setTimeout(() => {
    debounceTimers.delete(projectId);

    // Build comprehensive update from both execution.json and forge-state.json
    const executionUpdate = buildExecutionUpdate(projectId, projectPath);
    if (!executionUpdate) return;

    console.log(`[Watcher] Execution change detected for project ${projectId}`);

    // Broadcast execution update to WebUI with full state info
    broadcast({
      type: "execution:update",
      projectId,
      execution: executionUpdate,
    });

    // Also broadcast queue update for UI refresh
    broadcast({
      type: "queue:update",
    });
  }, 100); // 100ms debounce

  debounceTimers.set(projectId, timer);
}

// Store additional watchers for .claude directory
const claudeWatchers = new Map<string, FSWatcher>();

/**
 * Start watching a project's execution file
 */
export function watchProject(projectId: string, projectPath: string): void {
  // Don't watch if already watching
  if (watchers.has(projectId)) {
    return;
  }

  const forgeDir = join(projectPath, ".forge");
  const claudeDir = join(projectPath, ".claude");

  // Check if .forge directory exists
  if (!existsSync(forgeDir)) {
    console.log(`[Watcher] No .forge directory for project ${projectId}, skipping watch`);
    return;
  }

  try {
    // Watch the .forge directory for execution.json changes
    const forgeWatcher = watch(forgeDir, { recursive: false }, (_eventType, filename) => {
      if (filename === "execution.json") {
        handleExecutionChange(projectId, projectPath);
      }
    });

    watchers.set(projectId, forgeWatcher);

    // Also watch .claude directory for forge-state.json changes
    if (existsSync(claudeDir)) {
      try {
        const claudeWatcher = watch(claudeDir, { recursive: false }, (_eventType, filename) => {
          if (filename === "forge-state.json") {
            handleExecutionChange(projectId, projectPath);
          }
        });
        claudeWatchers.set(projectId, claudeWatcher);
      } catch {
        // .claude directory may not exist yet
      }
    }

    console.log(`[Watcher] Started watching project ${projectId} at ${projectPath}`);

    // Initial read and broadcast
    handleExecutionChange(projectId, projectPath);
  } catch (error) {
    console.error(`[Watcher] Failed to watch project ${projectId}:`, error);
  }
}

/**
 * Stop watching a project
 */
export function unwatchProject(projectId: string): void {
  const watcher = watchers.get(projectId);
  if (watcher) {
    watcher.close();
    watchers.delete(projectId);
  }

  const claudeWatcher = claudeWatchers.get(projectId);
  if (claudeWatcher) {
    claudeWatcher.close();
    claudeWatchers.delete(projectId);
  }

  const timer = debounceTimers.get(projectId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(projectId);
  }

  console.log(`[Watcher] Stopped watching project ${projectId}`);
}

/**
 * Start watching all registered projects
 */
export function startWatchingAllProjects(): void {
  console.log("[Watcher] Starting project file watchers...");
  
  const allProjects = db.select().from(projects).all();
  
  for (const project of allProjects) {
    watchProject(project.id, project.path);
  }
  
  console.log(`[Watcher] Watching ${watchers.size} projects`);
}

/**
 * Stop all watchers
 */
export function stopAllWatchers(): void {
  console.log("[Watcher] Stopping all watchers...");

  for (const [projectId, watcher] of watchers) {
    watcher.close();
    console.log(`[Watcher] Stopped watching ${projectId}`);
  }
  watchers.clear();

  for (const watcher of claudeWatchers.values()) {
    watcher.close();
  }
  claudeWatchers.clear();

  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}

/**
 * Get watcher status
 */
export function getWatcherStatus(): { projectId: string; path: string }[] {
  return Array.from(watchers.entries()).map(([projectId]) => {
    // Get project info from watchers map
    const allProjects = db.select().from(projects).all();
    const project = allProjects.find((p: any) => p.id === projectId);
    return {
      projectId,
      path: project?.path ?? "unknown",
    };
  });
}

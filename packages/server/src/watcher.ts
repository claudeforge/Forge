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
    
    const execution = readExecutionFile(projectPath);
    if (!execution) return;
    
    console.log(`[Watcher] Execution change detected for project ${projectId}`);
    
    // Broadcast execution update to WebUI
    broadcast({
      type: "execution:update",
      projectId,
      execution,
    });
    
    // Also broadcast queue update for UI refresh
    broadcast({
      type: "queue:update",
    });
  }, 100); // 100ms debounce
  
  debounceTimers.set(projectId, timer);
}

/**
 * Start watching a project's execution file
 */
export function watchProject(projectId: string, projectPath: string): void {
  // Don't watch if already watching
  if (watchers.has(projectId)) {
    return;
  }
  
  const forgeDir = join(projectPath, ".forge");
  
  // Check if .forge directory exists
  if (!existsSync(forgeDir)) {
    console.log(`[Watcher] No .forge directory for project ${projectId}, skipping watch`);
    return;
  }
  
  try {
    // Watch the .forge directory for changes
    const watcher = watch(forgeDir, { recursive: false }, (_eventType, filename) => {
      if (filename === "execution.json" || filename === "state.json") {
        handleExecutionChange(projectId, projectPath);
      }
    });
    
    watchers.set(projectId, watcher);
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
    console.log(`[Watcher] Stopped watching project ${projectId}`);
  }
  
  const timer = debounceTimers.get(projectId);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(projectId);
  }
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

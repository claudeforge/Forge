#!/usr/bin/env node
/**
 * FORGE Sync CLI
 * Synchronizes local project state with Control Center
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ForgeState, TaskFile } from "@claudeforge/forge-shared";
import { STATE_FILE, FORGE_DIR } from "@claudeforge/forge-shared/constants";

interface ForgeConfig {
  projectId?: string;
  controlUrl?: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

function loadConfig(): ForgeConfig {
  const configPath = join(process.cwd(), ".forge.json");
  if (!existsSync(configPath)) return {};

  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function loadState(): ForgeState | null {
  try {
    if (existsSync(STATE_FILE)) {
      const content = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
    // Corrupted state
  }
  return null;
}

function loadPendingSync(): { updates: Array<{ update: { taskId: string; status: string }; attempts: number }> } {
  const pendingSyncFile = join(FORGE_DIR, "pending-sync.json");
  try {
    if (existsSync(pendingSyncFile)) {
      return JSON.parse(readFileSync(pendingSyncFile, "utf-8"));
    }
  } catch {
    // Corrupted file
  }
  return { updates: [] };
}

function loadLocalTasks(): TaskFile[] {
  const tasksDir = join(FORGE_DIR, "tasks");
  if (!existsSync(tasksDir)) return [];

  const tasks: TaskFile[] = [];
  try {
    const dirs = readdirSync(tasksDir, { withFileTypes: true });
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const taskPath = join(tasksDir, dir.name, "task.json");
        if (existsSync(taskPath)) {
          try {
            const content = readFileSync(taskPath, "utf-8");
            tasks.push(JSON.parse(content));
          } catch {
            // Skip corrupted task files
          }
        }
      }
    }
  } catch {
    // Error reading tasks directory
  }
  return tasks;
}

async function syncCurrentState(controlUrl: string, projectId: string): Promise<SyncResult> {
  const state = loadState();

  if (!state) {
    return { success: true, message: "No active state to sync" };
  }

  try {
    // Sync current task status
    const response = await fetch(
      `${controlUrl}/api/projects/${projectId}/sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: state.task.id,
          status: state.task.status,
          iteration: state.iteration.current,
          metrics: state.metrics,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (response.ok) {
      return {
        success: true,
        message: `Synced task ${state.task.id} (${state.task.status})`,
        details: { taskId: state.task.id, status: state.task.status }
      };
    } else {
      return {
        success: false,
        message: `Failed to sync: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Sync error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function syncLocalTasks(controlUrl: string, projectId: string): Promise<SyncResult> {
  const tasks = loadLocalTasks();

  if (tasks.length === 0) {
    return { success: true, message: "No local tasks to sync" };
  }

  let synced = 0;
  let failed = 0;

  for (const task of tasks) {
    try {
      const response = await fetch(
        `${controlUrl}/api/tasks/${task.id}/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            name: task.name,
            status: task.status,
            startedAt: task.startedAt,
            endedAt: task.endedAt,
          }),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return {
    success: failed === 0,
    message: `Synced ${synced}/${tasks.length} tasks${failed > 0 ? ` (${failed} failed)` : ""}`,
    details: { total: tasks.length, synced, failed }
  };
}

async function processPendingUpdates(controlUrl: string): Promise<SyncResult> {
  const pending = loadPendingSync();

  if (pending.updates.length === 0) {
    return { success: true, message: "No pending updates" };
  }

  let processed = 0;
  let failed = 0;

  for (const item of pending.updates) {
    try {
      const response = await fetch(
        `${controlUrl}/api/projects/${item.update.taskId}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.update),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        processed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return {
    success: failed === 0,
    message: `Processed ${processed}/${pending.updates.length} pending updates${failed > 0 ? ` (${failed} failed)` : ""}`,
    details: { total: pending.updates.length, processed, failed }
  };
}

async function refreshFromServer(controlUrl: string, projectId: string): Promise<SyncResult> {
  try {
    // Get project status from server
    const response = await fetch(
      `${controlUrl}/api/projects/${projectId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        message: `Failed to fetch project: ${response.status}`
      };
    }

    const project = await response.json();

    // Get queue status
    const queueResponse = await fetch(
      `${controlUrl}/api/queue?projectId=${projectId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    let queueInfo: { running?: { name?: string }; queued?: unknown[] } | null = null;
    if (queueResponse.ok) {
      queueInfo = await queueResponse.json() as { running?: { name?: string }; queued?: unknown[] };
    }

    const projectData = project as { name?: string };

    return {
      success: true,
      message: "Fetched latest state from server",
      details: {
        project: projectData.name ?? "unknown",
        running: queueInfo?.running?.name ?? null,
        queued: queueInfo?.queued?.length ?? 0,
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Server fetch error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = loadConfig();

  const controlUrl = args.find(a => a.startsWith("--control="))?.split("=")[1] ?? config.controlUrl;
  const projectId = args.find(a => a.startsWith("--project="))?.split("=")[1] ?? config.projectId;
  const mode = args.find(a => !a.startsWith("--")) ?? "full";

  if (!controlUrl) {
    console.log(`
FORGE Sync - Synchronize project state with Control Center

Usage: forge-sync [mode] [options]

Modes:
  full      Full sync (default) - sync all data bidirectionally
  push      Push local state to server
  pull      Pull latest state from server
  pending   Process only pending sync queue

Options:
  --control=URL    Control Center URL
  --project=ID     Project ID

Note: Configure .forge.json with controlUrl and projectId for automatic detection.
`);
    process.exit(0);
  }

  if (!projectId) {
    console.error("[FORGE] Error: Project ID required. Use --project=ID or configure .forge.json");
    process.exit(1);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                     FORGE Sync                            ║
╠═══════════════════════════════════════════════════════════╣
║  Control Center: ${controlUrl.padEnd(38)} ║
║  Project ID:     ${projectId.padEnd(38)} ║
║  Mode:           ${mode.padEnd(38)} ║
╚═══════════════════════════════════════════════════════════╝
`);

  const results: SyncResult[] = [];

  // Check connection first
  try {
    const healthCheck = await fetch(`${controlUrl}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!healthCheck.ok) {
      console.error("[FORGE] Control Center is not responding");
      process.exit(1);
    }
    console.log("[FORGE] Connected to Control Center\n");
  } catch {
    console.error("[FORGE] Cannot connect to Control Center at " + controlUrl);
    process.exit(1);
  }

  // Execute based on mode
  if (mode === "full" || mode === "push") {
    console.log("[FORGE] Syncing current state...");
    const stateResult = await syncCurrentState(controlUrl, projectId);
    results.push(stateResult);
    console.log(`  ${stateResult.success ? "✓" : "✗"} ${stateResult.message}`);

    console.log("[FORGE] Syncing local tasks...");
    const tasksResult = await syncLocalTasks(controlUrl, projectId);
    results.push(tasksResult);
    console.log(`  ${tasksResult.success ? "✓" : "✗"} ${tasksResult.message}`);

    console.log("[FORGE] Processing pending updates...");
    const pendingResult = await processPendingUpdates(controlUrl);
    results.push(pendingResult);
    console.log(`  ${pendingResult.success ? "✓" : "✗"} ${pendingResult.message}`);
  }

  if (mode === "full" || mode === "pull") {
    console.log("[FORGE] Refreshing from server...");
    const refreshResult = await refreshFromServer(controlUrl, projectId);
    results.push(refreshResult);
    console.log(`  ${refreshResult.success ? "✓" : "✗"} ${refreshResult.message}`);

    if (refreshResult.details) {
      const d = refreshResult.details;
      console.log(`    Project: ${d.project}`);
      console.log(`    Running: ${d.running ?? "none"}`);
      console.log(`    Queued:  ${d.queued} tasks`);
    }
  }

  if (mode === "pending") {
    console.log("[FORGE] Processing pending updates...");
    const pendingResult = await processPendingUpdates(controlUrl);
    results.push(pendingResult);
    console.log(`  ${pendingResult.success ? "✓" : "✗"} ${pendingResult.message}`);
  }

  // Summary
  const allSuccess = results.every(r => r.success);
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Sync ${allSuccess ? "Complete ✓" : "Finished with errors ✗"}                                    ║
╚═══════════════════════════════════════════════════════════╝
`);

  process.exit(allSuccess ? 0 : 1);
}

main().catch((error) => {
  console.error("[FORGE] Sync failed:", error);
  process.exit(1);
});

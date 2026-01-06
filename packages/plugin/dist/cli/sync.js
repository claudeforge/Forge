#!/usr/bin/env node
import {
  FORGE_DIR,
  STATE_FILE
} from "../chunk-FJGGFLPX.js";

// src/cli/sync.ts
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
function loadConfig() {
  const configPath = join(process.cwd(), ".forge.json");
  if (!existsSync(configPath)) return {};
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const content = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
  }
  return null;
}
function loadPendingSync() {
  const pendingSyncFile = join(FORGE_DIR, "pending-sync.json");
  try {
    if (existsSync(pendingSyncFile)) {
      return JSON.parse(readFileSync(pendingSyncFile, "utf-8"));
    }
  } catch {
  }
  return { updates: [] };
}
function loadLocalTasks() {
  const tasksDir = join(FORGE_DIR, "tasks");
  if (!existsSync(tasksDir)) return [];
  const tasks = [];
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
          }
        }
      }
    }
  } catch {
  }
  return tasks;
}
async function syncCurrentState(controlUrl, projectId) {
  const state = loadState();
  if (!state) {
    return { success: true, message: "No active state to sync" };
  }
  try {
    const response = await fetch(
      `${controlUrl}/api/projects/${projectId}/sync`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: state.task.id,
          status: state.task.status,
          iteration: state.iteration.current,
          metrics: state.metrics
        }),
        signal: AbortSignal.timeout(1e4)
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
async function syncLocalTasks(controlUrl, projectId) {
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
            endedAt: task.endedAt
          }),
          signal: AbortSignal.timeout(5e3)
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
async function processPendingUpdates(controlUrl) {
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
          signal: AbortSignal.timeout(5e3)
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
async function refreshFromServer(controlUrl, projectId) {
  try {
    const response = await fetch(
      `${controlUrl}/api/projects/${projectId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(1e4)
      }
    );
    if (!response.ok) {
      return {
        success: false,
        message: `Failed to fetch project: ${response.status}`
      };
    }
    const project = await response.json();
    const queueResponse = await fetch(
      `${controlUrl}/api/queue?projectId=${projectId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(1e4)
      }
    );
    let queueInfo = null;
    if (queueResponse.ok) {
      queueInfo = await queueResponse.json();
    }
    const projectData = project;
    return {
      success: true,
      message: "Fetched latest state from server",
      details: {
        project: projectData.name ?? "unknown",
        running: queueInfo?.running?.name ?? null,
        queued: queueInfo?.queued?.length ?? 0
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Server fetch error: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}
async function main() {
  const args = process.argv.slice(2);
  const config = loadConfig();
  const controlUrl = args.find((a) => a.startsWith("--control="))?.split("=")[1] ?? config.controlUrl;
  const projectId = args.find((a) => a.startsWith("--project="))?.split("=")[1] ?? config.projectId;
  const mode = args.find((a) => !a.startsWith("--")) ?? "full";
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
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                     FORGE Sync                            \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551  Control Center: ${controlUrl.padEnd(38)} \u2551
\u2551  Project ID:     ${projectId.padEnd(38)} \u2551
\u2551  Mode:           ${mode.padEnd(38)} \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  const results = [];
  try {
    const healthCheck = await fetch(`${controlUrl}/health`, {
      signal: AbortSignal.timeout(5e3)
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
  if (mode === "full" || mode === "push") {
    console.log("[FORGE] Syncing current state...");
    const stateResult = await syncCurrentState(controlUrl, projectId);
    results.push(stateResult);
    console.log(`  ${stateResult.success ? "\u2713" : "\u2717"} ${stateResult.message}`);
    console.log("[FORGE] Syncing local tasks...");
    const tasksResult = await syncLocalTasks(controlUrl, projectId);
    results.push(tasksResult);
    console.log(`  ${tasksResult.success ? "\u2713" : "\u2717"} ${tasksResult.message}`);
    console.log("[FORGE] Processing pending updates...");
    const pendingResult = await processPendingUpdates(controlUrl);
    results.push(pendingResult);
    console.log(`  ${pendingResult.success ? "\u2713" : "\u2717"} ${pendingResult.message}`);
  }
  if (mode === "full" || mode === "pull") {
    console.log("[FORGE] Refreshing from server...");
    const refreshResult = await refreshFromServer(controlUrl, projectId);
    results.push(refreshResult);
    console.log(`  ${refreshResult.success ? "\u2713" : "\u2717"} ${refreshResult.message}`);
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
    console.log(`  ${pendingResult.success ? "\u2713" : "\u2717"} ${pendingResult.message}`);
  }
  const allSuccess = results.every((r) => r.success);
  console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  Sync ${allSuccess ? "Complete \u2713" : "Finished with errors \u2717"}                                    \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  process.exit(allSuccess ? 0 : 1);
}
main().catch((error) => {
  console.error("[FORGE] Sync failed:", error);
  process.exit(1);
});

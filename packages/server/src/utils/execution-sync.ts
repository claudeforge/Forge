/**
 * Execution File Sync Utility
 * 
 * Syncs queue order and task status from server to project's execution.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { db } from "../db/index.js";
import { projects, tasks } from "../db/schema.js";
import { eq, asc } from "drizzle-orm";

interface ExecutionTask {
  id: string;
  name: string;
  status: string;
  priority: number;
  prompt: string;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  iteration: number;
  maxIterations: number;
  result?: {
    success: boolean;
    iterations: number;
    duration: number;
    summary: string;
    error?: string;
  };
}

interface ExecutionFile {
  version: "1.0";
  projectId: string;
  controlUrl: string;
  queue: ExecutionTask[];
  current: {
    taskId: string | null;
    iteration: number;
    startedAt: string | null;
    isPaused: boolean;
  };
  lastUpdated: string;
  lastUpdatedBy: "plugin" | "server";
}

/**
 * Sync queue to a project's execution.json
 */
export async function syncQueueToProject(projectId: string): Promise<void> {
  // Get project path
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    console.error(`[ExecutionSync] Project ${projectId} not found`);
    return;
  }

  const forgeDir = join(project.path, ".forge");
  const executionPath = join(forgeDir, "execution.json");

  // Get all tasks for this project
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.priority));

  // Read existing execution file or create new
  let execution: ExecutionFile;
  
  if (existsSync(executionPath)) {
    try {
      execution = JSON.parse(readFileSync(executionPath, "utf-8"));
    } catch {
      execution = createDefaultExecution(projectId);
    }
  } else {
    execution = createDefaultExecution(projectId);
  }

  // Update queue from database
  execution.queue = projectTasks.map((task, index) => ({
    id: task.id,
    name: task.name,
    status: task.status,
    priority: task.priority ?? index,
    prompt: task.prompt,
    queuedAt: task.createdAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    iteration: task.iteration ?? 0,
    maxIterations: (task.config as any)?.maxIterations ?? 30,
    result: task.result ? JSON.parse(task.result as string) : undefined,
  }));

  // Update current
  const runningTask = projectTasks.find(t => t.status === "running");
  execution.current = {
    taskId: runningTask?.id ?? null,
    iteration: runningTask?.iteration ?? 0,
    startedAt: runningTask?.startedAt ?? null,
    isPaused: false,
  };

  execution.lastUpdated = new Date().toISOString();
  execution.lastUpdatedBy = "server";

  // Write execution file
  try {
    if (!existsSync(forgeDir)) {
      mkdirSync(forgeDir, { recursive: true });
    }
    writeFileSync(executionPath, JSON.stringify(execution, null, 2));
    console.log(`[ExecutionSync] Synced queue to ${executionPath}`);
  } catch (error) {
    console.error(`[ExecutionSync] Failed to write execution.json:`, error);
  }
}

/**
 * Sync queue to all affected projects after a reorder
 */
export async function syncQueueAfterReorder(taskIds: string[]): Promise<void> {
  // Get unique project IDs from the tasks
  const projectIds = new Set<string>();

  for (const taskId of taskIds) {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (task) {
      projectIds.add(task.projectId);
    }
  }

  // Sync each affected project
  for (const projectId of projectIds) {
    await syncQueueToProject(projectId);
  }
}

function createDefaultExecution(projectId: string): ExecutionFile {
  return {
    version: "1.0",
    projectId,
    controlUrl: "http://localhost:3344",
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
}

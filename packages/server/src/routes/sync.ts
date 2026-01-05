/**
 * Sync API routes
 * Handles synchronization between plugin and Control Center
 */

import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { db, schema } from "../db/index.js";
import { broadcast } from "../broadcast.js";
import { generateId } from "@claudeforge/forge-shared/utils";
import { syncQueueToProject } from "../utils/execution-sync.js";

const app = new Hono();

// POST /api/sync/project/:projectId - Full project sync
app.post("/project/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  const body = await c.req.json();
  const { tasks: localTasks = [], currentTaskId, currentStatus } = body;

  const results = {
    updated: 0,
    fixed: 0,
    errors: [] as string[],
  };

  // 1. Fix stuck "running" tasks that are actually done
  const runningTasks = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.projectId, projectId),
        eq(schema.tasks.status, "running")
      )
    );

  for (const task of runningTasks) {
    // If this task is not the current running task, it's stuck
    if (task.id !== currentTaskId) {
      await db
        .update(schema.tasks)
        .set({
          status: "failed",
          completedAt: new Date().toISOString(),
          result: JSON.stringify({
            success: false,
            summary: "Task was stuck as running - auto-fixed by sync",
            error: "Process terminated unexpectedly"
          }),
        })
        .where(eq(schema.tasks.id, task.id));

      results.fixed++;

      broadcast({
        type: "task:update",
        task: { ...task, status: "failed" },
      });
    }
  }

  // 2. Update current task status if provided
  if (currentTaskId && currentStatus) {
    const [existingTask] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, currentTaskId));

    if (existingTask && existingTask.status !== currentStatus) {
      await db
        .update(schema.tasks)
        .set({
          status: currentStatus,
          ...(currentStatus === "completed" || currentStatus === "failed"
            ? { completedAt: new Date().toISOString() }
            : {}),
        })
        .where(eq(schema.tasks.id, currentTaskId));

      results.updated++;

      broadcast({
        type: "task:update",
        task: { ...existingTask, status: currentStatus },
      });
    }
  }

  // 3. Sync local task statuses
  for (const localTask of localTasks) {
    if (!localTask.id || !localTask.status) continue;

    const [existingTask] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, localTask.id));

    if (existingTask && existingTask.status !== localTask.status) {
      // Only update if local status is "more final"
      const statusOrder = ["queued", "running", "paused", "completed", "failed", "aborted"];
      const existingOrder = statusOrder.indexOf(existingTask.status);
      const localOrder = statusOrder.indexOf(localTask.status);

      if (localOrder > existingOrder) {
        await db
          .update(schema.tasks)
          .set({
            status: localTask.status,
            ...(localTask.status === "completed" || localTask.status === "failed"
              ? { completedAt: new Date().toISOString() }
              : {}),
            ...(localTask.result ? { result: JSON.stringify(localTask.result) } : {}),
          })
          .where(eq(schema.tasks.id, localTask.id));

        results.updated++;
      }
    }
  }

  // Broadcast queue update
  broadcast({ type: "queue:update" });

  return c.json({
    success: true,
    ...results,
    message: `Sync complete: ${results.updated} updated, ${results.fixed} fixed`,
  });
});

// POST /api/sync/fix-stuck - Fix all stuck tasks globally
app.post("/fix-stuck", async (c) => {
  const now = new Date().toISOString();

  // Find all tasks stuck as "running" for more than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const stuckTasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "running"));

  let fixed = 0;

  for (const task of stuckTasks) {
    // Check if task has been running for too long
    if (task.startedAt && task.startedAt < oneHourAgo) {
      await db
        .update(schema.tasks)
        .set({
          status: "failed",
          completedAt: now,
          result: JSON.stringify({
            success: false,
            summary: "Task timed out - marked as failed by fix-stuck",
            error: "Task exceeded maximum runtime (1 hour)",
          }),
        })
        .where(eq(schema.tasks.id, task.id));

      fixed++;

      broadcast({
        type: "task:update",
        task: { ...task, status: "failed" },
      });
    }
  }

  broadcast({ type: "queue:update" });

  return c.json({
    success: true,
    fixed,
    message: `Fixed ${fixed} stuck tasks`,
  });
});

// POST /api/sync/task/:taskId - Sync single task status
app.post("/task/:taskId", async (c) => {
  const taskId = c.req.param("taskId");
  const body = await c.req.json();
  const { status, result, iteration } = body;

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  const updates: Record<string, unknown> = {};

  if (status) updates.status = status;
  if (result) updates.result = JSON.stringify(result);
  if (iteration !== undefined) updates.iteration = iteration;

  if (status === "completed" || status === "failed" || status === "aborted") {
    updates.completedAt = new Date().toISOString();
  }

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.tasks)
      .set(updates)
      .where(eq(schema.tasks.id, taskId));
  }

  const [updated] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  broadcast({ type: "task:update", task: updated });
  broadcast({ type: "queue:update" });

  // Sync to project execution.json
  await syncQueueToProject(updated.projectId);

  return c.json({
    success: true,
    task: updated,
  });
});

// GET /api/sync/status/:projectId - Get sync status for project
app.get("/status/:projectId", async (c) => {
  const projectId = c.req.param("projectId");

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectId, projectId));

  const statusCounts: Record<string, number> = {};
  for (const task of tasks) {
    statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
  }

  const runningTasks = tasks.filter((t) => t.status === "running");
  const stuckTasks = runningTasks.filter((t) => {
    if (!t.startedAt) return false;
    const startedAt = new Date(t.startedAt).getTime();
    const now = Date.now();
    return now - startedAt > 60 * 60 * 1000; // More than 1 hour
  });

  return c.json({
    projectId,
    totalTasks: tasks.length,
    statusCounts,
    runningCount: runningTasks.length,
    stuckCount: stuckTasks.length,
    stuckTasks: stuckTasks.map((t) => ({
      id: t.id,
      name: t.name,
      startedAt: t.startedAt,
    })),
  });
});

// POST /api/sync/from-codebase/:projectId - Sync from project's .forge directory
app.post("/from-codebase/:projectId", async (c) => {
  const projectId = c.req.param("projectId");

  // Get project path
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId));

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const forgeDir = join(project.path, ".forge");
  if (!existsSync(forgeDir)) {
    return c.json({ error: "No .forge directory found in project" }, 404);
  }

  const results = {
    specs: { found: 0, synced: 0 },
    plans: { found: 0, synced: 0 },
    tasks: { found: 0, synced: 0 },
    errors: [] as string[],
  };

  // 1. Sync specs
  const specsDir = join(forgeDir, "specs");
  if (existsSync(specsDir)) {
    const specFiles = readdirSync(specsDir).filter((f) => f.endsWith(".json"));
    results.specs.found = specFiles.length;

    for (const file of specFiles) {
      try {
        const content = readFileSync(join(specsDir, file), "utf-8");
        const spec = JSON.parse(content);
        results.specs.synced++;
      } catch (error) {
        results.errors.push(`Failed to read spec ${file}: ${error}`);
      }
    }
  }

  // 2. Sync plans
  const plansDir = join(forgeDir, "plans");
  if (existsSync(plansDir)) {
    const planFiles = readdirSync(plansDir).filter((f) => f.endsWith(".json"));
    results.plans.found = planFiles.length;

    for (const file of planFiles) {
      try {
        const content = readFileSync(join(plansDir, file), "utf-8");
        const plan = JSON.parse(content);
        results.plans.synced++;
      } catch (error) {
        results.errors.push(`Failed to read plan ${file}: ${error}`);
      }
    }
  }

  // 3. Sync tasks from YAML files
  const tasksDir = join(forgeDir, "tasks");
  if (existsSync(tasksDir)) {
    const taskFiles = readdirSync(tasksDir).filter((f) => f.endsWith(".yaml"));
    results.tasks.found = taskFiles.length;

    for (const file of taskFiles) {
      try {
        const content = readFileSync(join(tasksDir, file), "utf-8");
        const taskDef = parseYaml(content) as Record<string, unknown>;

        // Check if task already exists in queue
        const existingTasks = await db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.projectId, projectId));

        const taskDefId = taskDef.id as string;
        const existingTask = existingTasks.find((t) => {
          try {
            const config = JSON.parse(t.config || "{}");
            return config.taskDefId === taskDefId;
          } catch {
            return false;
          }
        });

        if (existingTask) {
          // Update existing task status if codebase has more recent status
          const codebaseStatus = taskDef.status as string;
          if (codebaseStatus === "completed" && existingTask.status !== "completed") {
            await db
              .update(schema.tasks)
              .set({
                status: "completed",
                completedAt: (taskDef.completed_at as string) || new Date().toISOString(),
                iteration: (taskDef.iterations as number) || existingTask.iteration,
                result: taskDef.result ? JSON.stringify(taskDef.result) : existingTask.result,
              })
              .where(eq(schema.tasks.id, existingTask.id));
            results.tasks.synced++;
          }
        }
        // Note: We no longer auto-queue tasks. Use POST /api/sync/queue-task/:projectId to queue specific tasks.
        // Task definitions can be viewed via GET /api/projects/:projectId/task-defs

        results.tasks.found++;
      } catch (error) {
        results.errors.push(`Failed to read task ${file}: ${error}`);
      }
    }
  }

  // Update project last activity
  await db
    .update(schema.projects)
    .set({ lastActivityAt: new Date().toISOString() })
    .where(eq(schema.projects.id, projectId));

  broadcast({ type: "queue:update" });

  return c.json({
    success: true,
    ...results,
    message: `Synced from codebase: ${results.specs.synced} specs, ${results.plans.synced} plans, ${results.tasks.found} task definitions found (${results.tasks.synced} updated)`,
  });
});

// Helper function to build prompt from task definition
function buildPromptFromTaskDef(taskDef: Record<string, unknown>): string {
  const parts: string[] = [];

  parts.push(`# Task: ${taskDef.title || taskDef.id}`);
  parts.push("");

  if (taskDef.description) {
    parts.push(taskDef.description as string);
    parts.push("");
  }

  if (taskDef.goals && Array.isArray(taskDef.goals)) {
    parts.push("## Goals");
    for (const goal of taskDef.goals) {
      parts.push(`- ${goal}`);
    }
    parts.push("");
  }

  const technical = taskDef.technical as Record<string, unknown> | undefined;
  if (technical?.approach) {
    parts.push("## Approach");
    parts.push(technical.approach as string);
    parts.push("");
  }

  if (technical?.files_to_create && Array.isArray(technical.files_to_create)) {
    parts.push("## Files to Create");
    for (const file of technical.files_to_create) {
      parts.push(`- ${file}`);
    }
    parts.push("");
  }

  if (technical?.files_to_modify && Array.isArray(technical.files_to_modify)) {
    parts.push("## Files to Modify");
    for (const file of technical.files_to_modify) {
      parts.push(`- ${file}`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

// POST /api/sync/mark-done/:taskId - Mark task as done and sync to codebase
app.post("/mark-done/:taskId", async (c) => {
  const taskId = c.req.param("taskId");
  const body = await c.req.json().catch(() => ({}));
  const { summary = "Manually marked as completed" } = body;

  // Get task
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  // Get project
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, task.projectId));

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const now = new Date().toISOString();

  // Update task in database
  await db
    .update(schema.tasks)
    .set({
      status: "completed",
      completedAt: now,
      result: JSON.stringify({
        success: true,
        summary,
        iterations: task.iteration,
        duration: 0,
        tokens: 0,
        files_created: [],
        files_modified: [],
        manuallyCompleted: true,
      }),
    })
    .where(eq(schema.tasks.id, taskId));

  // Get updated task
  const [updatedTask] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  // Try to update codebase task definition
  let codebaseSynced = false;
  try {
    const config = JSON.parse(task.config || "{}");
    const taskDefId = config.taskDefId;

    if (taskDefId) {
      const taskDefPath = join(project.path, ".forge", "tasks", `${taskDefId}.yaml`);

      if (existsSync(taskDefPath)) {
        const content = readFileSync(taskDefPath, "utf-8");
        const taskDef = parseYaml(content) as Record<string, unknown>;

        // Update task definition
        taskDef.status = "completed";
        taskDef.completed_at = now;
        taskDef.iterations = task.iteration;
        taskDef.result = {
          success: true,
          summary,
          iterations: task.iteration,
          duration: 0,
          tokens: 0,
          files_created: [],
          files_modified: [],
          manually_completed: true,
        };

        writeFileSync(taskDefPath, stringifyYaml(taskDef));
        codebaseSynced = true;
      }
    }
  } catch (error) {
    console.error("[Sync] Failed to sync to codebase:", error);
  }

  broadcast({ type: "task:update", task: updatedTask });
  broadcast({ type: "queue:update" });

  // Sync to project execution.json
  await syncQueueToProject(task.projectId);

  return c.json({
    success: true,
    task: updatedTask,
    codebaseSynced,
    message: codebaseSynced
      ? "Task marked as done and synced to codebase"
      : "Task marked as done (codebase sync skipped - no task def found)",
  });
});

// POST /api/sync/queue-task/:projectId/:taskDefId - Queue a specific task definition
app.post("/queue-task/:projectId/:taskDefId", async (c) => {
  const projectId = c.req.param("projectId");
  const taskDefId = c.req.param("taskDefId");

  // Get project
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId));

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Read task definition from codebase
  const taskDefPath = join(project.path, ".forge", "tasks", `${taskDefId}.yaml`);
  if (!existsSync(taskDefPath)) {
    return c.json({ error: "Task definition not found" }, 404);
  }

  const content = readFileSync(taskDefPath, "utf-8");
  const taskDef = parseYaml(content) as Record<string, unknown>;

  // Check if already queued
  const existingTasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectId, projectId));

  const existingTask = existingTasks.find((t) => {
    try {
      const config = JSON.parse(t.config || "{}");
      return config.taskDefId === taskDefId;
    } catch {
      return false;
    }
  });

  if (existingTask) {
    return c.json({
      success: false,
      error: "Task already in queue",
      task: existingTask,
    }, 409);
  }

  // Create task in queue
  const newTask = {
    id: generateId(),
    projectId,
    name: (taskDef.title as string) || taskDefId,
    prompt: buildPromptFromTaskDef(taskDef),
    status: "queued",
    priority: (taskDef.priority as number) || 0,
    dependsOn: JSON.stringify(taskDef.depends_on || []),
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    iteration: 0,
    config: JSON.stringify({
      taskDefId,
      specId: taskDef.spec_id,
      planId: taskDef.plan_id,
      criteria: taskDef.criteria,
      execution: taskDef.execution,
    }),
    result: null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(schema.tasks).values(newTask);

  // Update task definition status in codebase
  taskDef.status = "queued";
  taskDef.queued_at = new Date().toISOString();
  writeFileSync(taskDefPath, stringifyYaml(taskDef));

  // Get the created task
  const [createdTask] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, newTask.id));

  broadcast({ type: "task:created", task: createdTask });
  broadcast({ type: "queue:update" });

  // Sync to project execution.json
  await syncQueueToProject(projectId);

  return c.json({
    success: true,
    task: createdTask,
    message: `Task "${newTask.name}" added to queue`,
  });
});

// POST /api/sync/queue-tasks/:projectId - Queue multiple task definitions
app.post("/queue-tasks/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  const body = await c.req.json();
  const { taskDefIds } = body as { taskDefIds: string[] };

  if (!taskDefIds || !Array.isArray(taskDefIds) || taskDefIds.length === 0) {
    return c.json({ error: "taskDefIds array required" }, 400);
  }

  // Get project
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId));

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const results = {
    queued: [] as string[],
    skipped: [] as string[],
    errors: [] as string[],
  };

  for (const taskDefId of taskDefIds) {
    try {
      const taskDefPath = join(project.path, ".forge", "tasks", `${taskDefId}.yaml`);
      if (!existsSync(taskDefPath)) {
        results.errors.push(`${taskDefId}: not found`);
        continue;
      }

      const content = readFileSync(taskDefPath, "utf-8");
      const taskDef = parseYaml(content) as Record<string, unknown>;

      // Check if already queued
      const existingTasks = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.projectId, projectId));

      const existingTask = existingTasks.find((t) => {
        try {
          const config = JSON.parse(t.config || "{}");
          return config.taskDefId === taskDefId;
        } catch {
          return false;
        }
      });

      if (existingTask) {
        results.skipped.push(taskDefId);
        continue;
      }

      // Create task
      const newTask = {
        id: generateId(),
        projectId,
        name: (taskDef.title as string) || taskDefId,
        prompt: buildPromptFromTaskDef(taskDef),
        status: "queued",
        priority: (taskDef.priority as number) || 0,
        dependsOn: JSON.stringify(taskDef.depends_on || []),
        scheduledAt: null,
        startedAt: null,
        completedAt: null,
        iteration: 0,
        config: JSON.stringify({
          taskDefId,
          specId: taskDef.spec_id,
          planId: taskDef.plan_id,
          criteria: taskDef.criteria,
          execution: taskDef.execution,
        }),
        result: null,
        createdAt: new Date().toISOString(),
      };

      await db.insert(schema.tasks).values(newTask);

      // Update codebase
      taskDef.status = "queued";
      taskDef.queued_at = new Date().toISOString();
      writeFileSync(taskDefPath, stringifyYaml(taskDef));

      results.queued.push(taskDefId);
    } catch (error) {
      results.errors.push(`${taskDefId}: ${error}`);
    }
  }

  broadcast({ type: "queue:update" });

  // Sync to project execution.json
  if (results.queued.length > 0) {
    await syncQueueToProject(projectId);
  }

  return c.json({
    success: true,
    ...results,
    message: `Queued ${results.queued.length} tasks, skipped ${results.skipped.length}, errors ${results.errors.length}`,
  });
});

export default app;

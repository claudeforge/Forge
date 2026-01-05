/**
 * Sync API routes
 * Handles synchronization between plugin and Control Center
 */

import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { broadcast } from "../broadcast.js";

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

export default app;

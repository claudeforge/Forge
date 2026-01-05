/**
 * Tasks API routes
 */

import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { db, schema } from "../db/index.js";
import { generateId } from "@claudeforge/forge-shared/utils";
import { broadcast } from "../broadcast.js";

/**
 * Sync task status back to project's task definition YAML file
 */
async function syncTaskDefStatus(
  taskId: string,
  status: string,
  result?: Record<string, unknown>
): Promise<void> {
  // Get task to find project
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) return;

  // Get project path
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, task.projectId));

  if (!project?.path) return;

  // Parse config to get taskDefId
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(task.config || "{}");
  } catch {
    return;
  }

  const taskDefId = config.taskDefId as string;
  if (!taskDefId) return;

  // Update task definition YAML
  const taskDefPath = join(project.path, ".forge", "tasks", `${taskDefId}.yaml`);
  if (!existsSync(taskDefPath)) return;

  try {
    const content = readFileSync(taskDefPath, "utf-8");
    const taskDef = parseYaml(content) as Record<string, unknown>;

    taskDef.status = status;
    taskDef.iterations = task.iteration;

    if (status === "running" && !taskDef.started_at) {
      taskDef.started_at = new Date().toISOString();
    }

    if (status === "completed" || status === "failed") {
      taskDef.completed_at = new Date().toISOString();
      if (result) {
        taskDef.result = {
          success: status === "completed",
          iterations: result.iterations ?? task.iteration,
          duration: result.duration ?? 0,
          tokens: result.tokens ?? 0,
          files_created: result.filesCreated ?? [],
          files_modified: result.filesModified ?? [],
          summary: result.summary ?? "",
          error: result.failureReason,
        };
      }
    }

    writeFileSync(taskDefPath, stringifyYaml(taskDef));
  } catch {
    // Ignore sync errors - best effort
  }
}

const app = new Hono();

// GET /api/tasks - List tasks
app.get("/", async (c) => {
  const projectId = c.req.query("projectId");

  let query = db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt));

  if (projectId) {
    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.projectId, projectId))
      .orderBy(desc(schema.tasks.createdAt));
    return c.json(tasks);
  }

  const tasks = await query;
  return c.json(tasks);
});

// POST /api/tasks - Create task
app.post("/", async (c) => {
  const body = await c.req.json();
  const {
    projectId,
    name,
    prompt,
    priority = 0,
    dependsOn = [],
    scheduledAt = null,
    config = {},
  } = body;

  if (!projectId || !name || !prompt) {
    return c.json({ error: "projectId, name, and prompt are required" }, 400);
  }

  const task = {
    id: generateId(),
    projectId,
    name,
    prompt,
    status: "queued",
    priority,
    dependsOn: JSON.stringify(dependsOn),
    scheduledAt,
    startedAt: null,
    completedAt: null,
    iteration: 0,
    config: JSON.stringify(config),
    result: null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(schema.tasks).values(task);

  // Broadcast update
  broadcast({ type: "task:update", task });

  return c.json(task, 201);
});

// GET /api/tasks/:id - Get single task
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));

  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json(task);
});

// PATCH /api/tasks/:id - Update task
app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.prompt !== undefined) updates.prompt = body.prompt;
  if (body.config !== undefined) updates.config = JSON.stringify(body.config);
  if (body.status !== undefined) updates.status = body.status;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.scheduledAt !== undefined) updates.scheduledAt = body.scheduledAt;
  if (body.iteration !== undefined) updates.iteration = body.iteration;
  if (body.startedAt !== undefined) updates.startedAt = body.startedAt;
  if (body.completedAt !== undefined) updates.completedAt = body.completedAt;
  if (body.result !== undefined) updates.result = JSON.stringify(body.result);

  await db
    .update(schema.tasks)
    .set(updates)
    .where(eq(schema.tasks.id, id));

  // Get updated task
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));

  // Sync status back to project task definition YAML
  if (body.status !== undefined) {
    await syncTaskDefStatus(id, body.status, body.result);
  }

  // Broadcast update
  broadcast({ type: "task:update", task });

  return c.json(task);
});

// DELETE /api/tasks/:id - Delete task
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));

  return c.json({ deleted: true });
});

// GET /api/tasks/:id/iterations - Get task iterations
app.get("/:id/iterations", async (c) => {
  const taskId = c.req.param("id");

  const iterations = await db
    .select()
    .from(schema.iterations)
    .where(eq(schema.iterations.taskId, taskId))
    .orderBy(desc(schema.iterations.iterationNum));

  return c.json(iterations);
});

export default app;

/**
 * Projects API routes
 */

import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { generateId } from "@claudeforge/forge-shared/utils";
import { broadcast } from "../broadcast.js";

const app = new Hono();

// GET /api/projects - List all projects
app.get("/", async (c) => {
  const projects = await db.select().from(schema.projects);
  return c.json(projects);
});

// POST /api/projects - Create project
app.post("/", async (c) => {
  const body = await c.req.json();
  const { name, path } = body;

  if (!name || !path) {
    return c.json({ error: "name and path are required" }, 400);
  }

  const project = {
    id: generateId(),
    name,
    path,
    createdAt: new Date().toISOString(),
    lastActivityAt: null,
  };

  await db.insert(schema.projects).values(project);

  return c.json(project, 201);
});

// GET /api/projects/:id - Get single project
app.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id));

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  return c.json(project);
});

// DELETE /api/projects/:id - Delete project
app.delete("/:id", async (c) => {
  const id = c.req.param("id");

  await db.delete(schema.projects).where(eq(schema.projects.id, id));

  return c.json({ deleted: true });
});

// GET /api/projects/:id/next-task - Get next queued task for project
// Used by plugin to fetch task configuration from Control Center
app.get("/:id/next-task", async (c) => {
  const projectId = c.req.param("id");

  // Get next queued task ordered by priority
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.projectId, projectId),
      eq(schema.tasks.status, "queued")
    ))
    .orderBy(asc(schema.tasks.priority))
    .limit(1);

  if (!task) {
    return c.json({ error: "No queued tasks for this project" }, 404);
  }

  // Parse config JSON
  const config = JSON.parse(task.config || "{}");

  return c.json({
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    criteria: config.criteria || [],
    maxIterations: config.maxIterations || 30,
    maxCost: config.maxCost || null,
  });
});

// POST /api/projects/:id/claim-task - Claim and start next task
// Used by plugin to atomically claim a task
app.post("/:id/claim-task", async (c) => {
  const projectId = c.req.param("id");

  // Get next queued task
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.projectId, projectId),
      eq(schema.tasks.status, "queued")
    ))
    .orderBy(asc(schema.tasks.priority))
    .limit(1);

  if (!task) {
    return c.json({ error: "No queued tasks" }, 404);
  }

  // Update to running
  await db
    .update(schema.tasks)
    .set({
      status: "running",
      startedAt: new Date().toISOString(),
    })
    .where(eq(schema.tasks.id, task.id));

  // Get updated task
  const [updated] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, task.id));

  // Broadcast
  broadcast({ type: "task:update", task: updated });

  // Parse config
  const config = JSON.parse(task.config || "{}");

  return c.json({
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    criteria: config.criteria || [],
    maxIterations: config.maxIterations || 30,
    maxCost: config.maxCost || null,
  });
});

export default app;

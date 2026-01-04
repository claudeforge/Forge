/**
 * Projects API routes
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { generateId } from "@claudeforge/forge-shared/utils";

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

  const result = await db
    .delete(schema.projects)
    .where(eq(schema.projects.id, id));

  return c.json({ deleted: true });
});

export default app;

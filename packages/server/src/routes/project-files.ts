/**
 * Project Files Routes
 * Direct access to project .forge/ directory
 */

import { Hono } from "hono";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { db } from "../db/index.js";
import { projects, tasks } from "../db/schema.js";
import { broadcast } from "../broadcast.js";
import { eq } from "drizzle-orm";

const app = new Hono();

// ============================================
// HELPERS
// ============================================

function getProjectPath(projectId: string): string | null {
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  return project?.path ?? null;
}

// ============================================
// SPECS
// ============================================

/** Load all task definitions to get counts */
function loadTaskDefs(projectPath: string): Record<string, unknown>[] {
  const tasksDir = join(projectPath, ".forge", "tasks");
  if (!existsSync(tasksDir)) return [];

  return readdirSync(tasksDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      try {
        const content = readFileSync(join(tasksDir, f), "utf-8");
        return parseYaml(content) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Record<string, unknown>[];
}

/** List all specs in project */
app.get("/projects/:projectId/specs", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const specsDir = join(projectPath, ".forge", "specs");
  if (!existsSync(specsDir)) {
    return c.json({ specs: [] });
  }

  // Load all tasks to count per spec
  const allTasks = loadTaskDefs(projectPath);

  const specs = readdirSync(specsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const metaPath = join(specsDir, f);
        const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
        const mdPath = join(specsDir, f.replace(".json", ".md"));
        const content = existsSync(mdPath) ? readFileSync(mdPath, "utf-8") : "";

        // Count tasks for this spec
        const specTasks = allTasks.filter((t) => t.spec_id === meta.id);
        const taskCounts = {
          total: specTasks.length,
          pending: specTasks.filter((t) => t.status === "pending").length,
          queued: specTasks.filter((t) => t.status === "queued").length,
          running: specTasks.filter((t) => t.status === "running").length,
          completed: specTasks.filter((t) => t.status === "completed").length,
          failed: specTasks.filter((t) => t.status === "failed").length,
        };

        return { ...meta, content, tasks: taskCounts };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return c.json({ specs });
});

/** Get single spec with its tasks */
app.get("/projects/:projectId/specs/:specId", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const specId = c.req.param("specId");
  const specsDir = join(projectPath, ".forge", "specs");
  const metaPath = join(specsDir, `${specId}.json`);
  const mdPath = join(specsDir, `${specId}.md`);

  if (!existsSync(metaPath)) {
    return c.json({ error: "Spec not found" }, 404);
  }

  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const content = existsSync(mdPath) ? readFileSync(mdPath, "utf-8") : "";

    // Get all tasks for this spec
    const allTasks = loadTaskDefs(projectPath);
    const specTasks = allTasks.filter((t) => t.spec_id === specId);

    // Sort by dependency order (tasks with no deps first)
    specTasks.sort((a, b) => {
      const aDeps = (a.depends_on as string[])?.length ?? 0;
      const bDeps = (b.depends_on as string[])?.length ?? 0;
      return aDeps - bDeps;
    });

    const taskCounts = {
      total: specTasks.length,
      pending: specTasks.filter((t) => t.status === "pending").length,
      queued: specTasks.filter((t) => t.status === "queued").length,
      running: specTasks.filter((t) => t.status === "running").length,
      completed: specTasks.filter((t) => t.status === "completed").length,
      failed: specTasks.filter((t) => t.status === "failed").length,
    };

    return c.json({
      ...meta,
      content,
      taskDefs: specTasks,
      taskCounts,
    });
  } catch (error) {
    return c.json({ error: "Failed to read spec" }, 500);
  }
});

/** Update spec metadata */
app.patch("/projects/:projectId/specs/:specId", async (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const specId = c.req.param("specId");
  const specsDir = join(projectPath, ".forge", "specs");
  const metaPath = join(specsDir, `${specId}.json`);

  if (!existsSync(metaPath)) {
    return c.json({ error: "Spec not found" }, 404);
  }

  try {
    const updates = await c.req.json();
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const updated = { ...meta, ...updates };
    writeFileSync(metaPath, JSON.stringify(updated, null, 2));
    return c.json(updated);
  } catch (error) {
    return c.json({ error: "Failed to update spec" }, 500);
  }
});

// ============================================
// PLANS
// ============================================

/** List all plans in project */
app.get("/projects/:projectId/plans", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const plansDir = join(projectPath, ".forge", "plans");
  if (!existsSync(plansDir)) {
    return c.json({ plans: [] });
  }

  const plans = readdirSync(plansDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const metaPath = join(plansDir, f);
        const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
        const mdPath = join(plansDir, f.replace(".json", ".md"));
        const content = existsSync(mdPath) ? readFileSync(mdPath, "utf-8") : "";
        return { ...meta, content };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return c.json({ plans });
});

/** Get single plan */
app.get("/projects/:projectId/plans/:planId", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const planId = c.req.param("planId");
  const plansDir = join(projectPath, ".forge", "plans");
  const metaPath = join(plansDir, `${planId}.json`);
  const mdPath = join(plansDir, `${planId}.md`);

  if (!existsSync(metaPath)) {
    return c.json({ error: "Plan not found" }, 404);
  }

  try {
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const content = existsSync(mdPath) ? readFileSync(mdPath, "utf-8") : "";
    return c.json({ ...meta, content });
  } catch (error) {
    return c.json({ error: "Failed to read plan" }, 500);
  }
});

/** Update plan metadata */
app.patch("/projects/:projectId/plans/:planId", async (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const planId = c.req.param("planId");
  const plansDir = join(projectPath, ".forge", "plans");
  const metaPath = join(plansDir, `${planId}.json`);

  if (!existsSync(metaPath)) {
    return c.json({ error: "Plan not found" }, 404);
  }

  try {
    const updates = await c.req.json();
    const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    const updated = { ...meta, ...updates };
    writeFileSync(metaPath, JSON.stringify(updated, null, 2));
    return c.json(updated);
  } catch (error) {
    return c.json({ error: "Failed to update plan" }, 500);
  }
});

// ============================================
// TASK DEFINITIONS (YAML files)
// ============================================

/** List all task definitions in project */
app.get("/projects/:projectId/task-defs", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  // Filter parameters
  const specId = c.req.query("specId");
  const planId = c.req.query("planId");
  const status = c.req.query("status");

  const tasksDir = join(projectPath, ".forge", "tasks");
  if (!existsSync(tasksDir)) {
    return c.json({ taskDefs: [] });
  }

  let taskDefs = readdirSync(tasksDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      try {
        const taskPath = join(tasksDir, f);
        const content = readFileSync(taskPath, "utf-8");
        return parseYaml(content) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Record<string, unknown>[];

  // Apply filters
  if (specId) {
    taskDefs = taskDefs.filter((t) => t.spec_id === specId);
  }
  if (planId) {
    taskDefs = taskDefs.filter((t) => t.plan_id === planId);
  }
  if (status) {
    taskDefs = taskDefs.filter((t) => t.status === status);
  }

  // Group by spec for summary
  const bySpec = new Map<string, Record<string, unknown>[]>();
  for (const task of taskDefs) {
    const sid = (task.spec_id as string) || "unassigned";
    if (!bySpec.has(sid)) {
      bySpec.set(sid, []);
    }
    bySpec.get(sid)!.push(task);
  }

  return c.json({
    taskDefs,
    bySpec: Object.fromEntries(bySpec),
    summary: {
      total: taskDefs.length,
      pending: taskDefs.filter((t) => t.status === "pending").length,
      queued: taskDefs.filter((t) => t.status === "queued").length,
      running: taskDefs.filter((t) => t.status === "running").length,
      completed: taskDefs.filter((t) => t.status === "completed").length,
      failed: taskDefs.filter((t) => t.status === "failed").length,
    },
  });
});

/** Get single task definition */
app.get("/projects/:projectId/task-defs/:taskId", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const taskId = c.req.param("taskId");
  const taskPath = join(projectPath, ".forge", "tasks", `${taskId}.yaml`);

  if (!existsSync(taskPath)) {
    return c.json({ error: "Task definition not found" }, 404);
  }

  try {
    const content = readFileSync(taskPath, "utf-8");
    const taskDef = parseYaml(content);
    return c.json(taskDef);
  } catch (error) {
    return c.json({ error: "Failed to read task definition" }, 500);
  }
});

/** Update task definition (YAML file) */
app.patch("/projects/:projectId/task-defs/:taskId", async (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const taskId = c.req.param("taskId");
  const taskPath = join(projectPath, ".forge", "tasks", `${taskId}.yaml`);

  if (!existsSync(taskPath)) {
    return c.json({ error: "Task definition not found" }, 404);
  }

  try {
    const updates = await c.req.json();
    const content = readFileSync(taskPath, "utf-8");
    const taskDef = parseYaml(content) as Record<string, unknown>;
    const updated = { ...taskDef, ...updates };
    writeFileSync(taskPath, stringifyYaml(updated));
    return c.json(updated);
  } catch (error) {
    return c.json({ error: "Failed to update task definition" }, 500);
  }
});

/** Update task definition status (convenience endpoint) */
app.post("/projects/:projectId/task-defs/:taskId/status", async (c) => {
  const projectId = c.req.param("projectId");
  const projectPath = getProjectPath(projectId);
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const taskId = c.req.param("taskId");
  const taskPath = join(projectPath, ".forge", "tasks", `${taskId}.yaml`);

  if (!existsSync(taskPath)) {
    return c.json({ error: "Task definition not found" }, 404);
  }

  try {
    const { status, result } = await c.req.json();
    const content = readFileSync(taskPath, "utf-8");
    const taskDef = parseYaml(content) as Record<string, unknown>;
    const now = new Date().toISOString();

    taskDef.status = status;

    if (status === "running" && !taskDef.started_at) {
      taskDef.started_at = now;
    }

    if (status === "completed" || status === "failed") {
      taskDef.completed_at = now;
      if (result) {
        taskDef.result = result;
      }
    }

    // Update YAML file
    writeFileSync(taskPath, stringifyYaml(taskDef));

    // Update database task if it exists
    const dbTask = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
    if (dbTask) {
      const dbUpdate: Record<string, unknown> = { status };

      if (status === "running" && !dbTask.startedAt) {
        dbUpdate.startedAt = now;
      }

      if (status === "completed" || status === "failed") {
        dbUpdate.completedAt = now;
        if (result) {
          dbUpdate.result = JSON.stringify(result);
        }
      }

      db.update(tasks).set(dbUpdate).where(eq(tasks.id, taskId)).run();

      // Get updated task for broadcast
      const updatedTask = db.select().from(tasks).where(eq(tasks.id, taskId)).get();

      // Broadcast task update to WebUI
      broadcast({ type: "task:update", task: updatedTask });

      // Broadcast queue update when task completes so UI can show next task
      if (status === "completed" || status === "failed") {
        broadcast({ type: "queue:update" });
      }
    } else {
      // No DB task, broadcast taskDef update for real-time UI
      broadcast({
        type: "task:update",
        task: { id: taskId, projectId, status, ...taskDef }
      });

      if (status === "completed" || status === "failed") {
        broadcast({ type: "queue:update" });
      }
    }

    return c.json(taskDef);
  } catch (error) {
    console.error("Failed to update task status:", error);
    return c.json({ error: "Failed to update task status" }, 500);
  }
});

// ============================================
// SYNC - Bulk operations
// ============================================

/** Sync all task definitions from project to server */
app.post("/projects/:projectId/sync/task-defs", async (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const tasksDir = join(projectPath, ".forge", "tasks");
  if (!existsSync(tasksDir)) {
    return c.json({ synced: 0, taskDefs: [] });
  }

  const taskDefs = readdirSync(tasksDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      try {
        const taskPath = join(tasksDir, f);
        const content = readFileSync(taskPath, "utf-8");
        return parseYaml(content);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Return all task defs - caller can use this to create tasks in DB
  return c.json({ synced: taskDefs.length, taskDefs });
});

/** Write execution result back to task definition file */
app.post("/projects/:projectId/task-defs/:taskId/result", async (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const taskId = c.req.param("taskId");
  const taskPath = join(projectPath, ".forge", "tasks", `${taskId}.yaml`);

  if (!existsSync(taskPath)) {
    return c.json({ error: "Task definition not found" }, 404);
  }

  try {
    const result = await c.req.json();
    const content = readFileSync(taskPath, "utf-8");
    const taskDef = parseYaml(content) as Record<string, unknown>;

    taskDef.status = result.success ? "completed" : "failed";
    taskDef.completed_at = new Date().toISOString();
    taskDef.iterations = result.iterations;
    taskDef.result = {
      success: result.success,
      iterations: result.iterations,
      duration: result.duration,
      tokens: result.tokens,
      files_created: result.filesCreated || [],
      files_modified: result.filesModified || [],
      summary: result.summary,
      error: result.error,
    };

    writeFileSync(taskPath, stringifyYaml(taskDef));
    return c.json({ success: true, taskDef });
  } catch (error) {
    return c.json({ error: "Failed to write result" }, 500);
  }
});

// ============================================
// PROJECT STATE
// ============================================

/** Get project .forge.json config */
app.get("/projects/:projectId/config", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const configPath = join(projectPath, ".forge.json");
  if (!existsSync(configPath)) {
    return c.json({});
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    return c.json(JSON.parse(content));
  } catch {
    return c.json({});
  }
});

/** Update project .forge.json config */
app.patch("/projects/:projectId/config", async (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const configPath = join(projectPath, ".forge.json");

  try {
    const updates = await c.req.json();
    let config = {};

    if (existsSync(configPath)) {
      config = JSON.parse(readFileSync(configPath, "utf-8"));
    }

    const updated = { ...config, ...updates };
    writeFileSync(configPath, JSON.stringify(updated, null, 2));
    return c.json(updated);
  } catch (error) {
    return c.json({ error: "Failed to update config" }, 500);
  }
});

/** Get current forge state (.claude/forge-state.json) */
app.get("/projects/:projectId/state", (c) => {
  const projectPath = getProjectPath(c.req.param("projectId"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const statePath = join(projectPath, ".claude", "forge-state.json");
  if (!existsSync(statePath)) {
    return c.json({ active: false });
  }

  try {
    const content = readFileSync(statePath, "utf-8");
    return c.json({ active: true, state: JSON.parse(content) });
  } catch {
    return c.json({ active: false });
  }
});

export default app;

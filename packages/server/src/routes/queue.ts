/**
 * Queue API routes
 */

import { Hono } from "hono";
import { eq, asc, desc, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { broadcast } from "../broadcast.js";
import { syncQueueToProject, syncQueueAfterReorder } from "../utils/execution-sync.js";

const app = new Hono();

// Queue state
let isProcessing = false;
let isPaused = false;

// GET /api/queue - Get queue status
app.get("/", async (c) => {
  const projectId = c.req.query("projectId");

  // Get running task (optionally filtered by project)
  let runningQuery = db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "running"));

  const runningTasks = await runningQuery;
  const running = projectId
    ? runningTasks.find(t => t.projectId === projectId) ?? null
    : runningTasks[0] ?? null;

  // Get queued tasks ordered by priority (optionally filtered by project)
  let queuedQuery = db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "queued"))
    .orderBy(asc(schema.tasks.priority));

  let queued = await queuedQuery;
  if (projectId) {
    queued = queued.filter(t => t.projectId === projectId);
  }

  // Get recent completed/failed tasks (last 5)
  const completed = await db
    .select()
    .from(schema.tasks)
    .where(or(
      eq(schema.tasks.status, "completed"),
      eq(schema.tasks.status, "failed")
    ))
    .orderBy(desc(schema.tasks.completedAt))
    .limit(5);

  const filteredCompleted = projectId
    ? completed.filter(t => t.projectId === projectId)
    : completed;

  return c.json({
    running,
    queued,
    completed: filteredCompleted,
    concurrency: 1,
    isProcessing,
    isPaused,
  });
});

// GET /api/queue/queued - Get only queued tasks
app.get("/queued", async (c) => {
  const queued = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "queued"))
    .orderBy(asc(schema.tasks.priority));

  return c.json(queued);
});

// POST /api/queue/reorder - Reorder queue
app.post("/reorder", async (c) => {
  const body = await c.req.json();
  const { taskIds } = body;

  if (!Array.isArray(taskIds)) {
    return c.json({ error: "taskIds must be an array" }, 400);
  }

  // Update priorities based on order
  for (let i = 0; i < taskIds.length; i++) {
    await db
      .update(schema.tasks)
      .set({ priority: i })
      .where(eq(schema.tasks.id, taskIds[i]));
  }

  // Broadcast queue update
  const queued = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "queued"))
    .orderBy(asc(schema.tasks.priority));

  broadcast({
    type: "queue:update",
    queue: { queued, isProcessing, isPaused },
  });

  // Sync to project execution.json files
  await syncQueueAfterReorder(taskIds);

  return c.json({ reordered: true });
});

// POST /api/queue/run/:id - Run a specific task from queue
app.post("/run/:id", async (c) => {
  const taskId = c.req.param("id");

  if (isPaused) {
    return c.json({ error: "Queue is paused" }, 400);
  }

  // Check if already running
  const [running] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "running"));

  if (running) {
    return c.json({ error: "A task is already running" }, 400);
  }

  // Get the specified task
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (task.status !== "queued") {
    return c.json({ error: "Task is not queued" }, 400);
  }

  // Update status to running
  await db
    .update(schema.tasks)
    .set({
      status: "running",
      startedAt: new Date().toISOString(),
    })
    .where(eq(schema.tasks.id, taskId));

  // Get updated task
  const [updated] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  isProcessing = true;

  broadcast({ type: "task:update", task: updated });

  // Sync to project execution.json
  await syncQueueToProject(updated.projectId);

  return c.json({ started: updated });
});

// POST /api/queue/run-next - Run next task in queue
app.post("/run-next", async (c) => {
  if (isPaused) {
    return c.json({ error: "Queue is paused" }, 400);
  }

  // Check if already running
  const [running] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "running"));

  if (running) {
    return c.json({ error: "A task is already running" }, 400);
  }

  // Get next queued task
  const [next] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "queued"))
    .orderBy(asc(schema.tasks.priority))
    .limit(1);

  if (!next) {
    return c.json({ error: "No tasks in queue" }, 404);
  }

  // Update status to running
  await db
    .update(schema.tasks)
    .set({
      status: "running",
      startedAt: new Date().toISOString(),
    })
    .where(eq(schema.tasks.id, next.id));

  // Get updated task
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, next.id));

  isProcessing = true;

  broadcast({ type: "task:update", task });

  // Sync to project execution.json
  await syncQueueToProject(task.projectId);

  return c.json({ started: task });
});

// POST /api/queue/pause - Pause queue
app.post("/pause", async (c) => {
  isPaused = true;

  broadcast({
    type: "queue:update",
    queue: { isProcessing, isPaused },
  });

  return c.json({ paused: true });
});

// POST /api/queue/resume - Resume queue
app.post("/resume", async (c) => {
  isPaused = false;

  broadcast({
    type: "queue:update",
    queue: { isProcessing, isPaused },
  });

  return c.json({ resumed: true });
});

export default app;

/**
 * Queue API routes
 */

import { Hono } from "hono";
import { eq, and, asc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { broadcast } from "../broadcast.js";

const app = new Hono();

// Queue state
let isProcessing = false;
let isPaused = false;

// GET /api/queue - Get queue status
app.get("/", async (c) => {
  // Get running task
  const [running] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "running"));

  // Get queued tasks ordered by priority
  const queued = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "queued"))
    .orderBy(asc(schema.tasks.priority));

  return c.json({
    running: running ?? null,
    queued,
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

  return c.json({ reordered: true });
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

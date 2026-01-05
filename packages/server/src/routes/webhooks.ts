/**
 * Webhooks API routes - receives events from FORGE plugin
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { broadcast } from "../broadcast.js";
import { generateId } from "@claudeforge/forge-shared/utils";
import type { ForgeEvent } from "@claudeforge/forge-shared";

const app = new Hono();

// POST /api/webhooks/forge - Receive plugin events
app.post("/forge", async (c) => {
  const event = (await c.req.json()) as ForgeEvent;

  console.log(`[Webhook] Received event: ${event.type}`);

  switch (event.type) {
    case "task:started":
      await handleTaskStarted(event);
      break;

    case "task:progress":
      await handleTaskProgress(event);
      break;

    case "task:completed":
      await handleTaskCompleted(event);
      break;

    case "task:failed":
      await handleTaskFailed(event);
      break;

    case "task:stuck":
      await handleTaskStuck(event);
      break;

    case "task:paused":
      await handleTaskPaused(event);
      break;

    case "task:resumed":
      await handleTaskResumed(event);
      break;

    case "checkpoint:created":
      await handleCheckpointCreated(event);
      break;
  }

  return c.json({ received: true });
});

async function handleTaskStarted(event: ForgeEvent & { type: "task:started" }) {
  // Extract project info from extended event data
  const eventData = event as unknown as {
    projectPath?: string;
    projectName?: string;
    projectId?: string;
  };

  const projectPath = eventData.projectPath;
  const projectName = eventData.projectName ?? projectPath?.split(/[/\\]/).pop() ?? "Unknown Project";

  // Generate stable ID from path, or use provided projectId
  let projectId: string;
  if (projectPath) {
    // Create short hash from path
    const hash = Buffer.from(projectPath).toString("base64url").slice(0, 12);
    projectId = `proj-${hash}`;
  } else {
    projectId = eventData.projectId ?? "default";
  }

  // Check if project exists by path first (more reliable)
  let existingProject;
  if (projectPath) {
    [existingProject] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.path, projectPath));
  }

  // If not found by path, check by ID
  if (!existingProject) {
    [existingProject] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId));
  }

  // Use existing project's ID if found
  if (existingProject) {
    projectId = existingProject.id;
  } else {
    // Auto-create project
    await db.insert(schema.projects).values({
      id: projectId,
      name: projectName,
      path: projectPath ?? "",
      createdAt: new Date().toISOString(),
    });
    console.log(`[Webhook] Auto-created project: ${projectName} (${projectPath})`);
  }

  // Check if task exists
  const [existingTask] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, event.taskId));

  if (existingTask) {
    // Update existing task
    await db
      .update(schema.tasks)
      .set({
        status: "running",
        startedAt: event.timestamp,
        projectId: projectId, // Update project ID in case it changed
      })
      .where(eq(schema.tasks.id, event.taskId));
  } else {
    // Create new task from webhook data
    await db.insert(schema.tasks).values({
      id: event.taskId,
      projectId: projectId,
      name: event.name ?? "Unnamed Task",
      prompt: event.prompt ?? "",
      status: "running",
      iteration: 0,
      config: JSON.stringify({ criteria: event.criteria ?? [] }),
      startedAt: event.timestamp,
      createdAt: new Date().toISOString(),
    });
    console.log(`[Webhook] Created task: ${event.taskId} for project: ${projectName}`);
  }

  // Broadcast
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, event.taskId));

  if (task) {
    broadcast({ type: "task:update", task });
  }
}

async function handleTaskProgress(event: ForgeEvent & { type: "task:progress" }) {
  // Record iteration
  await db.insert(schema.iterations).values({
    id: generateId(),
    taskId: event.taskId,
    iterationNum: event.iteration,
    startedAt: event.iterationRecord.startedAt,
    endedAt: event.iterationRecord.endedAt,
    duration: event.iterationRecord.duration,
    tokens: event.iterationRecord.tokens,
    outcome: event.iterationRecord.outcome,
    summary: event.iterationRecord.summary,
    criteriaResults: JSON.stringify(event.criteriaResults),
    createdAt: new Date().toISOString(),
  });

  // Update task iteration count
  await db
    .update(schema.tasks)
    .set({ iteration: event.iteration })
    .where(eq(schema.tasks.id, event.taskId));

  // Broadcast iteration
  broadcast({
    type: "iteration",
    taskId: event.taskId,
    iteration: event.iteration,
    record: event.iterationRecord,
  });
}

async function handleTaskCompleted(event: ForgeEvent & { type: "task:completed" }) {
  await db
    .update(schema.tasks)
    .set({
      status: "completed",
      completedAt: event.timestamp,
      result: JSON.stringify({
        iterations: event.iterations,
        metrics: event.metrics,
        criteriaResults: event.criteriaResults,
        outcome: "completed",
      }),
    })
    .where(eq(schema.tasks.id, event.taskId));

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, event.taskId));

  if (task) {
    broadcast({ type: "task:update", task });

    // Broadcast queue update so UI knows to check for next task
    broadcast({ type: "queue:update" });
  }
}

async function handleTaskFailed(event: ForgeEvent & { type: "task:failed" }) {
  await db
    .update(schema.tasks)
    .set({
      status: "failed",
      completedAt: event.timestamp,
      result: JSON.stringify({
        metrics: event.metrics,
        outcome: "failed",
        failureReason: event.reason,
      }),
    })
    .where(eq(schema.tasks.id, event.taskId));

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, event.taskId));

  if (task) {
    broadcast({ type: "task:update", task });
  }
}

async function handleTaskStuck(event: ForgeEvent & { type: "task:stuck" }) {
  // Just broadcast, don't change status yet (recovery might save it)
  broadcast({
    type: "task:update",
    task: { id: event.taskId, stuckPattern: event.pattern },
  });
}

async function handleTaskPaused(event: ForgeEvent & { type: "task:paused" }) {
  await db
    .update(schema.tasks)
    .set({ status: "paused" })
    .where(eq(schema.tasks.id, event.taskId));

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, event.taskId));

  if (task) {
    broadcast({ type: "task:update", task });
  }
}

async function handleTaskResumed(event: ForgeEvent & { type: "task:resumed" }) {
  await db
    .update(schema.tasks)
    .set({ status: "running" })
    .where(eq(schema.tasks.id, event.taskId));

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, event.taskId));

  if (task) {
    broadcast({ type: "task:update", task });
  }
}

async function handleCheckpointCreated(event: ForgeEvent & { type: "checkpoint:created" }) {
  await db.insert(schema.checkpoints).values({
    id: event.checkpoint.id,
    taskId: event.taskId,
    iterationNum: event.checkpoint.iteration,
    type: event.checkpoint.type,
    gitRef: event.checkpoint.gitRef,
    metrics: JSON.stringify(event.checkpoint.metrics),
    createdAt: event.checkpoint.createdAt,
  });
}

export default app;

/**
 * Sync API v2 Routes
 *
 * Implements the v2 sync protocol with:
 * - Monotonic versioning
 * - Optimistic locking
 * - Task locks with heartbeat
 * - Conflict detection and resolution
 * - Control Center intervention
 */

import { Hono } from "hono";
import { eq, and, lt, isNull, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { broadcast } from "../broadcast.js";
import { generateId } from "@claudeforge/forge-shared/utils";
import {
  type TaskStatus,
  type SyncHandshakeRequest,
  type SyncHandshakeResponse,
  type SyncPushRequest,
  type SyncPushResponse,
  type SyncPullRequest,
  type SyncPullResponse,
  type TaskClaimRequest,
  type TaskClaimResponse,
  type TaskHeartbeatRequest,
  type TaskHeartbeatResponse,
  type InterventionRequest,
  type InterventionResponse,
  type ConflictContext,
  isValidTransition,
  isTerminalState,
  resolveConflict,
  DEFAULT_LOCK_DURATION_MS,
} from "@claudeforge/forge-shared";
import { syncQueueToProject } from "../utils/execution-sync.js";

const app = new Hono();

// Server logical clock (in-memory, persisted per restart)
let serverLogicalClock = Date.now();

function incrementClock(remoteClock?: number): number {
  serverLogicalClock = Math.max(serverLogicalClock, remoteClock ?? 0) + 1;
  return serverLogicalClock;
}

// ============================================
// NODE REGISTRATION
// ============================================

// POST /api/v2/sync/nodes/register - Register a node
app.post("/nodes/register", async (c) => {
  const body = await c.req.json();
  const { nodeId, projectId, nodeType, displayName, capabilities } = body;

  if (!nodeId || !projectId || !nodeType) {
    return c.json({ error: "nodeId, projectId, and nodeType required" }, 400);
  }

  const now = new Date().toISOString();

  // Check if node already exists
  const [existing] = await db
    .select()
    .from(schema.nodes)
    .where(eq(schema.nodes.id, nodeId));

  if (existing) {
    // Update last seen
    await db
      .update(schema.nodes)
      .set({
        lastSeenAt: now,
        isOnline: true,
        displayName: displayName ?? existing.displayName,
        capabilities: JSON.stringify(capabilities ?? []),
      })
      .where(eq(schema.nodes.id, nodeId));
  } else {
    // Create new node
    await db.insert(schema.nodes).values({
      id: nodeId,
      projectId,
      nodeType,
      displayName,
      capabilities: JSON.stringify(capabilities ?? []),
      registeredAt: now,
      lastSeenAt: now,
      isOnline: true,
      logicalClock: 0,
    });
  }

  broadcast({
    type: "node:registered",
    nodeId,
    projectId,
  });

  return c.json({
    success: true,
    serverClock: serverLogicalClock,
    serverTime: now,
  });
});

// POST /api/v2/sync/nodes/:nodeId/heartbeat - Node heartbeat
app.post("/nodes/:nodeId/heartbeat", async (c) => {
  const nodeId = c.req.param("nodeId");
  const now = new Date().toISOString();

  await db
    .update(schema.nodes)
    .set({
      lastSeenAt: now,
      isOnline: true,
    })
    .where(eq(schema.nodes.id, nodeId));

  return c.json({ success: true, serverTime: now });
});

// GET /api/v2/sync/nodes/:projectId - List nodes for project
app.get("/nodes/:projectId", async (c) => {
  const projectId = c.req.param("projectId");

  const projectNodes = await db
    .select()
    .from(schema.nodes)
    .where(eq(schema.nodes.projectId, projectId));

  // Mark nodes offline if not seen in 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  return c.json({
    nodes: projectNodes.map((n) => ({
      ...n,
      capabilities: JSON.parse(n.capabilities),
      isOnline: n.lastSeenAt > fiveMinutesAgo,
    })),
  });
});

// ============================================
// SYNC HANDSHAKE
// ============================================

// POST /api/v2/sync/handshake/:projectId - Sync handshake
app.post("/handshake/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  const body = (await c.req.json()) as SyncHandshakeRequest;
  const { nodeId, localClock, taskVersions } = body;

  // Update node's clock
  if (nodeId) {
    await db
      .update(schema.nodes)
      .set({
        logicalClock: localClock,
        lastSeenAt: new Date().toISOString(),
        isOnline: true,
      })
      .where(eq(schema.nodes.id, nodeId));
  }

  // Get all tasks for project
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectId, projectId));

  const conflicts: SyncHandshakeResponse["conflicts"] = [];
  const needsPull: string[] = [];
  const needsPush: string[] = [];
  const inSync: string[] = [];

  for (const task of tasks) {
    const localVersion = taskVersions[task.id];

    if (localVersion === undefined) {
      // Client doesn't know about this task
      needsPull.push(task.id);
    } else if (localVersion < task.syncVersion) {
      // Server is ahead
      needsPull.push(task.id);
      conflicts.push({
        taskId: task.id,
        localVersion,
        serverVersion: task.syncVersion,
      });
    } else if (localVersion > task.syncVersion) {
      // Client is ahead
      needsPush.push(task.id);
      conflicts.push({
        taskId: task.id,
        localVersion,
        serverVersion: task.syncVersion,
      });
    } else {
      // In sync
      inSync.push(task.id);
    }
  }

  // Check for tasks client has but server doesn't
  for (const taskId of Object.keys(taskVersions)) {
    if (!tasks.find((t) => t.id === taskId)) {
      needsPush.push(taskId);
    }
  }

  const response: SyncHandshakeResponse = {
    serverClock: incrementClock(localClock),
    conflicts,
    needsPull,
    needsPush,
    inSync,
    serverTime: new Date().toISOString(),
  };

  return c.json(response);
});

// ============================================
// SYNC PUSH/PULL
// ============================================

// POST /api/v2/sync/push/:projectId - Push updates
app.post("/push/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  const body = (await c.req.json()) as SyncPushRequest;
  const { nodeId, tasks: taskUpdates } = body;

  const results: SyncPushResponse["results"] = [];

  for (const update of taskUpdates) {
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, update.id));

    if (!task) {
      results.push({
        taskId: update.id,
        success: false,
        error: "TASK_NOT_FOUND",
      });
      continue;
    }

    // Check version (optimistic locking)
    if (update.expectedVersion !== task.syncVersion) {
      // Version conflict - determine resolution
      const context: ConflictContext = {
        pluginIsActiveRunner: task.lockedBy === nodeId,
        serverState: {
          status: task.status as TaskStatus,
          version: task.syncVersion,
          lockedBy: task.lockedBy ?? undefined,
        },
        pluginState: {
          status: update.status,
          expectedVersion: update.expectedVersion,
        },
      };

      const resolution = resolveConflict(context);

      if (resolution === "SERVER_WINS" || resolution === "REJECT") {
        results.push({
          taskId: update.id,
          success: false,
          error: "VERSION_CONFLICT",
          resolution,
          serverState: {
            status: task.status as TaskStatus,
            version: task.syncVersion,
          },
        });
        continue;
      }

      // PLUGIN_WINS - fall through to update
    }

    // Check state machine validity
    if (!isValidTransition(task.status as TaskStatus, update.status)) {
      results.push({
        taskId: update.id,
        success: false,
        error: "INVALID_TRANSITION",
        serverState: {
          status: task.status as TaskStatus,
          version: task.syncVersion,
        },
      });
      continue;
    }

    // Check terminal state
    if (isTerminalState(task.status as TaskStatus)) {
      results.push({
        taskId: update.id,
        success: false,
        error: "TERMINAL_STATE",
        serverState: {
          status: task.status as TaskStatus,
          version: task.syncVersion,
        },
      });
      continue;
    }

    // Apply update
    const newVersion = task.syncVersion + 1;
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      status: update.status,
      syncVersion: newVersion,
    };

    if (update.result) {
      updateData.result = JSON.stringify(update.result);
    }

    if (update.iteration !== undefined) {
      updateData.iteration = update.iteration;
    }

    if (update.status === "completed" || update.status === "failed" || update.status === "aborted") {
      updateData.completedAt = now;
      // Release lock on completion
      updateData.lockedBy = null;
      updateData.lockedAt = null;
      updateData.lockExpiresAt = null;
    }

    await db
      .update(schema.tasks)
      .set(updateData)
      .where(eq(schema.tasks.id, update.id));

    // Log the sync operation
    await db.insert(schema.syncLog).values({
      id: generateId(),
      projectId,
      taskId: update.id,
      nodeId: nodeId ?? "unknown",
      operation: "status_change",
      oldValue: JSON.stringify({ status: task.status, version: task.syncVersion }),
      newValue: JSON.stringify({ status: update.status, version: newVersion }),
      logicalClock: incrementClock(),
      timestamp: now,
    });

    results.push({
      taskId: update.id,
      success: true,
      newVersion,
    });

    // Broadcast update
    broadcast({
      type: "task:update",
      task: { ...task, status: update.status, syncVersion: newVersion },
    });
  }

  // Sync to project execution.json
  await syncQueueToProject(projectId);

  broadcast({ type: "queue:update" });

  const response: SyncPushResponse = {
    results,
    serverClock: serverLogicalClock,
  };

  return c.json(response);
});

// POST /api/v2/sync/pull/:projectId - Pull updates
app.post("/pull/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  const body = (await c.req.json()) as SyncPullRequest;
  const { taskIds } = body;

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.projectId, projectId),
        taskIds.length > 0
          ? or(...taskIds.map((id) => eq(schema.tasks.id, id)))
          : undefined
      )
    );

  const response: SyncPullResponse = {
    tasks: tasks.map((t) => ({
      id: t.id,
      status: t.status as TaskStatus,
      version: t.syncVersion,
      result: t.result ? JSON.parse(t.result) : undefined,
      iteration: t.iteration,
      lockedBy: t.lockedBy ?? undefined,
    })),
    serverClock: serverLogicalClock,
  };

  return c.json(response);
});

// ============================================
// TASK LOCKING
// ============================================

// POST /api/v2/sync/tasks/:taskId/claim - Claim (lock) a task
app.post("/tasks/:taskId/claim", async (c) => {
  const taskId = c.req.param("taskId");
  const body = (await c.req.json()) as TaskClaimRequest;
  const { nodeId, lockDuration = DEFAULT_LOCK_DURATION_MS } = body;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + lockDuration);

  // Atomic update: only claim if not locked or lock expired
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) {
    const response: TaskClaimResponse = {
      success: false,
      error: "TASK_NOT_FOUND",
    };
    return c.json(response, 404);
  }

  // Check if task can be claimed (queued status)
  if (task.status !== "queued") {
    const response: TaskClaimResponse = {
      success: false,
      error: "INVALID_STATUS",
      lockedBy: task.lockedBy ?? undefined,
    };
    return c.json(response, 409);
  }

  // Check existing lock
  if (task.lockedBy && task.lockExpiresAt) {
    const lockExpiry = new Date(task.lockExpiresAt);
    if (lockExpiry > now && task.lockedBy !== nodeId) {
      const response: TaskClaimResponse = {
        success: false,
        error: "ALREADY_LOCKED",
        lockedBy: task.lockedBy,
        lockedUntil: task.lockExpiresAt,
      };
      return c.json(response, 409);
    }
  }

  // Claim the task
  const newVersion = task.syncVersion + 1;

  await db
    .update(schema.tasks)
    .set({
      status: "running",
      lockedBy: nodeId,
      lockedAt: now.toISOString(),
      lockExpiresAt: expiresAt.toISOString(),
      startedAt: now.toISOString(),
      syncVersion: newVersion,
    })
    .where(
      and(
        eq(schema.tasks.id, taskId),
        or(
          isNull(schema.tasks.lockedBy),
          lt(schema.tasks.lockExpiresAt, now.toISOString())
        )
      )
    );

  // Verify the claim succeeded
  const [updated] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!updated || updated.lockedBy !== nodeId) {
    const response: TaskClaimResponse = {
      success: false,
      error: "ALREADY_LOCKED",
      lockedBy: updated?.lockedBy ?? undefined,
      lockedUntil: updated?.lockExpiresAt ?? undefined,
    };
    return c.json(response, 409);
  }

  // Log the lock
  await db.insert(schema.syncLog).values({
    id: generateId(),
    projectId: task.projectId,
    taskId,
    nodeId,
    operation: "lock",
    oldValue: null,
    newValue: JSON.stringify({ lockedBy: nodeId, expiresAt: expiresAt.toISOString() }),
    logicalClock: incrementClock(),
    timestamp: now.toISOString(),
  });

  broadcast({
    type: "task:locked",
    taskId,
    nodeId,
    expiresAt: expiresAt.toISOString(),
  });

  // Sync to project
  await syncQueueToProject(task.projectId);

  const response: TaskClaimResponse = {
    success: true,
    lock: {
      taskId,
      lockedBy: nodeId,
      lockedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      heartbeatAt: now.toISOString(),
    },
    task: {
      id: updated.id,
      name: updated.name,
      prompt: updated.prompt,
      status: updated.status as TaskStatus,
      priority: updated.priority,
      config: JSON.parse(updated.config),
    },
  };

  return c.json(response);
});

// POST /api/v2/sync/tasks/:taskId/heartbeat - Heartbeat to extend lock
app.post("/tasks/:taskId/heartbeat", async (c) => {
  const taskId = c.req.param("taskId");
  const body = (await c.req.json()) as TaskHeartbeatRequest;
  const { nodeId, iteration, progress, extendLock = DEFAULT_LOCK_DURATION_MS, executionState } = body;

  const now = new Date();

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) {
    const response: TaskHeartbeatResponse = {
      success: false,
      error: "TASK_NOT_FOUND",
    };
    return c.json(response, 404);
  }

  // Check if we own the lock
  if (task.lockedBy !== nodeId) {
    const response: TaskHeartbeatResponse = {
      success: false,
      error: "LOCK_LOST",
    };
    return c.json(response, 409);
  }

  // Extend lock
  const newExpiresAt = new Date(now.getTime() + extendLock);

  await db
    .update(schema.tasks)
    .set({
      lockExpiresAt: newExpiresAt.toISOString(),
      iteration: iteration ?? task.iteration,
    })
    .where(eq(schema.tasks.id, taskId));

  // Check for pending interventions
  const pendingInterventions = await db
    .select()
    .from(schema.interventions)
    .where(
      and(
        eq(schema.interventions.taskId, taskId),
        eq(schema.interventions.status, "pending")
      )
    );

  const commands: TaskHeartbeatResponse["commands"] = [];

  for (const intervention of pendingInterventions) {
    if (intervention.type === "PAUSE") {
      commands.push({ type: "PAUSE", reason: intervention.reason });
    } else if (intervention.type === "ABORT") {
      commands.push({ type: "ABORT", reason: intervention.reason });
    }

    // Mark intervention as applied
    await db
      .update(schema.interventions)
      .set({
        status: "applied",
        appliedAt: now.toISOString(),
      })
      .where(eq(schema.interventions.id, intervention.id));
  }

  // Broadcast progress with execution state
  broadcast({
    type: "task:progress",
    taskId,
    iteration,
    progress,
    executionState,
  });

  const response: TaskHeartbeatResponse = {
    success: true,
    expiresAt: newExpiresAt.toISOString(),
    commands: commands.length > 0 ? commands : undefined,
  };

  return c.json(response);
});

// POST /api/v2/sync/tasks/:taskId/release - Release lock
app.post("/tasks/:taskId/release", async (c) => {
  const taskId = c.req.param("taskId");
  const body = await c.req.json();
  const { nodeId } = body;

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (task.lockedBy !== nodeId) {
    return c.json({ error: "Not lock owner" }, 403);
  }

  await db
    .update(schema.tasks)
    .set({
      lockedBy: null,
      lockedAt: null,
      lockExpiresAt: null,
    })
    .where(eq(schema.tasks.id, taskId));

  // Log the unlock
  await db.insert(schema.syncLog).values({
    id: generateId(),
    projectId: task.projectId,
    taskId,
    nodeId,
    operation: "unlock",
    oldValue: JSON.stringify({ lockedBy: task.lockedBy }),
    newValue: null,
    logicalClock: incrementClock(),
    timestamp: new Date().toISOString(),
  });

  broadcast({
    type: "task:unlocked",
    taskId,
    nodeId,
  });

  return c.json({ success: true });
});

// ============================================
// CONTROL CENTER INTERVENTIONS
// ============================================

// POST /api/v2/sync/intervene - Create intervention
app.post("/intervene", async (c) => {
  const body = (await c.req.json()) as InterventionRequest;
  const { type, taskId, requestedBy, reason, params } = body;

  const now = new Date().toISOString();

  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));

  if (!task) {
    const response: InterventionResponse = {
      success: false,
      action: "none",
      error: "Task not found",
    };
    return c.json(response, 404);
  }

  // Create intervention record
  const interventionId = generateId();

  await db.insert(schema.interventions).values({
    id: interventionId,
    taskId,
    type,
    requestedBy,
    reason,
    params: JSON.stringify(params ?? {}),
    status: "pending",
    createdAt: now,
  });

  let action = "queued";
  let newState: InterventionResponse["newState"];

  // Handle immediate interventions
  if (type === "FORCE_STATUS" && params?.newStatus) {
    const newVersion = task.syncVersion + 1;

    await db
      .update(schema.tasks)
      .set({
        status: params.newStatus,
        syncVersion: newVersion,
        ...(params.newStatus === "completed" || params.newStatus === "failed"
          ? { completedAt: now }
          : {}),
      })
      .where(eq(schema.tasks.id, taskId));

    await db
      .update(schema.interventions)
      .set({ status: "applied", appliedAt: now })
      .where(eq(schema.interventions.id, interventionId));

    action = `forced status to ${params.newStatus}`;
    newState = {
      status: params.newStatus as TaskStatus,
      version: newVersion,
    };

    broadcast({ type: "task:update", task: { ...task, status: params.newStatus } });
  } else if (type === "RELEASE_LOCK") {
    await db
      .update(schema.tasks)
      .set({
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
      })
      .where(eq(schema.tasks.id, taskId));

    await db
      .update(schema.interventions)
      .set({ status: "applied", appliedAt: now })
      .where(eq(schema.interventions.id, interventionId));

    action = "released lock";

    broadcast({ type: "task:unlocked", taskId, forced: true });
  } else if (type === "RETRY" && task.status === "failed") {
    const newVersion = task.syncVersion + 1;

    await db
      .update(schema.tasks)
      .set({
        status: "queued",
        syncVersion: newVersion,
        iteration: params?.resetIteration ? 0 : task.iteration,
        result: null,
        completedAt: null,
      })
      .where(eq(schema.tasks.id, taskId));

    await db
      .update(schema.interventions)
      .set({ status: "applied", appliedAt: now })
      .where(eq(schema.interventions.id, interventionId));

    action = "requeued for retry";
    newState = {
      status: "queued",
      version: newVersion,
    };

    broadcast({ type: "task:update", task: { ...task, status: "queued" } });
  }

  // Sync to project
  await syncQueueToProject(task.projectId);
  broadcast({ type: "queue:update" });

  const response: InterventionResponse = {
    success: true,
    action,
    newState,
  };

  return c.json(response);
});

// GET /api/v2/sync/interventions/:taskId - Get intervention history
app.get("/interventions/:taskId", async (c) => {
  const taskId = c.req.param("taskId");

  const interventionList = await db
    .select()
    .from(schema.interventions)
    .where(eq(schema.interventions.taskId, taskId));

  return c.json({
    interventions: interventionList.map((i) => ({
      ...i,
      params: JSON.parse(i.params),
      result: i.result ? JSON.parse(i.result) : null,
    })),
  });
});

// ============================================
// MONITORING
// ============================================

// GET /api/v2/sync/status/:projectId - Get sync status
app.get("/status/:projectId", async (c) => {
  const projectId = c.req.param("projectId");

  const projectNodes = await db
    .select()
    .from(schema.nodes)
    .where(eq(schema.nodes.projectId, projectId));

  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.projectId, projectId));

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const activeLocks = tasks
    .filter((t) => t.lockedBy && t.lockExpiresAt && t.lockExpiresAt > new Date().toISOString())
    .map((t) => ({
      taskId: t.id,
      lockedBy: t.lockedBy!,
      lockedAt: t.lockedAt!,
      expiresAt: t.lockExpiresAt!,
      heartbeatAt: t.lockedAt!, // TODO: track separately
    }));

  const stuckTasks = tasks.filter(
    (t) => t.status === "running" && t.startedAt && t.startedAt < oneHourAgo
  );

  const onlineNodes = projectNodes.filter((n) => n.lastSeenAt > fiveMinutesAgo);

  return c.json({
    projectId,
    serverClock: serverLogicalClock,
    nodes: projectNodes.map((n) => ({
      nodeId: n.id,
      nodeType: n.nodeType,
      displayName: n.displayName,
      lastSeen: n.lastSeenAt,
      isOnline: n.lastSeenAt > fiveMinutesAgo,
    })),
    activeLocks,
    stuckTasks: stuckTasks.map((t) => ({
      id: t.id,
      name: t.name,
      startedAt: t.startedAt,
      lockedBy: t.lockedBy,
    })),
    health: stuckTasks.length > 0 ? "degraded" : onlineNodes.length > 0 ? "healthy" : "offline",
    stats: {
      totalTasks: tasks.length,
      queued: tasks.filter((t) => t.status === "queued").length,
      running: tasks.filter((t) => t.status === "running").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
    },
  });
});

// GET /api/v2/sync/log/:projectId - Get sync log
app.get("/log/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  const limit = parseInt(c.req.query("limit") ?? "50");

  const logs = await db
    .select()
    .from(schema.syncLog)
    .where(eq(schema.syncLog.projectId, projectId))
    .orderBy(schema.syncLog.timestamp)
    .limit(limit);

  return c.json({
    logs: logs.map((l) => ({
      ...l,
      oldValue: l.oldValue ? JSON.parse(l.oldValue) : null,
      newValue: l.newValue ? JSON.parse(l.newValue) : null,
    })),
  });
});

// POST /api/v2/sync/fix-expired-locks - Fix all expired locks
app.post("/fix-expired-locks", async (c) => {
  const now = new Date().toISOString();

  const expiredLockTasks = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.status, "running"),
        lt(schema.tasks.lockExpiresAt, now)
      )
    );

  let fixed = 0;

  for (const task of expiredLockTasks) {
    const newVersion = task.syncVersion + 1;

    await db
      .update(schema.tasks)
      .set({
        status: "stuck",
        syncVersion: newVersion,
        lockedBy: null,
        lockedAt: null,
        lockExpiresAt: null,
      })
      .where(eq(schema.tasks.id, task.id));

    // Log the fix
    await db.insert(schema.syncLog).values({
      id: generateId(),
      projectId: task.projectId,
      taskId: task.id,
      nodeId: "server",
      operation: "auto_fix",
      oldValue: JSON.stringify({ status: "running", lockedBy: task.lockedBy }),
      newValue: JSON.stringify({ status: "stuck", lockedBy: null }),
      logicalClock: incrementClock(),
      timestamp: now,
    });

    fixed++;

    broadcast({
      type: "task:update",
      task: { ...task, status: "stuck", lockedBy: null },
    });

    // Sync to project
    await syncQueueToProject(task.projectId);
  }

  broadcast({ type: "queue:update" });

  return c.json({
    success: true,
    fixed,
    message: `Fixed ${fixed} tasks with expired locks`,
  });
});

export default app;

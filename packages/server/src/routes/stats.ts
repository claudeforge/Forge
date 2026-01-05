/**
 * Stats API routes
 */

import { Hono } from "hono";
import { eq, sql, gte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

const app = new Hono();

// GET /api/stats - Get overall statistics
app.get("/", async (c) => {
  // Total tasks
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tasks);
  const totalTasks = totalResult?.count ?? 0;

  // Completed tasks
  const [completedResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "completed"));
  const completedTasks = completedResult?.count ?? 0;

  // Failed tasks
  const [failedResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tasks)
    .where(eq(schema.tasks.status, "failed"));
  const failedTasks = failedResult?.count ?? 0;

  // Total iterations
  const [iterationsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.iterations);
  const totalIterations = iterationsResult?.count ?? 0;

  // Total duration (sum of iteration durations)
  const [durationResult] = await db
    .select({ total: sql<number>`coalesce(sum(duration), 0)` })
    .from(schema.iterations);
  const totalDuration = durationResult?.total ?? 0;

  // Today's stats
  const today = new Date().toISOString().split("T")[0] ?? "";

  const [todayTasksResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tasks)
    .where(gte(schema.tasks.createdAt, today));
  const tasksToday = todayTasksResult?.count ?? 0;

  return c.json({
    totalTasks,
    completedTasks,
    failedTasks,
    totalIterations,
    totalDuration,
    tasksToday,
  });
});

export default app;

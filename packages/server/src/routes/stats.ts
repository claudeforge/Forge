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

  // Total cost
  const [costResult] = await db
    .select({ total: sql<number>`coalesce(sum(cost), 0)` })
    .from(schema.costLog);
  const totalCost = costResult?.total ?? 0;

  // Total duration (sum of iteration durations)
  const [durationResult] = await db
    .select({ total: sql<number>`coalesce(sum(duration), 0)` })
    .from(schema.iterations);
  const totalDuration = durationResult?.total ?? 0;

  // Today's stats
  const today = new Date().toISOString().split("T")[0];

  const [todayTasksResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tasks)
    .where(gte(schema.tasks.createdAt, today));
  const tasksToday = todayTasksResult?.count ?? 0;

  const [todayCostResult] = await db
    .select({ total: sql<number>`coalesce(sum(cost), 0)` })
    .from(schema.costLog)
    .where(gte(schema.costLog.createdAt, today));
  const costToday = todayCostResult?.total ?? 0;

  return c.json({
    totalTasks,
    completedTasks,
    failedTasks,
    totalIterations,
    totalCost,
    totalDuration,
    tasksToday,
    costToday,
  });
});

// GET /api/stats/cost-by-day - Cost breakdown by day
app.get("/cost-by-day", async (c) => {
  const days = parseInt(c.req.query("days") ?? "7", 10);

  const result = await db
    .select({
      date: sql<string>`date(created_at)`,
      totalCost: sql<number>`sum(cost)`,
      totalTokens: sql<number>`sum(tokens)`,
    })
    .from(schema.costLog)
    .groupBy(sql`date(created_at)`)
    .orderBy(sql`date(created_at) desc`)
    .limit(days);

  return c.json(result);
});

export default app;

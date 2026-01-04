/**
 * Route aggregator
 */

import { Hono } from "hono";
import projects from "./projects.js";
import tasks from "./tasks.js";
import queue from "./queue.js";
import webhooks from "./webhooks.js";
import stats from "./stats.js";

const api = new Hono();

// Mount routes
api.route("/projects", projects);
api.route("/tasks", tasks);
api.route("/queue", queue);
api.route("/webhooks", webhooks);
api.route("/stats", stats);

export default api;

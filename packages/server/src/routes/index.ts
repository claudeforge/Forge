/**
 * Route aggregator
 */

import { Hono } from "hono";
import projects from "./projects.js";
import tasks from "./tasks.js";
import queue from "./queue.js";
import webhooks from "./webhooks.js";
import stats from "./stats.js";
import projectFiles from "./project-files.js";
import rules from "./rules.js";
import sync from "./sync.js";

const api = new Hono();

// Mount routes
api.route("/projects", projects);
api.route("/tasks", tasks);
api.route("/queue", queue);
api.route("/webhooks", webhooks);
api.route("/stats", stats);
api.route("/sync", sync);

// Project file access (specs, plans, task-defs)
api.route("/", projectFiles);

// Rules (templates and project rules)
api.route("/", rules);

export default api;

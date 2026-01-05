/**
 * Hono app configuration
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import api from "./routes/index.js";

// Create Hono app
const app = new Hono();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Web UI dist path (relative to server dist in production)
const webDistPath = process.env.WEB_DIST_PATH ?? join(__dirname, "../../web/dist");
const hasWebUI = existsSync(webDistPath);

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3344", "http://127.0.0.1:5173", "http://127.0.0.1:3344"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.route("/api", api);

// Serve static files for Web UI (production mode)
if (hasWebUI) {
  // Serve static assets
  app.use("/assets/*", serveStatic({ root: webDistPath }));
  app.use("/forge.svg", serveStatic({ root: webDistPath }));
}

/**
 * Setup SPA fallback - must be called AFTER all API routes including WebSocket
 * This ensures /api/* routes are handled by their respective handlers first
 */
export function setupSPAFallback() {
  if (hasWebUI) {
    // SPA fallback - serve index.html for all non-API routes
    app.get("*", async (c) => {
      // Skip API routes - they should be handled by their own handlers
      if (c.req.path.startsWith("/api/")) {
        return c.json({ error: "Not found" }, 404);
      }

      const indexPath = join(webDistPath, "index.html");
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, "utf-8");
        return c.html(html);
      }
      return c.json({ error: "Web UI not found" }, 404);
    });
  }
}

// 404 handler (only for API routes when Web UI is enabled)
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export { app, hasWebUI };

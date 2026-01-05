/**
 * FORGE Control Center Server
 */

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { app, hasWebUI, setupSPAFallback } from "./app.js";
import { config } from "./config.js";
import { initializeDatabase } from "./db/index.js";
import { createWSHandler } from "./ws/handler.js";
import { startWatchingAllProjects, stopAllWatchers } from "./watcher.js";

// Initialize database
console.log("[FORGE] Initializing database...");
initializeDatabase();

// Setup WebSocket
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Add WebSocket route
app.get(
  "/api/ws",
  upgradeWebSocket(() => createWSHandler())
);

// Setup SPA fallback AFTER WebSocket route
setupSPAFallback();

// Start server
const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  },
  () => {
    const baseUrl = `http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`;

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   FORGE Control Center                                    ║
║                                                           ║
║   API Server: ${baseUrl.padEnd(39)}  ║
║   WebSocket:  ws://${(config.host === "0.0.0.0" ? "localhost" : config.host)}:${config.port}/api/ws${" ".repeat(19)}║
║                                                           ║${hasWebUI ? `
║   Web UI:     ${baseUrl.padEnd(39)}  ║` : `
║   Web UI:     http://localhost:5173 (run pnpm dev:web)    ║`}
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
  }
);

// Inject WebSocket support
injectWebSocket(server);

// Start project file watchers
startWatchingAllProjects();

// Handle shutdown
process.on("SIGINT", () => {
  console.log("\n[FORGE] Shutting down...");
  stopAllWatchers();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[FORGE] Shutting down...");
  stopAllWatchers();
  process.exit(0);
});

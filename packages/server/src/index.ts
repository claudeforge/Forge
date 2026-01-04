/**
 * FORGE Control Center Server
 */

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { app } from "./app.js";
import { config } from "./config.js";
import { initializeDatabase } from "./db/index.js";
import { createWSHandler } from "./ws/handler.js";

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

// Start server
const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  },
  () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   FORGE Control Center                                ║
║                                                       ║
║   Server running at: http://${config.host}:${config.port}       ║
║   WebSocket at: ws://${config.host}:${config.port}/api/ws       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
  }
);

// Inject WebSocket support
injectWebSocket(server);

// Handle shutdown
process.on("SIGINT", () => {
  console.log("\n[FORGE] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[FORGE] Shutting down...");
  process.exit(0);
});

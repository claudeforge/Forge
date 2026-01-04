/**
 * WebSocket connection handler
 */

import type { WSContext, WSEvents } from "hono/ws";
import { generateId } from "@claudeforge/forge-shared/utils";
import { addClient, removeClient } from "../broadcast.js";

/**
 * Create WebSocket event handlers
 */
export function createWSHandler(): WSEvents {
  return {
    onOpen(_event, ws) {
      const clientId = generateId();

      // Store client reference
      addClient(clientId, ws as unknown as WSContext);

      // Send connected message
      ws.send(
        JSON.stringify({
          type: "connected",
          clientId,
        })
      );

      console.log(`[WS] Client connected: ${clientId}`);
    },

    onMessage(event, ws) {
      // Handle incoming messages if needed
      try {
        const data = JSON.parse(String(event.data));
        console.log("[WS] Message received:", data);

        // Echo back for now
        ws.send(
          JSON.stringify({
            type: "ack",
            received: data,
          })
        );
      } catch {
        // Invalid JSON, ignore
      }
    },

    onClose(_event, ws) {
      // Find and remove client
      // Note: We'd need to track clientId -> ws mapping better
      console.log("[WS] Client disconnected");
    },

    onError(event) {
      console.error("[WS] Error:", event);
    },
  };
}

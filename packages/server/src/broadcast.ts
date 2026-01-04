/**
 * WebSocket broadcast utility
 */

import type { WSContext } from "hono/ws";

// Connected clients
const clients = new Map<string, WSContext>();

/**
 * Add a client connection
 */
export function addClient(id: string, ws: WSContext): void {
  clients.set(id, ws);
}

/**
 * Remove a client connection
 */
export function removeClient(id: string): void {
  clients.delete(id);
}

/**
 * Get number of connected clients
 */
export function getClientCount(): number {
  return clients.size;
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(message: object): void {
  const data = JSON.stringify(message);
  for (const [id, ws] of clients) {
    try {
      ws.send(data);
    } catch {
      // Client disconnected, remove it
      clients.delete(id);
    }
  }
}

/**
 * Send message to specific client
 */
export function sendToClient(clientId: string, message: object): boolean {
  const ws = clients.get(clientId);
  if (!ws) return false;

  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch {
    clients.delete(clientId);
    return false;
  }
}

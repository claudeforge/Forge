/**
 * Real-time WebSocket updates hook
 * Automatically invalidates React Query caches when server sends updates
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.DEV
      ? "ws://127.0.0.1:3344/api/ws"
      : `ws://${window.location.host}/api/ws`;

    const connect = () => {
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Realtime] WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("[Realtime] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[Realtime] WebSocket disconnected, reconnecting in 3s...");
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("[Realtime] WebSocket error:", error);
      };
    };

    const handleMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        // Queue updates
        case "queue:update":
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          break;

        // Task updates
        case "task:update":
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          // If task has iterations, invalidate those too
          if (message.task && typeof message.task === "object" && "id" in message.task) {
            queryClient.invalidateQueries({ queryKey: ["iterations", (message.task as { id: string }).id] });
          }
          break;

        // Task created
        case "task:created":
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          break;

        // Task deleted
        case "task:deleted":
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          break;

        // Execution updates (task progress)
        case "execution:update":
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          // Also update task-specific data if taskId provided
          if (message.execution && typeof message.execution === "object" && "taskId" in message.execution) {
            const execution = message.execution as { taskId: string };
            queryClient.invalidateQueries({ queryKey: ["task", execution.taskId] });
            queryClient.invalidateQueries({ queryKey: ["iterations", execution.taskId] });
          }
          break;

        // Project updates
        case "project:update":
        case "project:created":
        case "project:deleted":
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          break;

        // Spec/Plan updates
        case "spec:update":
        case "spec:created":
          queryClient.invalidateQueries({ queryKey: ["specs"] });
          break;

        case "plan:update":
        case "plan:created":
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          break;

        // Task definition updates
        case "taskdef:update":
        case "taskdef:created":
          queryClient.invalidateQueries({ queryKey: ["taskDefs"] });
          queryClient.invalidateQueries({ queryKey: ["specs"] }); // Specs include task counts
          break;

        // Iteration completed
        case "iteration:completed":
          if (message.taskId) {
            queryClient.invalidateQueries({ queryKey: ["iterations", message.taskId] });
          }
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          break;

        // Generic refresh (force all)
        case "refresh:all":
          queryClient.invalidateQueries();
          break;
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);
}

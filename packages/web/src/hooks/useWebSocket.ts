/**
 * WebSocket hook for real-time updates
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

// Store for execution updates (reactive)
let executionListeners: ((data: ExecutionUpdate | null) => void)[] = [];
let currentExecution: ExecutionUpdate | null = null;

export interface ExecutionUpdate {
  projectId: string;
  taskId?: string;
  taskName?: string;
  status: "idle" | "running" | "paused" | "completed" | "failed" | "stuck";
  iteration?: number;
  maxIterations?: number;
  criteria?: Array<{
    name: string;
    type: string;
    passed: boolean;
    required: boolean;
  }>;
  stuckDetection?: {
    isStuck: boolean;
    pattern?: string;
    suggestion?: string;
  };
  error?: string;
  metrics?: {
    totalTokens: number;
    totalDuration: number;
    filesCreated: string[];
    filesModified: string[];
  };
}

export function subscribeToExecution(listener: (data: ExecutionUpdate | null) => void) {
  executionListeners.push(listener);
  // Send current state immediately
  listener(currentExecution);
  return () => {
    executionListeners = executionListeners.filter((l) => l !== listener);
  };
}

function notifyExecutionListeners(data: ExecutionUpdate | null) {
  currentExecution = data;
  executionListeners.forEach((l) => l(data));
}

export function useExecution() {
  const [execution, setExecution] = useState<ExecutionUpdate | null>(null);

  useEffect(() => {
    return subscribeToExecution(setExecution);
  }, []);

  return execution;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // In development, connect directly to API server to avoid proxy issues
    const isDev = import.meta.env.DEV;
    // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
    const host = isDev ? "127.0.0.1:3344" : window.location.host;
    const wsUrl = `${protocol}//${host}/api/ws`;

    console.log("[WS] Connecting to:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch {
        console.error("[WS] Failed to parse message");
      }
    };

    ws.onclose = () => {
      console.log("[WS] Disconnected");
      setIsConnected(false);

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("[WS] Reconnecting...");
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error("[WS] Error:", error);
    };
  }, []);

  const handleMessage = useCallback(
    (message: WSMessage) => {
      switch (message.type) {
        case "connected":
          console.log("[WS] Client ID:", message.clientId);
          break;

        case "task:update":
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          break;

        case "queue:update":
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          break;

        case "iteration":
          queryClient.invalidateQueries({
            queryKey: ["iterations", message.taskId],
          });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          break;

        case "execution:update":
          // Real-time execution status from file watcher
          notifyExecutionListeners(message.execution as ExecutionUpdate);
          queryClient.invalidateQueries({ queryKey: ["queue"] });
          break;
      }
    },
    [queryClient]
  );

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected };
}

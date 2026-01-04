/**
 * WebSocket hook for real-time updates
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WSMessage {
  type: string;
  [key: string]: unknown;
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
    const host = isDev ? "localhost:3344" : window.location.host;
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

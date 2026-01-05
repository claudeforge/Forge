/**
 * Task Notification Listener - Listens to WebSocket events and shows notifications
 */

import { useEffect, useRef } from "react";
import { useNotifications } from "./NotificationProvider";

interface ExecutionUpdate {
  projectId: string;
  status: string;
  taskId?: string;
  taskName?: string;
  iteration?: number;
  error?: string;
  stuckDetection?: {
    isStuck: boolean;
    pattern?: string;
    suggestion?: string;
  };
}

interface TaskUpdate {
  id: string;
  name: string;
  status: string;
  projectId: string;
}

export function TaskNotificationListener() {
  const { addNotification, showBrowserNotification } = useNotifications();
  const wsRef = useRef<WebSocket | null>(null);
  const lastStatusRef = useRef<Map<string, string>>(new Map());

  // Note: Browser notification permission must be requested from a user gesture (click handler)
  // The showBrowserNotification function will silently skip if permission isn't granted

  useEffect(() => {
    // Connect to WebSocket
    const wsUrl = import.meta.env.DEV
      ? "ws://127.0.0.1:3344/api/ws"
      : `ws://${window.location.host}/api/ws`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Notifications] WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("[Notifications] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log("[Notifications] WebSocket disconnected, reconnecting...");
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("[Notifications] WebSocket error:", error);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleMessage = (message: { type: string; [key: string]: unknown }) => {
    switch (message.type) {
      case "execution:update":
        handleExecutionUpdate(message.execution as ExecutionUpdate);
        break;
      case "task:update":
        handleTaskUpdate(message.task as TaskUpdate);
        break;
    }
  };

  const handleExecutionUpdate = (execution: ExecutionUpdate) => {
    const taskKey = execution.taskId || execution.projectId;
    const lastStatus = lastStatusRef.current.get(taskKey);

    // Check for stuck detection
    if (execution.stuckDetection?.isStuck && lastStatus !== "stuck") {
      addNotification({
        type: "warning",
        title: "Task Stuck",
        message: execution.taskName
          ? `"${execution.taskName}" appears to be stuck. ${execution.stuckDetection.suggestion || ""}`
          : "A task appears to be stuck",
        duration: 0, // Persistent until dismissed
      });

      showBrowserNotification("Task Stuck", {
        body: execution.taskName || "A task appears to be stuck",
        tag: `stuck-${taskKey}`,
      });
    }

    // Check for errors
    if (execution.error && lastStatus !== "error") {
      addNotification({
        type: "error",
        title: "Task Error",
        message: execution.taskName
          ? `"${execution.taskName}": ${execution.error}`
          : execution.error,
        duration: 0,
      });

      showBrowserNotification("Task Error", {
        body: execution.error,
        tag: `error-${taskKey}`,
      });
    }

    lastStatusRef.current.set(taskKey, execution.status);
  };

  const handleTaskUpdate = (task: TaskUpdate) => {
    const lastStatus = lastStatusRef.current.get(task.id);

    // Only notify on status changes
    if (lastStatus === task.status) return;

    // Task completed
    if (task.status === "completed" && lastStatus !== "completed") {
      addNotification({
        type: "success",
        title: "Task Completed",
        message: task.name,
        duration: 5000,
      });

      showBrowserNotification("Task Completed", {
        body: task.name,
        tag: `completed-${task.id}`,
      });
    }

    // Task failed
    if (task.status === "failed" && lastStatus !== "failed") {
      addNotification({
        type: "error",
        title: "Task Failed",
        message: task.name,
        duration: 0, // Persistent
      });

      showBrowserNotification("Task Failed", {
        body: task.name,
        tag: `failed-${task.id}`,
      });
    }

    lastStatusRef.current.set(task.id, task.status);
  };

  // This component doesn't render anything
  return null;
}

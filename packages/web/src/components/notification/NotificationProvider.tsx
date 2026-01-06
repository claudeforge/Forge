/**
 * Notification Provider - Manages browser and toast notifications
 */

import { createContext, useContext, useCallback, useState, useEffect, useRef } from "react";
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "../../lib/utils";

// Notification types
export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  requestBrowserPermission: () => Promise<boolean>;
  showBrowserNotification: (title: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Toast component
function Toast({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />,
    error: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
    info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  };

  const bgColors = {
    success: "bg-green-500/10 border-green-500/30",
    error: "bg-red-500/10 border-red-500/30",
    warning: "bg-yellow-500/10 border-yellow-500/30",
    info: "bg-blue-500/10 border-blue-500/30",
  };

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(onClose, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, onClose]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm",
        "animate-in slide-in-from-right-5 fade-in duration-200",
        "bg-white/90 dark:bg-gray-800/90",
        bgColors[notification.type]
      )}
    >
      {icons[notification.type]}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</h4>
        {notification.message && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{notification.message}</p>
        )}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="mt-2 text-sm text-forge-500 hover:text-forge-400"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Toast container
function ToastContainer({ notifications, removeNotification }: {
  notifications: Notification[];
  removeNotification: (id: string) => void;
}) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}

// Provider component
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");
  const idCounter = useRef(0);

  // Check browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, "id">) => {
    const id = `notification-${++idCounter.current}`;
    setNotifications((prev) => [...prev, { ...notification, id }]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      setBrowserPermission("granted");
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      return permission === "granted";
    }

    return false;
  }, []);

  const showBrowserNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (browserPermission === "granted") {
      new Notification(title, {
        icon: "/forge-icon.png",
        badge: "/forge-icon.png",
        ...options,
      });
    }
  }, [browserPermission]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
        requestBrowserPermission,
        showBrowserNotification,
      }}
    >
      {children}
      <ToastContainer
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </NotificationContext.Provider>
  );
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

// Convenience functions
export function useToast() {
  const { addNotification } = useNotifications();

  return {
    success: (title: string, message?: string) =>
      addNotification({ type: "success", title, message, duration: 5000 }),
    error: (title: string, message?: string) =>
      addNotification({ type: "error", title, message, duration: 8000 }),
    warning: (title: string, message?: string) =>
      addNotification({ type: "warning", title, message, duration: 6000 }),
    info: (title: string, message?: string) =>
      addNotification({ type: "info", title, message, duration: 5000 }),
  };
}

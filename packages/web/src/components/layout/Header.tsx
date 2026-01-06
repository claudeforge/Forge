/**
 * Header component
 */

import { Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { ThemeToggle } from "../theme/ThemeToggle";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isConnected } = useWebSocket();

  return (
    <header className="h-16 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 transition-colors">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500 dark:text-green-400" />
              <span className="text-green-600 dark:text-green-400">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400">Disconnected</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

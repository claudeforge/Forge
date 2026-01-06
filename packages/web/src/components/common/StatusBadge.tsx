/**
 * Status badge component
 */

import { cn, getStatusColor } from "../../lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, className, size = "md" }: StatusBadgeProps) {
  const isRunning = status === "running";

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  const dotSize = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        sizeClasses[size],
        getStatusColor(status),
        className
      )}
    >
      {isRunning && (
        <span className={cn("relative flex", dotSize[size])}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className={cn("relative inline-flex rounded-full bg-green-500", dotSize[size])}></span>
        </span>
      )}
      {status}
    </span>
  );
}

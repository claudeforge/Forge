/**
 * Metric card component
 */

import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-gray-800 rounded-lg p-4 border border-gray-700",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-gray-400">{icon}</div>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-green-400" : "text-red-400"
            )}
          >
            {trend.isPositive ? "+" : "-"}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-sm text-gray-400 mt-1">{title}</p>
      </div>
    </div>
  );
}

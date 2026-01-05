/**
 * Task card component
 */

import { Clock, Hash } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";
import { formatRelativeTime, formatDuration } from "../../lib/utils";
import type { Task } from "../../lib/api";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const result = task.result ? JSON.parse(task.result) : null;

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-forge-500/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-white">{task.name}</h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {task.prompt}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-1">
          <Hash className="h-4 w-4" />
          <span>{task.iteration}</span>
        </div>
        {result?.metrics?.totalDuration && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(result.metrics.totalDuration / 1000)}</span>
          </div>
        )}
        <span className="ml-auto">{formatRelativeTime(task.createdAt)}</span>
      </div>
    </div>
  );
}

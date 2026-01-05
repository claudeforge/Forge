/**
 * Task card component with task type indicators
 */

import { Clock, Hash, FileCode, AlertTriangle, List } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";
import { formatRelativeTime, formatDuration } from "../../lib/utils";
import type { Task } from "../../lib/api";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onViewIterations?: () => void;
  showTypeIndicator?: boolean;
}

export function TaskCard({ task, onClick, onViewIterations, showTypeIndicator = true }: TaskCardProps) {
  const result = task.result ? JSON.parse(task.result) : null;
  
  // Parse config to check if YAML-linked
  let isYamlLinked = false;
  let taskDefId: string | null = null;
  try {
    const config = typeof task.config === "string" ? JSON.parse(task.config) : task.config;
    taskDefId = config?.taskDefId || null;
    isYamlLinked = !!taskDefId;
  } catch {
    // ignore
  }

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-forge-500/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{task.name}</h3>
            {showTypeIndicator && (
              isYamlLinked ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-forge-500/20 text-forge-400 border border-forge-500/30 flex-shrink-0">
                  <FileCode className="h-3 w-3" />
                  <span className="hidden sm:inline">YAML</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="hidden sm:inline">Raw</span>
                </span>
              )
            )}
          </div>
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
        {task.iteration > 0 && onViewIterations && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewIterations();
            }}
            className="flex items-center gap-1 text-forge-400 hover:text-forge-300 transition-colors"
            title="View iteration log"
          >
            <List className="h-4 w-4" />
            <span className="text-xs">Log</span>
          </button>
        )}
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

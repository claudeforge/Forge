/**
 * Task card component with task type indicators
 */

import { Clock, Hash, FileCode, AlertTriangle, List, Zap, Bug, RefreshCw, TestTube, FileText, Settings } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";
import { formatRelativeTime, formatDuration } from "../../lib/utils";
import type { Task, TaskType, TaskComplexity } from "../../lib/api";

// Type icons and colors
const typeConfig: Record<TaskType, { icon: typeof Zap; color: string; label: string }> = {
  feature: { icon: Zap, color: "text-blue-400 bg-blue-500/20 border-blue-500/30", label: "Feature" },
  bugfix: { icon: Bug, color: "text-red-400 bg-red-500/20 border-red-500/30", label: "Bug" },
  refactor: { icon: RefreshCw, color: "text-purple-400 bg-purple-500/20 border-purple-500/30", label: "Refactor" },
  test: { icon: TestTube, color: "text-green-400 bg-green-500/20 border-green-500/30", label: "Test" },
  docs: { icon: FileText, color: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30", label: "Docs" },
  chore: { icon: Settings, color: "text-gray-400 bg-gray-500/20 border-gray-500/30", label: "Chore" },
};

// Complexity colors
const complexityConfig: Record<TaskComplexity, { color: string; label: string }> = {
  low: { color: "text-green-400", label: "Low" },
  medium: { color: "text-yellow-400", label: "Med" },
  high: { color: "text-red-400", label: "High" },
};

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onViewIterations?: () => void;
  showTypeIndicator?: boolean;
  compact?: boolean;
}

export function TaskCard({ task, onClick, onViewIterations, showTypeIndicator = true, compact = false }: TaskCardProps) {
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

  // Get type and complexity config
  const typeInfo = task.taskType ? typeConfig[task.taskType] : null;
  const complexityInfo = task.complexity ? complexityConfig[task.complexity] : null;
  const TypeIcon = typeInfo?.icon;

  // Compact view for tree/nested displays
  if (compact) {
    return (
      <div
        onClick={onClick}
        className="bg-gray-800 border border-gray-700 rounded-lg p-2 hover:border-forge-500/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} size="sm" />
          {TypeIcon && (
            <TypeIcon className={`h-3 w-3 ${typeInfo.color.split(" ")[0]}`} />
          )}
          <span className="text-sm text-white truncate flex-1">{task.name}</span>
          {complexityInfo && (
            <span className={`text-[10px] ${complexityInfo.color}`}>{complexityInfo.label}</span>
          )}
          {task.iteration > 0 && (
            <span className="text-xs text-gray-500">#{task.iteration}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-forge-500/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-white truncate">{task.name}</h3>
            {/* Task Type Badge */}
            {typeInfo && TypeIcon && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${typeInfo.color}`}>
                <TypeIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{typeInfo.label}</span>
              </span>
            )}
            {/* Complexity Badge */}
            {complexityInfo && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 flex-shrink-0 ${complexityInfo.color}`}>
                {complexityInfo.label}
              </span>
            )}
            {/* YAML/Raw indicator */}
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

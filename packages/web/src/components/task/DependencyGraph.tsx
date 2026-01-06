/**
 * Task Dependency Graph - Visual representation of task dependencies
 */

import { useMemo } from "react";
import {
  ArrowRight,
  CheckCircle,
  Circle,
  XCircle,
  Clock,
  Loader2,
  Lock,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { TaskDef } from "../../lib/api";

interface DependencyGraphProps {
  tasks: TaskDef[];
  onTaskClick?: (taskId: string) => void;
}

interface TaskNode {
  task: TaskDef;
  level: number;
  dependsOn: string[];
  blocks: string[];
}

export function DependencyGraph({ tasks, onTaskClick }: DependencyGraphProps) {
  // Build dependency graph and calculate levels
  const { levels } = useMemo(() => {
    const taskMap = new Map<string, TaskDef>();
    tasks.forEach((t) => taskMap.set(t.id, t));

    // Calculate level for each task (longest path from root)
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    function calculateLevel(taskId: string): number {
      if (levels.has(taskId)) return levels.get(taskId)!;
      if (visited.has(taskId)) return 0; // Circular dependency guard

      visited.add(taskId);
      const task = taskMap.get(taskId);
      if (!task) return 0;

      const deps = task.depends_on || [];
      if (deps.length === 0) {
        levels.set(taskId, 0);
        return 0;
      }

      const maxDepLevel = Math.max(...deps.map((d) => calculateLevel(d)));
      const level = maxDepLevel + 1;
      levels.set(taskId, level);
      return level;
    }

    tasks.forEach((t) => calculateLevel(t.id));

    // Group tasks by level
    const levelGroups = new Map<number, TaskNode[]>();
    const nodes: TaskNode[] = [];

    tasks.forEach((task) => {
      const level = levels.get(task.id) || 0;
      const node: TaskNode = {
        task,
        level,
        dependsOn: task.depends_on || [],
        blocks: task.blocks || [],
      };
      nodes.push(node);

      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(node);
    });

    return { nodes, levels: levelGroups };
  }, [tasks]);

  const getStatusConfig = (status: string) => {
    const config: Record<
      string,
      { icon: React.ReactNode; color: string; bg: string }
    > = {
      completed: {
        icon: <CheckCircle className="h-4 w-4" />,
        color: "text-green-600 dark:text-green-400",
        bg: "bg-green-500/10 border-green-500/30",
      },
      running: {
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/30",
      },
      failed: {
        icon: <XCircle className="h-4 w-4" />,
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-500/10 border-red-500/30",
      },
      queued: {
        icon: <Clock className="h-4 w-4" />,
        color: "text-yellow-600 dark:text-yellow-400",
        bg: "bg-yellow-500/10 border-yellow-500/30",
      },
      blocked: {
        icon: <Lock className="h-4 w-4" />,
        color: "text-orange-600 dark:text-orange-400",
        bg: "bg-orange-500/10 border-orange-500/30",
      },
      pending: {
        icon: <Circle className="h-4 w-4" />,
        color: "text-gray-600 dark:text-gray-400",
        bg: "bg-gray-500/10 border-gray-500/30",
      },
    };
    return (
      config[status] || {
        icon: <Circle className="h-4 w-4" />,
        color: "text-gray-600 dark:text-gray-400",
        bg: "bg-gray-500/10 border-gray-500/30",
      }
    );
  };

  const getComplexityBadge = (complexity: string): { color: string; label: string } => {
    const config: Record<string, { color: string; label: string }> = {
      low: { color: "bg-green-500/20 text-green-600 dark:text-green-400", label: "Low" },
      medium: { color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400", label: "Med" },
      high: { color: "bg-red-500/20 text-red-600 dark:text-red-400", label: "High" },
    };
    return config[complexity] ?? { color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400", label: "Med" };
  };

  // Get max level for column layout
  const maxLevel = Math.max(...Array.from(levels.keys()), 0);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Dependency Graph</h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
          <span className="text-gray-500 dark:text-gray-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <span className="text-gray-500 dark:text-gray-400">Running</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          <span className="text-gray-500 dark:text-gray-400">Queued</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          <span className="text-gray-500 dark:text-gray-400">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
          <span className="text-gray-500 dark:text-gray-400">Failed</span>
        </div>
      </div>

      {/* Graph - Levels as columns */}
      <div className="overflow-x-auto">
        <div
          className="flex gap-8 min-w-max"
          style={{ minHeight: `${Math.max(...Array.from(levels.values()).map((l) => l.length)) * 80 + 40}px` }}
        >
          {Array.from({ length: maxLevel + 1 }).map((_, levelIndex) => {
            const levelTasks = levels.get(levelIndex) || [];
            return (
              <div key={levelIndex} className="flex flex-col gap-4">
                {/* Level Header */}
                <div className="text-xs font-medium text-gray-500 dark:text-gray-500 text-center pb-2 border-b border-gray-200 dark:border-gray-700">
                  {levelIndex === 0 ? "Start" : `Phase ${levelIndex}`}
                </div>

                {/* Tasks at this level */}
                {levelTasks.map((node) => {
                  const statusConfig = getStatusConfig(node.task.status);
                  const complexityBadge = getComplexityBadge(node.task.complexity);

                  return (
                    <div key={node.task.id} className="relative">
                      {/* Task Node */}
                      <button
                        onClick={() => onTaskClick?.(node.task.id)}
                        className={cn(
                          "w-48 p-3 rounded-lg border transition-all hover:scale-105",
                          statusConfig.bg,
                          "cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={statusConfig.color}>
                            {statusConfig.icon}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium text-sm truncate">
                            {node.task.id}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded ml-auto",
                              complexityBadge.color
                            )}
                          >
                            {complexityBadge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {node.task.title}
                        </p>

                        {/* Dependencies indicator */}
                        {node.dependsOn.length > 0 && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                            <span>←</span>
                            <span>{node.dependsOn.join(", ")}</span>
                          </div>
                        )}
                      </button>

                      {/* Arrow to next level */}
                      {levelIndex < maxLevel && node.blocks.length > 0 && (
                        <div className="absolute right-0 top-1/2 transform translate-x-4 -translate-y-1/2 text-gray-400 dark:text-gray-600">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-6 text-sm">
        <span className="text-gray-500 dark:text-gray-400">
          Total:{" "}
          <span className="text-gray-900 dark:text-white font-medium">{tasks.length} tasks</span>
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Phases:{" "}
          <span className="text-gray-900 dark:text-white font-medium">{maxLevel + 1}</span>
        </span>
        <span className="text-green-600 dark:text-green-400">
          Completed:{" "}
          <span className="font-medium">
            {tasks.filter((t) => t.status === "completed").length}
          </span>
        </span>
        <span className="text-yellow-600 dark:text-yellow-400">
          Remaining:{" "}
          <span className="font-medium">
            {tasks.filter((t) => t.status !== "completed" && t.status !== "failed").length}
          </span>
        </span>
      </div>
    </div>
  );
}

/**
 * ExecutionMonitor - Real-time execution status display
 * Shows criteria pass/fail, stuck detection, errors, and file changes
 */

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FilePlus,
  Edit3,
  Zap,
  Clock,
  AlertOctagon,
} from "lucide-react";
import { useExecution } from "../../hooks/useWebSocket";
import { cn } from "../../lib/utils";

export function ExecutionMonitor() {
  const execution = useExecution();

  if (!execution || execution.status === "idle") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Activity className="h-5 w-5" />
          <span className="font-medium">Execution Monitor</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          No active task. Start a task with /forge:forge
        </p>
      </div>
    );
  }

  const passedCount = execution.criteria?.filter((c) => c.passed).length ?? 0;
  const totalCriteria = execution.criteria?.length ?? 0;
  const requiredFailed = execution.criteria?.filter((c) => c.required && !c.passed) ?? [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={cn(
              "h-5 w-5",
              execution.status === "running" && "text-yellow-600 dark:text-yellow-400 animate-pulse",
              execution.status === "completed" && "text-green-600 dark:text-green-400",
              execution.status === "failed" && "text-red-600 dark:text-red-400",
              execution.status === "stuck" && "text-orange-600 dark:text-orange-400"
            )} />
            <span className="font-medium text-gray-900 dark:text-white">Execution Monitor</span>
          </div>
          <StatusBadge status={execution.status} />
        </div>
        {execution.taskName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{execution.taskName}</p>
        )}
      </div>

      {/* Iteration Progress */}
      {execution.iteration !== undefined && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-gray-400">Iteration Progress</span>
            <span className="text-gray-900 dark:text-white">
              {execution.iteration} / {execution.maxIterations ?? "?"}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                execution.status === "stuck" ? "bg-orange-500" : "bg-forge-500"
              )}
              style={{
                width: `${((execution.iteration ?? 0) / (execution.maxIterations ?? 30)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Stuck Detection Alert */}
      {execution.stuckDetection?.isStuck && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-orange-500/10">
          <div className="flex items-start gap-3">
            <AlertOctagon className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-400">
                Stuck Detected: {execution.stuckDetection.pattern}
              </p>
              {execution.stuckDetection.suggestion && (
                <p className="text-xs text-orange-300 mt-1">
                  {execution.stuckDetection.suggestion}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {execution.error && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Error</p>
              <p className="text-xs text-red-300 mt-1 font-mono">
                {execution.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Criteria Status */}
      {execution.criteria && execution.criteria.length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Completion Criteria</span>
            <span className={cn(
              "text-sm font-medium",
              passedCount === totalCriteria ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
            )}>
              {passedCount}/{totalCriteria} passed
            </span>
          </div>
          <div className="space-y-2">
            {execution.criteria.map((criterion, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-2 text-sm p-2 rounded",
                  criterion.passed
                    ? "bg-green-500/10 text-green-400"
                    : criterion.required
                    ? "bg-red-500/10 text-red-400"
                    : "bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400"
                )}
              >
                {criterion.passed ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                )}
                <span className="flex-1">{criterion.name}</span>
                <span className="text-xs opacity-60">{criterion.type}</span>
                {criterion.required && !criterion.passed && (
                  <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded">
                    required
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Required criteria warning */}
          {requiredFailed.length > 0 && (
            <div className="mt-3 p-2 bg-red-500/10 rounded text-xs text-red-400">
              <strong>{requiredFailed.length} required criteria failing</strong> -
              Task cannot complete until these pass
            </div>
          )}
        </div>
      )}

      {/* File Changes */}
      {execution.metrics && (
        <div className="p-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 block mb-3">File Changes</span>
          <div className="space-y-2">
            {execution.metrics.filesCreated.length > 0 && (
              <div className="flex items-start gap-2">
                <FilePlus className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {execution.metrics.filesCreated.map((file, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-mono"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {execution.metrics.filesModified.length > 0 && (
              <div className="flex items-start gap-2">
                <Edit3 className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {execution.metrics.filesModified.map((file, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded font-mono"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {execution.metrics.filesCreated.length === 0 &&
              execution.metrics.filesModified.length === 0 && (
                <p className="text-xs text-gray-500">No file changes yet</p>
              )}
          </div>

          {/* Token usage */}
          {execution.metrics.totalTokens > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>{execution.metrics.totalTokens.toLocaleString()} tokens</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{Math.round(execution.metrics.totalDuration / 1000)}s</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    idle: { label: "Idle", className: "bg-gray-500/20 text-gray-600 dark:text-gray-400" },
    running: { label: "Running", className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
    paused: { label: "Paused", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
    completed: { label: "Completed", className: "bg-green-500/20 text-green-600 dark:text-green-400" },
    failed: { label: "Failed", className: "bg-red-500/20 text-red-600 dark:text-red-400" },
    stuck: { label: "Stuck", className: "bg-orange-500/20 text-orange-600 dark:text-orange-400" },
  };

  const statusConfig = config[status] ?? config.idle!;

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", statusConfig.className)}>
      {statusConfig.label}
    </span>
  );
}

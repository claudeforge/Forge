/**
 * Task Detail Modal - View comprehensive task details
 */

import { X, Clock, Hash, FileCode, AlertTriangle, Zap, Bug, RefreshCw, TestTube, FileText, Settings, CheckCircle, XCircle, Play, Calendar, FileEdit, FilePlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "../common/StatusBadge";
import { formatRelativeTime, formatDuration } from "../../lib/utils";
import { api } from "../../lib/api";
import type { Task, TaskType, TaskComplexity, Iteration } from "../../lib/api";

// Type icons and colors (matching TaskCard)
const typeConfig: Record<TaskType, { icon: typeof Zap; color: string; label: string }> = {
  feature: { icon: Zap, color: "text-blue-400 bg-blue-500/20 border-blue-500/30", label: "Feature" },
  bugfix: { icon: Bug, color: "text-red-400 bg-red-500/20 border-red-500/30", label: "Bug Fix" },
  refactor: { icon: RefreshCw, color: "text-purple-400 bg-purple-500/20 border-purple-500/30", label: "Refactor" },
  test: { icon: TestTube, color: "text-green-400 bg-green-500/20 border-green-500/30", label: "Test" },
  docs: { icon: FileText, color: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30", label: "Documentation" },
  chore: { icon: Settings, color: "text-gray-400 bg-gray-500/20 border-gray-500/30", label: "Chore" },
};

// Complexity colors
const complexityConfig: Record<TaskComplexity, { color: string; bgColor: string; label: string }> = {
  low: { color: "text-green-400", bgColor: "bg-green-500/20", label: "Low Complexity" },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/20", label: "Medium Complexity" },
  high: { color: "text-red-400", bgColor: "bg-red-500/20", label: "High Complexity" },
};

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  projectName?: string;
}

export function TaskDetailModal({ task, onClose, projectName }: TaskDetailModalProps) {
  // Fetch iterations for this task
  const { data: iterations } = useQuery({
    queryKey: ["task-iterations", task.id],
    queryFn: () => api.getTaskIterations(task.id),
    enabled: task.iteration > 0,
  });

  // Parse result and config
  const result = task.result ? JSON.parse(task.result) : null;
  let config: Record<string, unknown> = {};
  try {
    config = typeof task.config === "string" ? JSON.parse(task.config) : task.config || {};
  } catch {
    // ignore
  }

  const typeInfo = task.taskType ? typeConfig[task.taskType] : null;
  const complexityInfo = task.complexity ? complexityConfig[task.complexity] : null;
  const TypeIcon = typeInfo?.icon;

  const isYamlLinked = !!config?.taskDefId;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-700">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusBadge status={task.status} />
              {typeInfo && TypeIcon && (
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${typeInfo.color}`}>
                  <TypeIcon className="h-3.5 w-3.5" />
                  {typeInfo.label}
                </span>
              )}
              {complexityInfo && (
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${complexityInfo.bgColor} ${complexityInfo.color}`}>
                  {complexityInfo.label}
                </span>
              )}
              {isYamlLinked ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-forge-500/20 text-forge-400 border border-forge-500/30">
                  <FileCode className="h-3 w-3" />
                  YAML Linked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="h-3 w-3" />
                  Raw Task
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold text-white">{task.name}</h2>
            {projectName && (
              <p className="text-sm text-gray-400 mt-1">Project: {projectName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Task Prompt */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Task Prompt</h3>
            <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
              {task.prompt}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Hash className="h-3.5 w-3.5" />
                Iterations
              </div>
              <p className="text-lg font-medium text-white">{task.iteration}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Play className="h-3.5 w-3.5" />
                Priority
              </div>
              <p className="text-lg font-medium text-white">{task.priority}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Calendar className="h-3.5 w-3.5" />
                Created
              </div>
              <p className="text-sm font-medium text-white">{formatRelativeTime(task.createdAt)}</p>
            </div>
            {result?.metrics?.totalDuration && (
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Duration
                </div>
                <p className="text-lg font-medium text-white">
                  {formatDuration(result.metrics.totalDuration / 1000)}
                </p>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Timeline</h3>
            <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-300">{new Date(task.createdAt).toLocaleString()}</span>
              </div>
              {task.startedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Started</span>
                  <span className="text-gray-300">{new Date(task.startedAt).toLocaleString()}</span>
                </div>
              )}
              {task.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed</span>
                  <span className="text-gray-300">{new Date(task.completedAt).toLocaleString()}</span>
                </div>
              )}
              {task.scheduledAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Scheduled</span>
                  <span className="text-gray-300">{new Date(task.scheduledAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Config Details */}
          {Object.keys(config).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Configuration</h3>
              <div className="bg-gray-900 rounded-lg p-4 text-sm">
                {typeof config.taskDefId === "string" && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Task Definition ID</span>
                    <span className="text-forge-400 font-mono">{config.taskDefId}</span>
                  </div>
                )}
                {typeof config.maxIterations === "number" && (
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Max Iterations</span>
                    <span className="text-gray-300">{config.maxIterations}</span>
                  </div>
                )}
                {Array.isArray(config.criteria) && config.criteria.length > 0 && (
                  <div className="mt-3">
                    <span className="text-gray-400 block mb-2">Success Criteria</span>
                    <ul className="space-y-1">
                      {(config.criteria as Array<{ type: string; name: string }>).map((criterion, i) => (
                        <li key={i} className="text-gray-300 flex items-center gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">{criterion.type}</span>
                          {criterion.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result (for completed/failed tasks) */}
          {result && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Result</h3>
              <div className="bg-gray-900 rounded-lg p-4 space-y-4">
                {/* Summary */}
                {result.summary && (
                  <div>
                    <span className="text-gray-400 text-xs block mb-1">Summary</span>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{result.summary}</p>
                  </div>
                )}

                {/* Metrics */}
                {result.metrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {result.metrics.totalIterations !== undefined && (
                      <div className="text-center">
                        <span className="text-gray-400 text-xs block">Iterations</span>
                        <span className="text-lg font-medium text-white">{result.metrics.totalIterations}</span>
                      </div>
                    )}
                    {result.metrics.totalDuration !== undefined && (
                      <div className="text-center">
                        <span className="text-gray-400 text-xs block">Duration</span>
                        <span className="text-lg font-medium text-white">{formatDuration(result.metrics.totalDuration / 1000)}</span>
                      </div>
                    )}
                    {result.metrics.inputTokens !== undefined && (
                      <div className="text-center">
                        <span className="text-gray-400 text-xs block">Input Tokens</span>
                        <span className="text-lg font-medium text-white">{result.metrics.inputTokens.toLocaleString()}</span>
                      </div>
                    )}
                    {result.metrics.outputTokens !== undefined && (
                      <div className="text-center">
                        <span className="text-gray-400 text-xs block">Output Tokens</span>
                        <span className="text-lg font-medium text-white">{result.metrics.outputTokens.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Files Created */}
                {result.filesCreated && result.filesCreated.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <FilePlus className="h-3.5 w-3.5" />
                      Files Created ({result.filesCreated.length})
                    </span>
                    <ul className="space-y-1 text-sm">
                      {result.filesCreated.map((file: string, i: number) => (
                        <li key={i} className="text-green-400 font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                          + {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Files Modified */}
                {result.filesModified && result.filesModified.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <FileEdit className="h-3.5 w-3.5" />
                      Files Modified ({result.filesModified.length})
                    </span>
                    <ul className="space-y-1 text-sm">
                      {result.filesModified.map((file: string, i: number) => (
                        <li key={i} className="text-yellow-400 font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                          ~ {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Failure Reason */}
                {result.failureReason && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <span className="text-red-400 text-xs flex items-center gap-1 mb-1">
                      <XCircle className="h-3.5 w-3.5" />
                      Failure Reason
                    </span>
                    <p className="text-red-300 text-sm">{result.failureReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Iteration History */}
          {iterations && iterations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Iteration History</h3>
              <div className="space-y-2">
                {iterations.map((iteration) => (
                  <IterationCard key={iteration.id} iteration={iteration} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function IterationCard({ iteration }: { iteration: Iteration }) {
  const isSuccess = iteration.outcome === "success";

  let criteriaResults: Array<{ name: string; passed: boolean; message?: string }> = [];
  try {
    criteriaResults = JSON.parse(iteration.criteriaResults || "[]");
  } catch {
    // ignore
  }

  return (
    <div className="bg-gray-900 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">#{iteration.iterationNum}</span>
          {isSuccess ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
              <CheckCircle className="h-3 w-3" />
              Success
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
              <XCircle className="h-3 w-3" />
              Failed
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(iteration.duration / 1000)}
          </span>
          <span>{iteration.tokens.toLocaleString()} tokens</span>
        </div>
      </div>

      {iteration.summary && (
        <p className="text-sm text-gray-300 mb-2">{iteration.summary}</p>
      )}

      {criteriaResults.length > 0 && (
        <div className="space-y-1">
          {criteriaResults.map((cr, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {cr.passed ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500" />
              )}
              <span className={cr.passed ? "text-gray-300" : "text-red-300"}>
                {cr.name}
              </span>
              {cr.message && (
                <span className="text-gray-500 truncate">- {cr.message}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

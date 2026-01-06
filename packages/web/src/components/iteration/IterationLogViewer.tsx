/**
 * Iteration Log Viewer - Shows detailed iteration history for a task
 */

import { useState } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  FileText,
} from "lucide-react";
import { useTaskIterations, useTask } from "../../hooks/useTasks";

interface IterationLogViewerProps {
  taskId: string;
  onClose: () => void;
}

interface CriterionResult {
  id?: string;
  name: string;
  type: string;
  passed: boolean;
  output?: string;
  duration?: number;
  required?: boolean;
}

export function IterationLogViewer({ taskId, onClose }: IterationLogViewerProps) {
  const { data: task } = useTask(taskId);
  const { data: iterations, isLoading } = useTaskIterations(taskId);
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(new Set());

  const toggleIteration = (num: number) => {
    setExpandedIterations((prev) => {
      const next = new Set(prev);
      if (next.has(num)) {
        next.delete(num);
      } else {
        next.add(num);
      }
      return next;
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
  };

  const getOutcomeConfig = (outcome: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      progress: {
        color: "text-green-600 dark:text-green-400",
        icon: <CheckCircle className="h-4 w-4" />,
        label: "Progress",
      },
      stuck: {
        color: "text-yellow-600 dark:text-yellow-400",
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Stuck",
      },
      error: {
        color: "text-red-600 dark:text-red-400",
        icon: <XCircle className="h-4 w-4" />,
        label: "Error",
      },
      "gate-failed": {
        color: "text-orange-600 dark:text-orange-400",
        icon: <XCircle className="h-4 w-4" />,
        label: "Gate Failed",
      },
    };
    return config[outcome] || { color: "text-gray-600 dark:text-gray-400", icon: null, label: outcome };
  };

  const parseCriteriaResults = (resultsJson: string): CriterionResult[] => {
    try {
      return JSON.parse(resultsJson) as CriterionResult[];
    } catch {
      return [];
    }
  };

  // Sort iterations by number descending (newest first)
  const sortedIterations = [...(iterations || [])].sort(
    (a, b) => b.iterationNum - a.iterationNum
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Iteration Log</h2>
            {task && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {task.name} - {iterations?.length || 0} iterations
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading iterations...</div>
          ) : sortedIterations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No iterations recorded yet</div>
          ) : (
            <div className="space-y-3">
              {sortedIterations.map((iteration) => {
                const isExpanded = expandedIterations.has(iteration.iterationNum);
                const outcomeConfig = getOutcomeConfig(iteration.outcome);
                const criteriaResults = parseCriteriaResults(iteration.criteriaResults);

                return (
                  <div
                    key={iteration.id}
                    className="bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Iteration Header */}
                    <button
                      onClick={() => toggleIteration(iteration.iterationNum)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        )}
                        <span className="text-gray-900 dark:text-white font-medium">
                          Iteration #{iteration.iterationNum}
                        </span>
                        <span className={`flex items-center gap-1 ${outcomeConfig.color}`}>
                          {outcomeConfig.icon}
                          <span className="text-sm">{outcomeConfig.label}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(iteration.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-4 w-4" />
                          {formatTokens(iteration.tokens)} tokens
                        </span>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                        {/* Summary */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Summary
                          </h4>
                          <p className="text-gray-600 dark:text-gray-300 text-sm bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-transparent">
                            {iteration.summary || "No summary available"}
                          </p>
                        </div>

                        {/* Criteria Results */}
                        {criteriaResults.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                              Criteria Results
                            </h4>
                            <div className="space-y-2">
                              {criteriaResults.map((criterion, idx) => (
                                <div
                                  key={criterion.id || idx}
                                  className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-transparent"
                                >
                                  <div className="flex items-center gap-2">
                                    {criterion.passed ? (
                                      <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                                    )}
                                    <span className="text-gray-600 dark:text-gray-300 text-sm">
                                      {criterion.name}
                                    </span>
                                    {criterion.required && (
                                      <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                                        Required
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="text-xs text-gray-500">
                                      {criterion.type}
                                    </span>
                                    {criterion.duration !== undefined && (
                                      <span>{(criterion.duration / 1000).toFixed(1)}s</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>
                            Started: {new Date(iteration.startedAt).toLocaleString()}
                          </span>
                          <span>
                            Ended: {new Date(iteration.endedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with summary */}
        {sortedIterations.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between text-sm">
              <div className="flex gap-6">
                <span className="text-gray-500 dark:text-gray-400">
                  Total Iterations:{" "}
                  <span className="text-gray-900 dark:text-white font-medium">{sortedIterations.length}</span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Total Duration:{" "}
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatDuration(
                      sortedIterations.reduce((sum, i) => sum + i.duration, 0)
                    )}
                  </span>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Total Tokens:{" "}
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formatTokens(sortedIterations.reduce((sum, i) => sum + i.tokens, 0))}
                  </span>
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-green-600 dark:text-green-400">
                  {sortedIterations.filter((i) => i.outcome === "progress").length} progress
                </span>
                <span className="text-yellow-600 dark:text-yellow-400">
                  {sortedIterations.filter((i) => i.outcome === "stuck").length} stuck
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {sortedIterations.filter((i) => i.outcome === "error").length} errors
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

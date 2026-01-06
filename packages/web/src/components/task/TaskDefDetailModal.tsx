/**
 * Task Definition Detail Modal - View comprehensive task definition details
 */

import { X, Clock, CheckCircle, XCircle, Zap, Bug, RefreshCw, TestTube, FileText, Settings, FileEdit, FilePlus, GitBranch, Target, AlertTriangle } from "lucide-react";
import type { TaskDef } from "../../lib/api";
import { cn } from "../../lib/utils";

// Type icons and colors
const typeConfig: Record<TaskDef["type"], { icon: typeof Zap; color: string; label: string }> = {
  feature: { icon: Zap, color: "text-blue-400 bg-blue-500/20 border-blue-500/30", label: "Feature" },
  bugfix: { icon: Bug, color: "text-red-400 bg-red-500/20 border-red-500/30", label: "Bug Fix" },
  refactor: { icon: RefreshCw, color: "text-purple-400 bg-purple-500/20 border-purple-500/30", label: "Refactor" },
  test: { icon: TestTube, color: "text-green-400 bg-green-500/20 border-green-500/30", label: "Test" },
  docs: { icon: FileText, color: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30", label: "Documentation" },
  chore: { icon: Settings, color: "text-gray-400 bg-gray-500/20 border-gray-500/30", label: "Chore" },
};

// Complexity colors
const complexityConfig: Record<TaskDef["complexity"], { color: string; bgColor: string; label: string }> = {
  low: { color: "text-green-400", bgColor: "bg-green-500/20", label: "Low Complexity" },
  medium: { color: "text-yellow-400", bgColor: "bg-yellow-500/20", label: "Medium Complexity" },
  high: { color: "text-red-400", bgColor: "bg-red-500/20", label: "High Complexity" },
};

// Status config
const statusConfig: Record<TaskDef["status"], { color: string; bgColor: string; label: string }> = {
  pending: { color: "text-gray-400", bgColor: "bg-gray-500/20", label: "Pending" },
  queued: { color: "text-blue-400", bgColor: "bg-blue-500/20", label: "Queued" },
  blocked: { color: "text-orange-400", bgColor: "bg-orange-500/20", label: "Blocked" },
  running: { color: "text-yellow-400", bgColor: "bg-yellow-500/20", label: "Running" },
  completed: { color: "text-green-400", bgColor: "bg-green-500/20", label: "Completed" },
  failed: { color: "text-red-400", bgColor: "bg-red-500/20", label: "Failed" },
  skipped: { color: "text-gray-400", bgColor: "bg-gray-500/20", label: "Skipped" },
};

interface TaskDefDetailModalProps {
  taskDef: TaskDef;
  onClose: () => void;
}

export function TaskDefDetailModal({ taskDef, onClose }: TaskDefDetailModalProps) {
  const typeInfo = typeConfig[taskDef.type];
  const complexityInfo = complexityConfig[taskDef.complexity];
  const statusInfo = statusConfig[taskDef.status];
  const TypeIcon = typeInfo.icon;

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
              <span className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-medium", statusInfo.bgColor, statusInfo.color)}>
                {statusInfo.label}
              </span>
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border", typeInfo.color)}>
                <TypeIcon className="h-3.5 w-3.5" />
                {typeInfo.label}
              </span>
              <span className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-medium", complexityInfo.bgColor, complexityInfo.color)}>
                {complexityInfo.label}
              </span>
              <span className="text-xs text-gray-500 font-mono">{taskDef.id}</span>
            </div>
            <h2 className="text-xl font-semibold text-white">{taskDef.title}</h2>
            {taskDef.spec_id && (
              <p className="text-sm text-gray-400 mt-1">Spec: {taskDef.spec_id}</p>
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
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
            <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap">
              {taskDef.description}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Target className="h-3.5 w-3.5" />
                Priority
              </div>
              <p className="text-lg font-medium text-white">{taskDef.priority}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Clock className="h-3.5 w-3.5" />
                Iterations
              </div>
              <p className="text-lg font-medium text-white">{taskDef.iterations}</p>
            </div>
            {taskDef.execution.max_iterations && (
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Max Iterations
                </div>
                <p className="text-lg font-medium text-white">{taskDef.execution.max_iterations}</p>
              </div>
            )}
            {taskDef.execution.timeout_minutes && (
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Timeout
                </div>
                <p className="text-lg font-medium text-white">{taskDef.execution.timeout_minutes}m</p>
              </div>
            )}
          </div>

          {/* Dependencies */}
          {(taskDef.depends_on.length > 0 || taskDef.blocks.length > 0) && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Dependencies
              </h3>
              <div className="bg-gray-900 rounded-lg p-4 space-y-3 text-sm">
                {taskDef.depends_on.length > 0 && (
                  <div>
                    <span className="text-gray-400 block mb-1">Depends on:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {taskDef.depends_on.map((dep) => (
                        <span key={dep} className="bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono text-xs">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {taskDef.blocks.length > 0 && (
                  <div>
                    <span className="text-gray-400 block mb-1">Blocks:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {taskDef.blocks.map((block) => (
                        <span key={block} className="bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono text-xs">
                          {block}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Goals */}
          {taskDef.goals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Goals
              </h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <ul className="space-y-2">
                  {taskDef.goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Technical Details */}
          {taskDef.technical && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Technical Details</h3>
              <div className="bg-gray-900 rounded-lg p-4 space-y-4">
                {taskDef.technical.approach && (
                  <div>
                    <span className="text-gray-400 text-xs block mb-1">Approach</span>
                    <p className="text-sm text-gray-300">{taskDef.technical.approach}</p>
                  </div>
                )}

                {taskDef.technical.files_to_create.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <FilePlus className="h-3.5 w-3.5" />
                      Files to Create ({taskDef.technical.files_to_create.length})
                    </span>
                    <ul className="space-y-1">
                      {taskDef.technical.files_to_create.map((file, i) => (
                        <li key={i} className="text-green-400 font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                          + {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {taskDef.technical.files_to_modify.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <FileEdit className="h-3.5 w-3.5" />
                      Files to Modify ({taskDef.technical.files_to_modify.length})
                    </span>
                    <ul className="space-y-1">
                      {taskDef.technical.files_to_modify.map((file, i) => (
                        <li key={i} className="text-yellow-400 font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                          ~ {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {taskDef.technical.considerations.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Considerations
                    </span>
                    <ul className="space-y-1">
                      {taskDef.technical.considerations.map((item, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-orange-400">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Criteria */}
          {taskDef.criteria.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Success Criteria</h3>
              <div className="bg-gray-900 rounded-lg p-4">
                <ul className="space-y-2">
                  {taskDef.criteria.map((criterion, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="h-4 w-4 text-gray-500" />
                      <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">{criterion.type}</span>
                      {criterion.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Timeline</h3>
            <div className="bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-300">{new Date(taskDef.created_at).toLocaleString()}</span>
              </div>
              {taskDef.queued_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Queued</span>
                  <span className="text-gray-300">{new Date(taskDef.queued_at).toLocaleString()}</span>
                </div>
              )}
              {taskDef.started_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Started</span>
                  <span className="text-gray-300">{new Date(taskDef.started_at).toLocaleString()}</span>
                </div>
              )}
              {taskDef.completed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed</span>
                  <span className="text-gray-300">{new Date(taskDef.completed_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Result (for completed/failed tasks) */}
          {taskDef.result && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Result</h3>
              <div className={cn(
                "rounded-lg p-4 space-y-4",
                taskDef.result.success ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
              )}>
                {/* Summary */}
                {taskDef.result.summary && (
                  <div>
                    <span className="text-gray-400 text-xs block mb-1">Summary</span>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{taskDef.result.summary}</p>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    <span className="text-gray-400 text-xs block">Iterations</span>
                    <span className="text-lg font-medium text-white">{taskDef.result.iterations}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-400 text-xs block">Duration</span>
                    <span className="text-lg font-medium text-white">{Math.round(taskDef.result.duration / 1000)}s</span>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-400 text-xs block">Tokens</span>
                    <span className="text-lg font-medium text-white">{taskDef.result.tokens.toLocaleString()}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-400 text-xs block">Status</span>
                    <span className={cn("text-lg font-medium", taskDef.result.success ? "text-green-400" : "text-red-400")}>
                      {taskDef.result.success ? "Success" : "Failed"}
                    </span>
                  </div>
                </div>

                {/* Files Created */}
                {taskDef.result.files_created.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <FilePlus className="h-3.5 w-3.5" />
                      Files Created ({taskDef.result.files_created.length})
                    </span>
                    <ul className="space-y-1">
                      {taskDef.result.files_created.map((file, i) => (
                        <li key={i} className="text-green-400 font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                          + {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Files Modified */}
                {taskDef.result.files_modified.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 mb-2">
                      <FileEdit className="h-3.5 w-3.5" />
                      Files Modified ({taskDef.result.files_modified.length})
                    </span>
                    <ul className="space-y-1">
                      {taskDef.result.files_modified.map((file, i) => (
                        <li key={i} className="text-yellow-400 font-mono text-xs bg-gray-800 px-2 py-1 rounded">
                          ~ {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Error */}
                {taskDef.result.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <span className="text-red-400 text-xs flex items-center gap-1 mb-1">
                      <XCircle className="h-3.5 w-3.5" />
                      Error
                    </span>
                    <p className="text-red-300 text-sm">{taskDef.result.error}</p>
                  </div>
                )}
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

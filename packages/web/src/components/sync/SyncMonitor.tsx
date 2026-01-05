/**
 * SyncMonitor Component
 *
 * Real-time monitoring of sync status, nodes, locks, and interventions.
 * Allows Control Center operators to monitor and intervene in task execution.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Server,
  Lock,
  AlertTriangle,
  RefreshCw,
  Pause,
  XCircle,
  RotateCcw,
  Unlock,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { api } from "../../lib/api";
import type { InterventionType } from "../../lib/api";

interface SyncMonitorProps {
  projectId: string;
}

export function SyncMonitor({ projectId }: SyncMonitorProps) {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [interventionReason, setInterventionReason] = useState("");

  // Fetch sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["sync-status", projectId],
    queryFn: () => api.getSyncStatus(projectId),
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch sync log
  const { data: syncLog } = useQuery({
    queryKey: ["sync-log", projectId],
    queryFn: () => api.getSyncLog(projectId, 20),
    refetchInterval: 10000,
  });

  // Fix expired locks mutation
  const fixLocksMutation = useMutation({
    mutationFn: () => api.fixExpiredLocks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });

  // Intervention mutation
  const interventionMutation = useMutation({
    mutationFn: (data: { type: InterventionType; taskId: string; reason: string; params?: Record<string, unknown> }) =>
      api.createIntervention({
        type: data.type,
        taskId: data.taskId,
        requestedBy: "control-center",
        reason: data.reason,
        params: data.params,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      setSelectedTaskId(null);
      setInterventionReason("");
    },
  });

  const handleIntervention = (type: InterventionType, taskId: string, params?: Record<string, unknown>) => {
    if (!interventionReason.trim()) {
      alert("Please provide a reason for the intervention");
      return;
    }
    interventionMutation.mutate({ type, taskId, reason: interventionReason, params });
  };

  if (statusLoading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const healthColors = {
    healthy: "text-green-400",
    degraded: "text-yellow-400",
    offline: "text-red-400",
  };

  const healthIcons = {
    healthy: <Wifi className="h-5 w-5" />,
    degraded: <AlertTriangle className="h-5 w-5" />,
    offline: <WifiOff className="h-5 w-5" />,
  };

  return (
    <div className="space-y-6">
      {/* Header with Health Status */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Sync Monitor</h2>
          </div>
          <div className={`flex items-center gap-2 ${healthColors[syncStatus?.health ?? "offline"]}`}>
            {healthIcons[syncStatus?.health ?? "offline"]}
            <span className="capitalize">{syncStatus?.health ?? "Unknown"}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-900 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">Total Tasks</div>
            <div className="text-white text-xl font-bold">{syncStatus?.stats.totalTasks ?? 0}</div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">Queued</div>
            <div className="text-blue-400 text-xl font-bold">{syncStatus?.stats.queued ?? 0}</div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">Running</div>
            <div className="text-yellow-400 text-xl font-bold">{syncStatus?.stats.running ?? 0}</div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">Completed</div>
            <div className="text-green-400 text-xl font-bold">{syncStatus?.stats.completed ?? 0}</div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">Failed</div>
            <div className="text-red-400 text-xl font-bold">{syncStatus?.stats.failed ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Connected Nodes */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-medium text-white">Connected Nodes</h3>
          <span className="text-xs text-gray-500">
            ({syncStatus?.nodes.filter((n) => n.isOnline).length ?? 0} online)
          </span>
        </div>

        {syncStatus?.nodes && syncStatus.nodes.length > 0 ? (
          <div className="space-y-2">
            {syncStatus.nodes.map((node) => (
              <div
                key={node.nodeId}
                className="flex items-center justify-between bg-gray-900 rounded p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      node.isOnline ? "bg-green-400" : "bg-gray-500"
                    }`}
                  />
                  <div>
                    <div className="text-white text-sm">
                      {node.displayName || node.nodeId.slice(0, 12)}
                    </div>
                    <div className="text-gray-500 text-xs">{node.nodeType}</div>
                  </div>
                </div>
                <div className="text-gray-400 text-xs">
                  {node.isOnline
                    ? "Online"
                    : `Last seen: ${new Date(node.lastSeen).toLocaleTimeString()}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">No nodes connected</div>
        )}
      </div>

      {/* Active Locks */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-white">Active Locks</h3>
            <span className="text-xs text-gray-500">
              ({syncStatus?.activeLocks.length ?? 0})
            </span>
          </div>
          <button
            onClick={() => fixLocksMutation.mutate()}
            disabled={fixLocksMutation.isPending}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
          >
            <RefreshCw className={`h-3 w-3 ${fixLocksMutation.isPending ? "animate-spin" : ""}`} />
            Fix Expired
          </button>
        </div>

        {syncStatus?.activeLocks && syncStatus.activeLocks.length > 0 ? (
          <div className="space-y-2">
            {syncStatus.activeLocks.map((lock) => {
              const expiresIn = Math.max(
                0,
                Math.floor((new Date(lock.expiresAt).getTime() - Date.now()) / 1000)
              );
              const isExpiringSoon = expiresIn < 60;

              return (
                <div
                  key={lock.taskId}
                  className="flex items-center justify-between bg-gray-900 rounded p-3"
                >
                  <div className="flex items-center gap-3">
                    <Lock className={`h-4 w-4 ${isExpiringSoon ? "text-yellow-400" : "text-blue-400"}`} />
                    <div>
                      <div className="text-white text-sm">{lock.taskId.slice(0, 8)}...</div>
                      <div className="text-gray-500 text-xs">
                        Locked by: {lock.lockedBy.slice(0, 12)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-xs ${isExpiringSoon ? "text-yellow-400" : "text-gray-400"}`}>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {expiresIn}s
                    </div>
                    <button
                      onClick={() => setSelectedTaskId(lock.taskId)}
                      className="p-1 hover:bg-gray-700 rounded"
                      title="Manage"
                    >
                      <Unlock className="h-4 w-4 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">No active locks</div>
        )}
      </div>

      {/* Stuck Tasks */}
      {syncStatus?.stuckTasks && syncStatus.stuckTasks.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-yellow-600 p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <h3 className="text-sm font-medium text-yellow-400">Stuck Tasks</h3>
          </div>

          <div className="space-y-2">
            {syncStatus.stuckTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between bg-gray-900 rounded p-3"
              >
                <div>
                  <div className="text-white text-sm">{task.name}</div>
                  <div className="text-gray-500 text-xs">
                    Started: {new Date(task.startedAt).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTaskId(task.id)}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-sm text-white"
                >
                  Intervene
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Log */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-medium text-white">Recent Sync Activity</h3>
        </div>

        {syncLog?.logs && syncLog.logs.length > 0 ? (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {syncLog.logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 text-xs py-1 border-b border-gray-700 last:border-0"
              >
                <span className="text-gray-500 w-20">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-blue-400 w-24 truncate">{log.nodeId.slice(0, 10)}</span>
                <span className="text-gray-300">{log.operation}</span>
                {log.taskId && (
                  <span className="text-gray-500">Task: {log.taskId.slice(0, 8)}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">No recent activity</div>
        )}
      </div>

      {/* Intervention Modal */}
      {selectedTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">
              Task Intervention
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Task ID: {selectedTaskId.slice(0, 12)}...
            </p>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Reason</label>
              <input
                type="text"
                value={interventionReason}
                onChange={(e) => setInterventionReason(e.target.value)}
                placeholder="Why are you intervening?"
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => handleIntervention("PAUSE", selectedTaskId)}
                disabled={interventionMutation.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-sm text-white"
              >
                <Pause className="h-4 w-4" />
                Pause
              </button>
              <button
                onClick={() => handleIntervention("ABORT", selectedTaskId)}
                disabled={interventionMutation.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm text-white"
              >
                <XCircle className="h-4 w-4" />
                Abort
              </button>
              <button
                onClick={() => handleIntervention("RELEASE_LOCK", selectedTaskId)}
                disabled={interventionMutation.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
              >
                <Unlock className="h-4 w-4" />
                Release Lock
              </button>
              <button
                onClick={() => handleIntervention("RETRY", selectedTaskId, { resetIteration: true })}
                disabled={interventionMutation.isPending}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 rounded text-sm text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedTaskId(null);
                  setInterventionReason("");
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

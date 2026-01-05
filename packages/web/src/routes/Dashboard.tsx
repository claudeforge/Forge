/**
 * Dashboard page
 */

import { useState } from "react";
import {
  ListTodo,
  CheckCircle,
  XCircle,
  Hash,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { MetricCard } from "../components/common/MetricCard";
import { TaskCard } from "../components/task/TaskCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { ExecutionMonitor } from "../components/execution/ExecutionMonitor";
import { IterationLogViewer } from "../components/iteration/IterationLogViewer";
import { SyncMonitor } from "../components/sync/SyncMonitor";
import { useStats, useQueue } from "../hooks/useStats";
import { useTasks } from "../hooks/useTasks";
import { useProjects } from "../hooks/useTasks";

export function Dashboard() {
  const { data: stats } = useStats();
  const { data: queue } = useQueue();
  const { data: tasks } = useTasks();
  const { data: projects } = useProjects();
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [showSyncMonitor, setShowSyncMonitor] = useState(false);

  const recentTasks = tasks?.slice(0, 5) ?? [];
  const activeProject = projects?.[0]; // Use first project as default

  return (
    <Layout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Tasks"
          value={stats?.totalTasks ?? 0}
          icon={<ListTodo className="h-5 w-5" />}
        />
        <MetricCard
          title="Completed"
          value={stats?.completedTasks ?? 0}
          icon={<CheckCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Failed"
          value={stats?.failedTasks ?? 0}
          icon={<XCircle className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Iterations"
          value={stats?.totalIterations ?? 0}
          icon={<Hash className="h-5 w-5" />}
        />
      </div>

      {/* Toggle for Sync Monitor */}
      {activeProject && (
        <div className="mb-4">
          <button
            onClick={() => setShowSyncMonitor(!showSyncMonitor)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              showSyncMonitor
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {showSyncMonitor ? "Hide Sync Monitor" : "Show Sync Monitor"}
          </button>
        </div>
      )}

      {/* Sync Monitor (collapsible) */}
      {showSyncMonitor && activeProject && (
        <div className="mb-8">
          <SyncMonitor projectId={activeProject.id} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Monitor - Real-time status */}
        <div className="lg:col-span-2">
          <ExecutionMonitor />
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Today's Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Tasks</span>
                <span className="text-white font-medium">
                  {stats?.tasksToday ?? 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Queue Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Queued</span>
                <span className="text-white font-medium">
                  {queue?.queued.length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <StatusBadge
                  status={queue?.isPaused ? "paused" : "running"}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Tasks</h2>
        <div className="space-y-3">
          {recentTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onViewIterations={() => setViewingTaskId(task.id)}
            />
          ))}
          {recentTasks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No tasks yet
            </div>
          )}
        </div>
      </div>

      {/* Iteration Log Viewer Modal */}
      {viewingTaskId && (
        <IterationLogViewer
          taskId={viewingTaskId}
          onClose={() => setViewingTaskId(null)}
        />
      )}
    </Layout>
  );
}

/**
 * Dashboard page
 */

import {
  ListTodo,
  CheckCircle,
  XCircle,
  Hash,
  TrendingUp,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { MetricCard } from "../components/common/MetricCard";
import { TaskCard } from "../components/task/TaskCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { useStats, useQueue } from "../hooks/useStats";
import { useTasks } from "../hooks/useTasks";
import { formatCost } from "../lib/utils";

export function Dashboard() {
  const { data: stats } = useStats();
  const { data: queue } = useQueue();
  const { data: tasks } = useTasks();

  const recentTasks = tasks?.slice(0, 5) ?? [];

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Running Task */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-forge-500" />
              Current Task
            </h2>

            {queue?.running ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-white">
                      {queue.running.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {queue.running.prompt}
                    </p>
                  </div>
                  <StatusBadge status={queue.running.status} />
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Hash className="h-4 w-4" />
                    <span>Iteration {queue.running.iteration}</span>
                  </div>
                </div>

                {/* Progress bar placeholder */}
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-forge-500 h-2 rounded-full animate-pulse-forge"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No task currently running
              </div>
            )}
          </div>
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
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cost</span>
                <span className="text-white font-medium">
                  {formatCost(stats?.costToday ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Cost</span>
                <span className="text-white font-medium">
                  {formatCost(stats?.totalCost ?? 0)}
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
            <TaskCard key={task.id} task={task} />
          ))}
          {recentTasks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No tasks yet
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

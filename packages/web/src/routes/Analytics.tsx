/**
 * Analytics page
 */

import { BarChart3, TrendingUp, Clock, Hash } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { MetricCard } from "../components/common/MetricCard";
import { useStats } from "../hooks/useStats";
import { formatDuration } from "../lib/utils";

export function Analytics() {
  const { data: stats } = useStats();

  const successRate =
    stats && stats.totalTasks > 0
      ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1)
      : "0";

  const avgIterations =
    stats && stats.completedTasks > 0
      ? (stats.totalIterations / stats.completedTasks).toFixed(1)
      : "0";

  return (
    <Layout title="Analytics">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          title="Avg Iterations"
          value={avgIterations}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Iterations"
          value={stats?.totalIterations ?? 0}
          icon={<Hash className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Duration"
          value={formatDuration(stats?.totalDuration ?? 0)}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Task Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Completed</span>
              <span className="text-green-400">
                {stats?.completedTasks ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Failed</span>
              <span className="text-red-400">{stats?.failedTasks ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total</span>
              <span className="text-white">{stats?.totalTasks ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Today</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Tasks</span>
              <span className="text-white">{stats?.tasksToday ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

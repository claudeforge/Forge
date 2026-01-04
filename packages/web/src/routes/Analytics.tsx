/**
 * Analytics page
 */

import { BarChart3, TrendingUp, DollarSign, Clock } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { MetricCard } from "../components/common/MetricCard";
import { useStats, useCostByDay } from "../hooks/useStats";
import { formatDuration, formatCost } from "../lib/utils";

export function Analytics() {
  const { data: stats } = useStats();
  const { data: costByDay } = useCostByDay(7);

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
          title="Total Cost"
          value={formatCost(stats?.totalCost ?? 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Duration"
          value={formatDuration(stats?.totalDuration ?? 0)}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Cost by Day */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Cost Over Last 7 Days
        </h2>

        {costByDay && costByDay.length > 0 ? (
          <div className="space-y-4">
            {costByDay.map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <span className="text-gray-400 w-24">{day.date}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 bg-forge-500 rounded"
                      style={{
                        width: `${Math.min(
                          (day.totalCost / Math.max(...costByDay.map((d) => d.totalCost))) * 100,
                          100
                        )}%`,
                        minWidth: day.totalCost > 0 ? "8px" : "0",
                      }}
                    />
                    <span className="text-white text-sm">
                      {formatCost(day.totalCost)}
                    </span>
                  </div>
                </div>
                <span className="text-gray-500 text-sm w-24 text-right">
                  {day.totalTokens.toLocaleString()} tokens
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No cost data available
          </div>
        )}
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
            <div className="flex justify-between">
              <span className="text-gray-400">Cost</span>
              <span className="text-forge-400">
                {formatCost(stats?.costToday ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

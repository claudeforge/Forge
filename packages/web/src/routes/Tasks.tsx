/**
 * Tasks list page
 */

import { useState } from "react";
import { ListTodo, Filter } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { TaskCard } from "../components/task/TaskCard";
import { EmptyState } from "../components/common/EmptyState";
import { useTasks } from "../hooks/useTasks";
import { cn } from "../lib/utils";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "queued", label: "Queued" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export function Tasks() {
  const { data: tasks, isLoading } = useTasks();
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTasks =
    statusFilter === "all"
      ? tasks
      : tasks?.filter((t) => t.status === statusFilter);

  return (
    <Layout title="Tasks">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter className="h-4 w-4" />
          <span className="text-sm">Filter:</span>
        </div>
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                statusFilter === filter.value
                  ? "bg-forge-500 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filteredTasks && filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ListTodo className="h-12 w-12" />}
          title="No tasks found"
          description={
            statusFilter === "all"
              ? "Start a FORGE loop to see tasks here"
              : `No ${statusFilter} tasks`
          }
        />
      )}
    </Layout>
  );
}

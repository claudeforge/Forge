/**
 * Queue management page
 */

import { useState } from "react";
import { Layers, Play, Pause, SkipForward, Plus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { CreateTaskModal } from "../components/task/CreateTaskModal";
import { Layout } from "../components/layout/Layout";
import { TaskCard } from "../components/task/TaskCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import {
  useQueue,
  useRunNext,
  usePauseQueue,
  useResumeQueue,
  useDeleteTask,
  useReorderQueue,
} from "../hooks/useStats";
import { cn } from "../lib/utils";

export function Queue() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: queue, isLoading } = useQueue();
  const runNext = useRunNext();
  const pauseQueue = usePauseQueue();
  const resumeQueue = useResumeQueue();
  const deleteTask = useDeleteTask();
  const reorderQueue = useReorderQueue();

  const moveTask = (index: number, direction: "up" | "down") => {
    if (!queue?.queued) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= queue.queued.length) return;

    const newOrder = [...queue.queued];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, moved);
    reorderQueue.mutate(newOrder.map(t => t.id));
  };

  const handleDelete = (taskId: string) => {
    if (confirm("Delete this task from the queue?")) {
      deleteTask.mutate(taskId);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Queue">
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Queue">
      <CreateTaskModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Queue Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <StatusBadge
            status={queue?.isPaused ? "paused" : "running"}
            className="text-sm"
          />
          <span className="text-gray-400">
            {queue?.queued.length ?? 0} tasks in queue
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-forge-500 text-white rounded-lg text-sm font-medium hover:bg-forge-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
          <button
            onClick={() => runNext.mutate()}
            disabled={queue?.running !== null || queue?.queued.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              queue?.running || queue?.queued.length === 0
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-600"
            )}
          >
            <SkipForward className="h-4 w-4" />
            Run Next
          </button>

          {queue?.isPaused ? (
            <button
              onClick={() => resumeQueue.mutate()}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          ) : (
            <button
              onClick={() => pauseQueue.mutate()}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
        </div>
      </div>

      {/* Running Task */}
      {queue?.running && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Currently Running
          </h2>
          <TaskCard task={queue.running} />
        </div>
      )}

      {/* Queued Tasks */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Queued Tasks</h2>
        {queue?.queued && queue.queued.length > 0 ? (
          <div className="space-y-3">
            {queue.queued.map((task, index) => (
              <div key={task.id} className="flex items-center gap-3">
                {/* Position */}
                <span className="text-gray-500 font-mono text-sm w-8">
                  #{index + 1}
                </span>

                {/* Reorder Controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveTask(index, "up")}
                    disabled={index === 0}
                    className={cn(
                      "p-1 rounded transition-colors",
                      index === 0
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                    )}
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => moveTask(index, "down")}
                    disabled={index === queue.queued.length - 1}
                    className={cn(
                      "p-1 rounded transition-colors",
                      index === queue.queued.length - 1
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                    )}
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Task Card */}
                <div className="flex-1">
                  <TaskCard task={task} />
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Layers className="h-12 w-12" />}
            title="Queue is empty"
            description="Add tasks from the web UI or use the FORGE plugin"
          />
        )}
      </div>
    </Layout>
  );
}

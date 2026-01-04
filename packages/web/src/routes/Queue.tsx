/**
 * Queue management page
 */

import { Layers, Play, Pause, SkipForward } from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { TaskCard } from "../components/task/TaskCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import {
  useQueue,
  useRunNext,
  usePauseQueue,
  useResumeQueue,
} from "../hooks/useStats";
import { cn } from "../lib/utils";

export function Queue() {
  const { data: queue, isLoading } = useQueue();
  const runNext = useRunNext();
  const pauseQueue = usePauseQueue();
  const resumeQueue = useResumeQueue();

  if (isLoading) {
    return (
      <Layout title="Queue">
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Queue">
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
            onClick={() => runNext.mutate()}
            disabled={queue?.running !== null || queue?.queued.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              queue?.running || queue?.queued.length === 0
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-forge-500 text-white hover:bg-forge-600"
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
              <div key={task.id} className="flex items-center gap-4">
                <span className="text-gray-500 font-mono text-sm w-8">
                  #{index + 1}
                </span>
                <div className="flex-1">
                  <TaskCard task={task} />
                </div>
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

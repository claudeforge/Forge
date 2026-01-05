/**
 * Queue management page
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Play,
  Pause,
  SkipForward,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Pencil,
  GripVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  Filter,
} from "lucide-react";
import { CreateTaskModal } from "../components/task/CreateTaskModal";
import { EditTaskModal } from "../components/task/EditTaskModal";
import type { Task } from "../lib/api";
import { api } from "../lib/api";
import { Layout } from "../components/layout/Layout";
import { TaskCard } from "../components/task/TaskCard";
import { StatusBadge } from "../components/common/StatusBadge";
import { EmptyState } from "../components/common/EmptyState";
import {
  useQueue,
  useRunNext,
  useRunTask,
  usePauseQueue,
  useResumeQueue,
  useDeleteTask,
  useReorderQueue,
} from "../hooks/useStats";
import { cn } from "../lib/utils";

export function Queue() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });

  const { data: queue, isLoading } = useQueue(projectFilter || undefined);
  const runNext = useRunNext();
  const runTask = useRunTask();
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
    if (moved) newOrder.splice(newIndex, 0, moved);
    reorderQueue.mutate(newOrder.map((t) => t.id));
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    // Add drag image styling
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "1";
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || !queue?.queued) return;
    if (draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...queue.queued];
    const [moved] = newOrder.splice(draggedIndex, 1);
    if (moved) newOrder.splice(dropIndex, 0, moved);
    reorderQueue.mutate(newOrder.map((t) => t.id));
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDelete = (taskId: string) => {
    if (confirm("Delete this task from the queue?")) {
      deleteTask.mutate(taskId);
    }
  };

  const handleRunTask = (taskId: string) => {
    if (queue?.running) {
      alert("A task is already running. Wait for it to complete.");
      return;
    }
    runTask.mutate(taskId);
  };

  const getProjectName = (projectId: string) => {
    return projects?.find((p) => p.id === projectId)?.name ?? projectId;
  };

  const formatDuration = (startedAt: string | null) => {
    if (!startedAt) return "";
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
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
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        defaultProjectId={projectFilter}
      />
      <EditTaskModal
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />

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

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:border-forge-500 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
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
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {queue.running.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {getProjectName(queue.running.projectId)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-400">
                  <Zap className="h-4 w-4" />
                  <span>Iteration {queue.running.iteration}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(queue.running.startedAt)}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-300 text-sm line-clamp-2">
              {queue.running.prompt}
            </p>
          </div>
        </div>
      )}

      {/* Queued Tasks */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Queued Tasks</h2>
        {queue?.queued && queue.queued.length > 0 ? (
          <div className="space-y-3">
            {queue.queued.map((task, index) => (
              <div 
                key={task.id} 
                className={cn(
                  "flex items-center gap-3 transition-all duration-150",
                  dragOverIndex === index && draggedIndex !== null && draggedIndex !== index
                    ? "border-t-2 border-forge-500 pt-2"
                    : "",
                  draggedIndex === index ? "opacity-50" : ""
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 p-1">
                  <GripVertical className="h-5 w-5" />
                </div>

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

                {/* Run This Button */}
                <button
                  onClick={() => handleRunTask(task.id)}
                  disabled={!!queue?.running}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    queue?.running
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  )}
                  title={queue?.running ? "Wait for current task" : "Run this task now"}
                >
                  <Play className="h-5 w-5" />
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => setEditingTask(task)}
                  className="p-2 text-gray-400 hover:text-forge-400 hover:bg-forge-500/10 rounded-lg transition-colors"
                  title="Edit task"
                >
                  <Pencil className="h-5 w-5" />
                </button>

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
            description="Add tasks from the web UI or use /forge:forge-tasks"
          />
        )}
      </div>

      {/* Recently Completed Tasks */}
      {queue?.completed && queue.completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-400" />
            Recent History
          </h2>
          <div className="space-y-2">
            {queue.completed.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border",
                  task.status === "completed"
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                )}
              >
                {task.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">
                      {task.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getProjectName(task.projectId)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {task.iteration} iterations
                    {task.completedAt && (
                      <> &middot; {new Date(task.completedAt).toLocaleString()}</>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}

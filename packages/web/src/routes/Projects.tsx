/**
 * Projects page
 */

import { useState } from "react";
import { FolderOpen, Plus, Trash2, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "../components/notification/NotificationProvider";
import { Layout } from "../components/layout/Layout";
import { EmptyState } from "../components/common/EmptyState";
import { CreateProjectModal } from "../components/project/CreateProjectModal";
import { api } from "../lib/api";
import { formatRelativeTime } from "../lib/utils";

export function Projects() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const copyCommand = (id: string) => {
    const command = `/forge:forge --project ${id} --control http://127.0.0.1:3344`;
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.getProjects(),
  });

  const deleteProject = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const syncFromCodebase = async (projectId: string) => {
    setSyncingId(projectId);
    try {
      const result = await api.syncFromCodebase(projectId);
      if (result.success) {
        addNotification({
          type: "success",
          title: "Sync Complete",
          message: `Synced ${result.specs.synced} specs, ${result.plans.synced} plans, ${result.tasks.synced} tasks`,
          duration: 5000,
        });
        // Refresh related data
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["queue"] });
        queryClient.invalidateQueries({ queryKey: ["specs"] });
        queryClient.invalidateQueries({ queryKey: ["plans"] });
      } else {
        addNotification({
          type: "error",
          title: "Sync Failed",
          message: result.message,
          duration: 0,
        });
      }
      // Group errors into single notification if any
      if (result.errors && result.errors.length > 0) {
        console.warn("[Sync] Parse errors:", result.errors);
        addNotification({
          type: "warning",
          title: "Sync Warnings",
          message: `${result.errors.length} file(s) skipped due to parse errors`,
          duration: 5000,
        });
      }
    } catch (error) {
      addNotification({
        type: "error",
        title: "Sync Error",
        message: error instanceof Error ? error.message : "Failed to sync from codebase",
        duration: 0,
      });
    } finally {
      setSyncingId(null);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Projects">
        <div className="text-center py-12 text-gray-400">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Projects">
      <CreateProjectModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 dark:text-gray-400">
          {projects?.length ?? 0} project(s) registered
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-forge-500 text-white rounded-lg text-sm font-medium hover:bg-forge-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      </div>

      {/* Projects List */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-forge-500/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-forge-500" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">
                      {project.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => syncFromCodebase(project.id)}
                    disabled={syncingId === project.id}
                    className="text-gray-500 hover:text-forge-500 dark:hover:text-forge-400 transition-colors disabled:opacity-50"
                    title="Sync from codebase (.forge directory)"
                  >
                    {syncingId === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteProject.mutate(project.id)}
                    className="text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Plugin Command - Copy to clipboard */}
              <div className="mt-3">
                <button
                  onClick={() => copyCommand(project.id)}
                  className="w-full flex items-center gap-2 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-900/80 border border-gray-200 dark:border-gray-700 hover:border-forge-500/50 rounded px-3 py-2 transition-colors group"
                  title="Click to copy command"
                >
                  <code className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-forge-500 dark:group-hover:text-forge-400 font-mono flex-1 text-left truncate">
                    /forge:forge --project {project.id} ...
                  </code>
                  {copiedId === project.id ? (
                    <Check className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500 group-hover:text-forge-500 dark:group-hover:text-forge-400 flex-shrink-0" />
                  )}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                {project.lastActivityAt
                  ? `Last activity ${formatRelativeTime(project.lastActivityAt)}`
                  : `Created ${formatRelativeTime(project.createdAt)}`}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No projects yet"
          description="Add a project to start managing tasks"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-forge-500 text-white rounded-lg text-sm font-medium hover:bg-forge-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Project
            </button>
          }
        />
      )}
    </Layout>
  );
}

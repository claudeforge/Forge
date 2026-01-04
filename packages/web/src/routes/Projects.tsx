/**
 * Projects page
 */

import { useState } from "react";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/layout/Layout";
import { EmptyState } from "../components/common/EmptyState";
import { CreateProjectModal } from "../components/project/CreateProjectModal";
import { api } from "../lib/api";
import { formatRelativeTime } from "../lib/utils";

export function Projects() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        <p className="text-gray-400">
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
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-forge-500/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-forge-500" />
                  <div>
                    <h3 className="font-medium text-white">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate max-w-[200px]">
                      {project.path}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteProject.mutate(project.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
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

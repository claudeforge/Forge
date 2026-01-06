/**
 * Tasks list page with project/spec filtering and multiple view modes
 */

import { useState, useMemo } from "react";
import {
  ListTodo,
  Filter,
  LayoutList,
  LayoutGrid,
  GitBranch,
  ChevronDown,
  FolderOpen,
  FileText,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { TaskCard } from "../components/task/TaskCard";
import { EmptyState } from "../components/common/EmptyState";
import { useTasks, useProjects } from "../hooks/useTasks";
import { cn } from "../lib/utils";
import type { Task, Project } from "../lib/api";

type ViewMode = "list" | "kanban" | "tree";

const statusFilters = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "queued", label: "Queued" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const kanbanColumns = [
  { status: "queued", label: "Queued", color: "bg-yellow-500" },
  { status: "running", label: "Running", color: "bg-blue-500" },
  { status: "completed", label: "Completed", color: "bg-green-500" },
  { status: "failed", label: "Failed", color: "bg-red-500" },
];

// Parse config JSON safely
function parseConfig(task: Task): { specId?: string; planId?: string } {
  try {
    if (typeof task.config === "string") {
      return JSON.parse(task.config);
    }
    return (task.config as { specId?: string; planId?: string }) || {};
  } catch {
    return {};
  }
}

// Get unique specs from tasks
function getUniqueSpecs(tasks: Task[]): string[] {
  const specs = new Set<string>();
  tasks.forEach((t) => {
    const config = parseConfig(t);
    if (config.specId) specs.add(config.specId);
  });
  return Array.from(specs).sort();
}

// Group tasks by project
function groupByProject(
  tasks: Task[],
  projects: Project[]
): Map<string, { project: Project | null; tasks: Task[] }> {
  const groups = new Map<string, { project: Project | null; tasks: Task[] }>();

  tasks.forEach((task) => {
    const projectId = task.projectId || "unassigned";
    if (!groups.has(projectId)) {
      const project = projects.find((p) => p.id === projectId) || null;
      groups.set(projectId, { project, tasks: [] });
    }
    groups.get(projectId)!.tasks.push(task);
  });

  return groups;
}

export function Tasks() {
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [specFilter, setSpecFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [groupByProj, setGroupByProj] = useState(false);

  const isLoading = tasksLoading || projectsLoading;

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((t) => {
      // Status filter
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      // Project filter
      if (projectFilter !== "all" && t.projectId !== projectFilter) return false;

      // Spec filter
      if (specFilter !== "all") {
        const config = parseConfig(t);
        if (config.specId !== specFilter) return false;
      }

      return true;
    });
  }, [tasks, statusFilter, projectFilter, specFilter]);

  // Get available specs for selected project
  const availableSpecs = useMemo(() => {
    if (!tasks) return [];
    const projectTasks =
      projectFilter === "all"
        ? tasks
        : tasks.filter((t) => t.projectId === projectFilter);
    return getUniqueSpecs(projectTasks);
  }, [tasks, projectFilter]);

  // Group tasks when needed
  const groupedTasks = useMemo(() => {
    if (!groupByProj || !filteredTasks || !projects) return null;
    return groupByProject(filteredTasks, projects);
  }, [filteredTasks, projects, groupByProj]);

  // Reset spec filter when project changes
  const handleProjectChange = (value: string) => {
    setProjectFilter(value);
    setSpecFilter("all");
  };

  return (
    <Layout title="Tasks">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-gray-400" />
          <select
            value={projectFilter}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-forge-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Spec Filter */}
        {availableSpecs.length > 0 && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="bg-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 border border-gray-700 focus:border-forge-500 focus:outline-none"
            >
              <option value="all">All Specs</option>
              {availableSpecs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex gap-1">
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-2 rounded transition-colors",
              viewMode === "list"
                ? "bg-forge-500 text-white"
                : "text-gray-400 hover:text-white"
            )}
            title="List view"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "p-2 rounded transition-colors",
              viewMode === "kanban"
                ? "bg-forge-500 text-white"
                : "text-gray-400 hover:text-white"
            )}
            title="Kanban view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={cn(
              "p-2 rounded transition-colors",
              viewMode === "tree"
                ? "bg-forge-500 text-white"
                : "text-gray-400 hover:text-white"
            )}
            title="Tree view (by project)"
          >
            <GitBranch className="h-4 w-4" />
          </button>
        </div>

        {/* Group by Project Toggle (for list view) */}
        {viewMode === "list" && (
          <button
            onClick={() => setGroupByProj(!groupByProj)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
              groupByProj
                ? "bg-forge-500 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            Group
          </button>
        )}
      </div>

      {/* Task Count */}
      <div className="text-sm text-gray-400 mb-4">
        {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
        {statusFilter !== "all" && ` (${statusFilter})`}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-12 w-12" />}
          title="No tasks found"
          description={
            statusFilter === "all" && projectFilter === "all"
              ? "Start a FORGE loop to see tasks here"
              : "No tasks match your filters"
          }
        />
      ) : viewMode === "kanban" ? (
        <KanbanView tasks={filteredTasks} />
      ) : viewMode === "tree" ? (
        <TreeView tasks={filteredTasks} projects={projects || []} />
      ) : groupByProj && groupedTasks ? (
        <GroupedListView groups={groupedTasks} />
      ) : (
        <ListView tasks={filteredTasks} />
      )}
    </Layout>
  );
}

// List View Component
function ListView({ tasks }: { tasks: Task[] }) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

// Grouped List View Component
function GroupedListView({
  groups,
}: {
  groups: Map<string, { project: Project | null; tasks: Task[] }>;
}) {
  const entries = Array.from(groups.entries());

  return (
    <div className="space-y-6">
      {entries.map(([projectId, { project, tasks }]) => (
        <div key={projectId}>
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800">
            <FolderOpen className="h-5 w-5 text-forge-400" />
            <h3 className="text-lg font-medium text-white">
              {project?.name || "Unassigned"}
            </h3>
            <span className="text-sm text-gray-500">({tasks.length})</span>
          </div>
          <div className="space-y-3 pl-2">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Kanban View Component
function KanbanView({ tasks }: { tasks: Task[] }) {
  const columnTasks = useMemo(() => {
    const result: Record<string, Task[]> = {};
    kanbanColumns.forEach((col) => {
      result[col.status] = tasks.filter((t) => t.status === col.status);
    });
    return result;
  }, [tasks]);

  return (
    <div className="grid grid-cols-4 gap-4 min-h-[500px]">
      {kanbanColumns.map((column) => (
        <div
          key={column.status}
          className="bg-gray-900 rounded-lg p-3 flex flex-col"
        >
          {/* Column Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-800">
            <div className={cn("w-3 h-3 rounded-full", column.color)} />
            <span className="font-medium text-white">{column.label}</span>
            <span className="text-sm text-gray-500">
              ({columnTasks[column.status]?.length || 0})
            </span>
          </div>

          {/* Column Content */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {columnTasks[column.status]?.map((task) => (
              <KanbanCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Kanban Card (compact version)
function KanbanCard({ task }: { task: Task }) {
  const config = parseConfig(task);

  return (
    <div className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors cursor-pointer">
      <div className="text-sm font-medium text-white mb-1 line-clamp-2">
        {task.name}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {config.specId && (
          <span className="bg-gray-700 px-1.5 py-0.5 rounded">
            {config.specId}
          </span>
        )}
        {task.iteration > 0 && <span>iter {task.iteration}</span>}
      </div>
    </div>
  );
}

// Tree View Component (grouped by project, then by spec)
function TreeView({
  tasks,
  projects,
}: {
  tasks: Task[];
  projects: Project[];
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["all"]));

  const toggleExpand = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpanded(next);
  };

  // Build tree structure: Project -> Spec -> Tasks
  const tree = useMemo(() => {
    const result = new Map<
      string,
      {
        project: Project | null;
        specs: Map<string, Task[]>;
        noSpec: Task[];
      }
    >();

    tasks.forEach((task) => {
      const projectId = task.projectId || "unassigned";
      if (!result.has(projectId)) {
        result.set(projectId, {
          project: projects.find((p) => p.id === projectId) || null,
          specs: new Map(),
          noSpec: [],
        });
      }

      const node = result.get(projectId)!;
      const config = parseConfig(task);

      if (config.specId) {
        if (!node.specs.has(config.specId)) {
          node.specs.set(config.specId, []);
        }
        node.specs.get(config.specId)!.push(task);
      } else {
        node.noSpec.push(task);
      }
    });

    return result;
  }, [tasks, projects]);

  return (
    <div className="space-y-2">
      {Array.from(tree.entries()).map(
        ([projectId, { project, specs, noSpec }]) => {
          const projectKey = `proj-${projectId}`;
          const isProjectExpanded = expanded.has(projectKey);
          const totalTasks =
            noSpec.length +
            Array.from(specs.values()).reduce((sum, t) => sum + t.length, 0);

          return (
            <div key={projectId} className="bg-gray-900 rounded-lg">
              {/* Project Header */}
              <button
                onClick={() => toggleExpand(projectKey)}
                className="w-full flex items-center gap-2 p-3 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    !isProjectExpanded && "-rotate-90"
                  )}
                />
                <FolderOpen className="h-5 w-5 text-forge-400" />
                <span className="font-medium text-white">
                  {project?.name || "Unassigned"}
                </span>
                <span className="text-sm text-gray-500">({totalTasks})</span>
              </button>

              {/* Project Content */}
              {isProjectExpanded && (
                <div className="pl-6 pb-3 space-y-2">
                  {/* Specs */}
                  {Array.from(specs.entries()).map(([specId, specTasks]) => {
                    const specKey = `${projectKey}-${specId}`;
                    const isSpecExpanded = expanded.has(specKey);

                    return (
                      <div key={specId}>
                        <button
                          onClick={() => toggleExpand(specKey)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-gray-800 rounded transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-gray-400 transition-transform",
                              !isSpecExpanded && "-rotate-90"
                            )}
                          />
                          <FileText className="h-4 w-4 text-blue-400" />
                          <span className="text-sm text-gray-300">{specId}</span>
                          <span className="text-xs text-gray-500">
                            ({specTasks.length})
                          </span>
                        </button>

                        {isSpecExpanded && (
                          <div className="pl-6 space-y-2 mt-1">
                            {specTasks.map((task) => (
                              <TaskCard key={task.id} task={task} compact />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Tasks without spec */}
                  {noSpec.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 p-2 text-gray-500">
                        <ListTodo className="h-4 w-4" />
                        <span className="text-sm">No Spec</span>
                        <span className="text-xs">({noSpec.length})</span>
                      </div>
                      <div className="pl-6 space-y-2">
                        {noSpec.map((task) => (
                          <TaskCard key={task.id} task={task} compact />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
}

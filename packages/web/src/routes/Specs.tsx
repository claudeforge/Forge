/**
 * Specifications page - View specs and their tasks
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  XCircle,
  Pause,
  List,
  GitBranch,
} from "lucide-react";
import { Layout } from "../components/layout/Layout";
import { DependencyGraph } from "../components/task/DependencyGraph";
import { api, Spec, TaskDef } from "../lib/api";
import { cn } from "../lib/utils";

// Status badge for specs
function SpecStatusBadge({ status }: { status: Spec["status"] }) {
  const styles = {
    draft: "bg-gray-500/20 text-gray-400",
    approved: "bg-blue-500/20 text-blue-400",
    in_progress: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-red-500/20 text-red-400",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", styles[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

// Status badge for tasks
function TaskStatusBadge({ status }: { status: TaskDef["status"] }) {
  const config = {
    pending: { icon: Clock, color: "text-gray-400", bg: "bg-gray-500/20" },
    queued: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/20" },
    blocked: { icon: Pause, color: "text-orange-400", bg: "bg-orange-500/20" },
    running: { icon: Loader2, color: "text-yellow-400", bg: "bg-yellow-500/20" },
    completed: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20" },
    failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
    skipped: { icon: AlertCircle, color: "text-gray-400", bg: "bg-gray-500/20" },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", bg, color)}>
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {status}
    </span>
  );
}

// Progress bar for tasks
function TaskProgress({ counts }: { counts: Spec["tasks"] }) {
  if (!counts || counts.total === 0) return null;

  const completed = (counts.completed / counts.total) * 100;
  const running = (counts.running / counts.total) * 100;
  const failed = (counts.failed / counts.total) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${completed}%` }}
          />
          <div
            className="bg-yellow-500 transition-all"
            style={{ width: `${running}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${failed}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {counts.completed}/{counts.total}
      </span>
    </div>
  );
}

// Task card
function TaskDefCard({ task }: { task: TaskDef }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-750 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-forge-400">{task.id}</span>
            <TaskStatusBadge status={task.status} />
            <span className={cn(
              "px-1.5 py-0.5 rounded text-xs",
              task.complexity === "low" && "bg-green-500/20 text-green-400",
              task.complexity === "medium" && "bg-yellow-500/20 text-yellow-400",
              task.complexity === "high" && "bg-red-500/20 text-red-400"
            )}>
              {task.complexity}
            </span>
          </div>
          <h4 className="text-white font-medium truncate">{task.title}</h4>
          {task.depends_on.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Depends on: {task.depends_on.join(", ")}
            </p>
          )}
        </div>
        {task.iterations > 0 && (
          <span className="text-xs text-gray-400">
            {task.iterations} iter
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-700">
          <p className="text-sm text-gray-300 mt-3 whitespace-pre-wrap">
            {task.description}
          </p>

          {task.technical && (
            <div className="mt-3 space-y-2">
              {task.technical.approach && (
                <div>
                  <h5 className="text-xs font-medium text-gray-400 mb-1">Approach</h5>
                  <p className="text-xs text-gray-300">{task.technical.approach}</p>
                </div>
              )}
              {task.technical.files_to_create.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-400 mb-1">Files to create</h5>
                  <ul className="text-xs text-gray-300 font-mono">
                    {task.technical.files_to_create.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {task.technical.files_to_modify.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-400 mb-1">Files to modify</h5>
                  <ul className="text-xs text-gray-300 font-mono">
                    {task.technical.files_to_modify.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {task.goals.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-medium text-gray-400 mb-1">Goals</h5>
              <ul className="text-xs text-gray-300 list-disc list-inside">
                {task.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {task.criteria.length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-medium text-gray-400 mb-1">Success Criteria</h5>
              <ul className="text-xs text-gray-300">
                {task.criteria.map((c, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-gray-500" />
                    {c.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.result && (
            <div className="mt-3 p-2 bg-gray-900 rounded">
              <h5 className="text-xs font-medium text-gray-400 mb-1">Result</h5>
              <p className="text-xs text-gray-300">{task.result.summary}</p>
              <div className="flex gap-4 mt-1 text-xs text-gray-500">
                <span>{task.result.iterations} iterations</span>
                <span>{Math.round(task.result.duration / 1000)}s</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Spec card with tasks
function SpecCard({ spec, projectId }: { spec: Spec; projectId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");

  const { data: specDetail, isLoading } = useQuery({
    queryKey: ["spec", projectId, spec.id],
    queryFn: () => api.getSpec(projectId, spec.id),
    enabled: expanded,
  });

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-750 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
        )}
        <FileText className="h-5 w-5 text-forge-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-gray-500">{spec.id}</span>
            <SpecStatusBadge status={spec.status} />
          </div>
          <h3 className="text-white font-medium">{spec.title}</h3>
          {spec.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {spec.description}
            </p>
          )}
          {spec.tasks && <TaskProgress counts={spec.tasks} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-700 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : specDetail?.taskDefs ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-300">
                  Tasks ({specDetail.taskDefs.length})
                </h4>
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex rounded-lg bg-gray-700 p-0.5">
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                        viewMode === "list"
                          ? "bg-gray-600 text-white"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <List className="h-3 w-3" />
                      List
                    </button>
                    <button
                      onClick={() => setViewMode("graph")}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                        viewMode === "graph"
                          ? "bg-gray-600 text-white"
                          : "text-gray-400 hover:text-white"
                      )}
                    >
                      <GitBranch className="h-3 w-3" />
                      Graph
                    </button>
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span className="text-green-400">
                      {specDetail.taskCounts.completed} done
                    </span>
                    <span className="text-yellow-400">
                      {specDetail.taskCounts.running} running
                    </span>
                    <span className="text-gray-400">
                      {specDetail.taskCounts.pending} pending
                    </span>
                  </div>
                </div>
              </div>
              {specDetail.taskDefs.length > 0 ? (
                viewMode === "list" ? (
                  <div className="space-y-2">
                    {specDetail.taskDefs.map((task) => (
                      <TaskDefCard key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <DependencyGraph tasks={specDetail.taskDefs} />
                )
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tasks created yet. Run /forge:forge-plan {spec.id}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Failed to load tasks</p>
          )}
        </div>
      )}
    </div>
  );
}

export function Specs() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });

  // Fetch specs for selected project
  const { data: specsData, isLoading: loadingSpecs } = useQuery({
    queryKey: ["specs", selectedProject],
    queryFn: () => api.getSpecs(selectedProject!),
    enabled: !!selectedProject,
  });

  // Auto-select first project
  if (projects.length > 0 && !selectedProject && projects[0]) {
    setSelectedProject(projects[0].id);
  }

  return (
    <Layout title="Specifications">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Specifications</h1>
            <p className="text-gray-400 mt-1">
              View and manage specification-driven development
            </p>
          </div>

          {/* Project selector */}
          {projects.length > 0 && (
            <select
              value={selectedProject || ""}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Content */}
        {!selectedProject ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400">No project selected</h3>
            <p className="text-gray-500 mt-1">
              Create a project first, then link it with /forge:forge-link
            </p>
          </div>
        ) : loadingSpecs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : specsData?.specs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400">No specifications yet</h3>
            <p className="text-gray-500 mt-1">
              Create one with /forge:forge-spec "feature description"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {specsData?.specs.map((spec) => (
              <SpecCard key={spec.id} spec={spec} projectId={selectedProject} />
            ))}
          </div>
        )}

        {/* Help */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Quick Start</h3>
          <ol className="text-sm text-gray-400 space-y-1">
            <li>1. Create specification: <code className="text-forge-400">/forge:forge-spec "Add user auth"</code></li>
            <li>2. Create plan: <code className="text-forge-400">/forge:forge-plan spec-001</code></li>
            <li>3. Queue tasks: <code className="text-forge-400">/forge:forge-queue --plan plan-001</code></li>
            <li>4. Execute: <code className="text-forge-400">/forge:forge</code></li>
          </ol>
        </div>
      </div>
    </Layout>
  );
}

/**
 * API client
 */

// In development, connect directly to API server to avoid proxy issues
// Use 127.0.0.1 instead of localhost to avoid IPv6 issues on Windows
const API_HOST = import.meta.env.DEV ? "http://127.0.0.1:3344" : "";
const BASE_URL = `${API_HOST}/api`;

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message ?? `Request failed: ${response.status}`);
  }

  return response.json();
}

// API client
export const api = {
  // Projects
  getProjects: () => request<Project[]>("/projects"),
  createProject: (data: CreateProjectRequest) =>
    request<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteProject: (id: string) =>
    request(`/projects/${id}`, { method: "DELETE" }),

  // Tasks
  getTasks: (projectId?: string) =>
    request<Task[]>(`/tasks${projectId ? `?projectId=${projectId}` : ""}`),
  getTask: (id: string) => request<Task>(`/tasks/${id}`),
  createTask: (data: CreateTaskRequest) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTask: (id: string, data: UpdateTaskRequest) =>
    request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTask: (id: string) => request(`/tasks/${id}`, { method: "DELETE" }),
  getTaskIterations: (id: string) =>
    request<Iteration[]>(`/tasks/${id}/iterations`),

  // Queue
  getQueue: (projectId?: string) =>
    request<QueueStatus>(`/queue${projectId ? `?projectId=${projectId}` : ""}`),
  reorderQueue: (taskIds: string[]) =>
    request("/queue/reorder", {
      method: "POST",
      body: JSON.stringify({ taskIds }),
    }),
  runTask: (id: string) => request(`/queue/run/${id}`, { method: "POST" }),
  runNext: () => request("/queue/run-next", { method: "POST" }),
  pauseQueue: () => request("/queue/pause", { method: "POST" }),
  resumeQueue: () => request("/queue/resume", { method: "POST" }),

  // Stats
  getStats: () => request<Stats>("/stats"),

  // Project Files - Specs
  getSpecs: (projectId: string) =>
    request<SpecsResponse>(`/projects/${projectId}/specs`),
  getSpec: (projectId: string, specId: string) =>
    request<SpecDetail>(`/projects/${projectId}/specs/${specId}`),
  updateSpec: (projectId: string, specId: string, data: Partial<Spec>) =>
    request<Spec>(`/projects/${projectId}/specs/${specId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Project Files - Plans
  getPlans: (projectId: string) =>
    request<PlansResponse>(`/projects/${projectId}/plans`),
  getPlan: (projectId: string, planId: string) =>
    request<Plan>(`/projects/${projectId}/plans/${planId}`),

  // Project Files - Task Definitions
  getTaskDefs: (projectId: string, filters?: TaskDefFilters) => {
    const params = new URLSearchParams();
    if (filters?.specId) params.set("specId", filters.specId);
    if (filters?.planId) params.set("planId", filters.planId);
    if (filters?.status) params.set("status", filters.status);
    const query = params.toString();
    return request<TaskDefsResponse>(
      `/projects/${projectId}/task-defs${query ? `?${query}` : ""}`
    );
  },
  getTaskDef: (projectId: string, taskId: string) =>
    request<TaskDef>(`/projects/${projectId}/task-defs/${taskId}`),
  updateTaskDefStatus: (
    projectId: string,
    taskId: string,
    status: string,
    result?: object
  ) =>
    request<TaskDef>(`/projects/${projectId}/task-defs/${taskId}/status`, {
      method: "POST",
      body: JSON.stringify({ status, result }),
    }),

  // Project State
  getProjectState: (projectId: string) =>
    request<ProjectState>(`/projects/${projectId}/state`),

  // Spec Requests (WebUI → Claude Code)
  getRequests: (projectId: string, status?: SpecRequestStatus) => {
    const params = status ? `?status=${status}` : "";
    return request<{ requests: SpecRequest[] }>(
      `/projects/${projectId}/requests${params}`
    );
  },
  createRequest: (projectId: string, data: CreateSpecRequest) =>
    request<SpecRequest>(`/projects/${projectId}/requests`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateRequestStatus: (
    projectId: string,
    requestId: string,
    status: SpecRequestStatus,
    result?: SpecRequest["result"]
  ) =>
    request<SpecRequest>(`/projects/${projectId}/requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, result }),
    }),

  // Sync
  syncFromCodebase: (projectId: string) =>
    request<SyncResult>(`/sync/from-codebase/${projectId}`, {
      method: "POST",
    }),
  markTaskDone: (taskId: string, summary?: string) =>
    request<MarkDoneResult>(`/sync/mark-done/${taskId}`, {
      method: "POST",
      body: JSON.stringify({ summary }),
    }),
  queueTaskDef: (projectId: string, taskDefId: string) =>
    request<QueueTaskResult>(`/sync/queue-task/${projectId}/${taskDefId}`, {
      method: "POST",
    }),
  queueTaskDefs: (projectId: string, taskDefIds: string[]) =>
    request<QueueTasksResult>(`/sync/queue-tasks/${projectId}`, {
      method: "POST",
      body: JSON.stringify({ taskDefIds }),
    }),
};

// Types
interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  lastActivityAt: string | null;
}

interface CreateProjectRequest {
  name: string;
  path: string;
}

interface Task {
  id: string;
  projectId: string;
  name: string;
  prompt: string;
  status: string;
  priority: number;
  dependsOn: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  iteration: number;
  config: string;
  result: string | null;
  createdAt: string;
}

interface CreateTaskRequest {
  projectId: string;
  name: string;
  prompt: string;
  priority?: number;
  config?: object;
}

interface UpdateTaskRequest {
  name?: string;
  prompt?: string;
  config?: object;
  status?: string;
  priority?: number;
}

interface Iteration {
  id: string;
  taskId: string;
  iterationNum: number;
  startedAt: string;
  endedAt: string;
  duration: number;
  tokens: number;
  outcome: string;
  summary: string;
  criteriaResults: string;
  createdAt: string;
}

interface QueueStatus {
  running: Task | null;
  queued: Task[];
  completed: Task[];
  concurrency: number;
  isProcessing: boolean;
  isPaused: boolean;
}

interface Stats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalIterations: number;
  totalDuration: number;
  tasksToday: number;
}

// Spec types
interface TaskCounts {
  total: number;
  pending: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
}

interface Spec {
  id: string;
  title: string;
  description: string;
  status: "draft" | "approved" | "in_progress" | "completed" | "cancelled";
  plan_id: string | null;
  task_ids: string[];
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  content?: string;
  tasks?: TaskCounts;
}

interface SpecsResponse {
  specs: Spec[];
}

interface SpecDetail extends Spec {
  taskDefs: TaskDef[];
  taskCounts: TaskCounts;
}

interface Plan {
  id: string;
  title: string;
  spec_id: string;
  status: "draft" | "approved" | "executing" | "completed" | "failed";
  decisions: string[];
  task_ids: string[];
  task_order: string[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  content?: string;
}

interface PlansResponse {
  plans: Plan[];
}

// Task source - where the task was created
type TaskSource =
  | "forge-plan"      // Created by /forge:forge-plan (proper workflow)
  | "forge-adopt"     // Adopted from WebUI via /forge:forge-adopt
  | "webui-direct"    // Created directly in WebUI (needs adoption)
  | "webui-quick"     // Quick-add from WebUI (needs adoption)
  | "api-import"      // Imported via API (needs adoption)
  | "manual";         // Hand-written YAML file

interface TaskDef {
  id: string;
  title: string;
  description: string;
  depends_on: string[];
  blocks: string[];
  type: "feature" | "bugfix" | "refactor" | "test" | "docs" | "chore";
  priority: number;
  complexity: "low" | "medium" | "high";
  technical: {
    approach: string;
    files_to_create: string[];
    files_to_modify: string[];
    considerations: string[];
  };
  criteria: Array<{
    type: string;
    name: string;
    config: Record<string, unknown>;
  }>;
  execution: {
    max_iterations: number;
    checkpoint_every: number;
    on_stuck: string;
    timeout_minutes: number | null;
  };
  goals: string[];
  status: "pending" | "queued" | "blocked" | "running" | "completed" | "failed" | "skipped";
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  iterations: number;
  result: {
    success: boolean;
    iterations: number;
    duration: number;
    tokens: number;
    files_created: string[];
    files_modified: string[];
    summary: string;
    error?: string;
  } | null;
  spec_id: string | null;
  plan_id: string | null;
  created_at: string;
  created_by: string;
  // Source tracking
  source: TaskSource;
  original_id?: string;
  needs_formalization: boolean;
}

// Spec request - created from WebUI for Claude Code to process
type SpecRequestType = "spec" | "plan" | "adopt" | "clarify";
type SpecRequestStatus = "pending" | "processing" | "completed" | "failed";

interface SpecRequest {
  id: string;
  type: SpecRequestType;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: SpecRequestStatus;
  // For adopt requests
  task_ids?: string[];
  // Result after processing
  result?: {
    spec_id?: string;
    plan_id?: string;
    task_ids?: string[];
  };
  created_at: string;
  processed_at: string | null;
}

interface CreateSpecRequest {
  type: SpecRequestType;
  title: string;
  description: string;
  priority?: "low" | "medium" | "high";
  task_ids?: string[];  // For adopt requests
}

interface TaskDefFilters {
  specId?: string;
  planId?: string;
  status?: string;
}

interface TaskDefsResponse {
  taskDefs: TaskDef[];
  bySpec: Record<string, TaskDef[]>;
  summary: TaskCounts;
}

interface ProjectState {
  active: boolean;
  state?: object;
}

interface SyncResult {
  success: boolean;
  specs: { found: number; synced: number };
  plans: { found: number; synced: number };
  tasks: { found: number; synced: number };
  errors: string[];
  message: string;
}

interface QueueTaskResult {
  success: boolean;
  task?: Task;
  error?: string;
  message: string;
}

interface QueueTasksResult {
  success: boolean;
  queued: string[];
  skipped: string[];
  errors: string[];
  message: string;
}

interface MarkDoneResult {
  success: boolean;
  task: Task;
  codebaseSynced: boolean;
  message: string;
}

export type {
  Project,
  Task,
  Iteration,
  QueueStatus,
  Stats,
  CreateProjectRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
  Spec,
  SpecsResponse,
  SpecDetail,
  Plan,
  PlansResponse,
  TaskDef,
  TaskDefFilters,
  TaskDefsResponse,
  TaskCounts,
  ProjectState,
  TaskSource,
  SpecRequest,
  SpecRequestType,
  SpecRequestStatus,
  CreateSpecRequest,
  SyncResult,
  MarkDoneResult,
  QueueTaskResult,
  QueueTasksResult,
};

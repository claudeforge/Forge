/**
 * API client
 */

const BASE_URL = "/api";

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

// Projects
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
  getQueue: () => request<QueueStatus>("/queue"),
  reorderQueue: (taskIds: string[]) =>
    request("/queue/reorder", {
      method: "POST",
      body: JSON.stringify({ taskIds }),
    }),
  runNext: () => request("/queue/run-next", { method: "POST" }),
  pauseQueue: () => request("/queue/pause", { method: "POST" }),
  resumeQueue: () => request("/queue/resume", { method: "POST" }),

  // Stats
  getStats: () => request<Stats>("/stats"),
  getCostByDay: (days = 7) =>
    request<CostByDay[]>(`/stats/cost-by-day?days=${days}`),
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
  concurrency: number;
  isProcessing: boolean;
  isPaused: boolean;
}

interface Stats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalIterations: number;
  totalCost: number;
  totalDuration: number;
  tasksToday: number;
  costToday: number;
}

interface CostByDay {
  date: string;
  totalCost: number;
  totalTokens: number;
}

export type {
  Project,
  Task,
  Iteration,
  QueueStatus,
  Stats,
  CostByDay,
  CreateProjectRequest,
  CreateTaskRequest,
  UpdateTaskRequest,
};

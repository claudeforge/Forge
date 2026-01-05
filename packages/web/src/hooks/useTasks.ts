/**
 * Task-related hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateTaskRequest, type UpdateTaskRequest } from "../lib/api";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.getProjects(),
  });
}

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => api.getTasks(projectId),
    refetchInterval: 5000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => api.getTask(id),
    enabled: !!id,
  });
}

export function useTaskIterations(id: string) {
  return useQuery({
    queryKey: ["iterations", id],
    queryFn: () => api.getTaskIterations(id),
    enabled: !!id,
    refetchInterval: 3000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskRequest) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

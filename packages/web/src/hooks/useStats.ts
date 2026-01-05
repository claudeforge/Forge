/**
 * Stats and queue hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.getStats(),
    refetchInterval: 10000,
  });
}

export function useQueue(projectId?: string) {
  return useQuery({
    queryKey: ["queue", projectId],
    queryFn: () => api.getQueue(projectId),
    refetchInterval: 3000,
  });
}

export function useRunTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.runTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useRunNext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.runNext(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function usePauseQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.pauseQueue(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useResumeQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.resumeQueue(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useReorderQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: string[]) => api.reorderQueue(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
  });
}

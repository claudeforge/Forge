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

export function useCostByDay(days = 7) {
  return useQuery({
    queryKey: ["costByDay", days],
    queryFn: () => api.getCostByDay(days),
  });
}

export function useQueue() {
  return useQuery({
    queryKey: ["queue"],
    queryFn: () => api.getQueue(),
    refetchInterval: 3000,
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

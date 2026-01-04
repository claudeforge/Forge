/**
 * Utility functions
 */

import { clsx, type ClassValue } from "clsx";

/**
 * Merge class names
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

/**
 * Format cost as USD
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Format date relative to now
 */
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "running":
      return "text-green-400 bg-green-400/10";
    case "completed":
      return "text-blue-400 bg-blue-400/10";
    case "failed":
      return "text-red-400 bg-red-400/10";
    case "stuck":
      return "text-orange-400 bg-orange-400/10";
    case "paused":
      return "text-yellow-400 bg-yellow-400/10";
    case "queued":
      return "text-purple-400 bg-purple-400/10";
    case "aborted":
      return "text-gray-400 bg-gray-400/10";
    default:
      return "text-gray-400 bg-gray-400/10";
  }
}

/**
 * Token and cost estimation utilities
 */

import { TOKEN_COSTS } from "@claudeforge/forge-shared/constants";

/**
 * Rough token estimation based on character count
 * Average ~4 chars per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost from token count
 * Uses average of input/output costs
 */
export function estimateCost(
  tokens: number,
  model: string = "default"
): number {
  const costPer1M = TOKEN_COSTS[model] ?? TOKEN_COSTS["default"] ?? 0.009;
  return (tokens / 1_000_000) * costPer1M;
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

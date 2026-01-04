/**
 * Token and cost estimation utilities
 */

import {
  calculateTokenCost,
  getModelPricing,
  DEFAULT_MODEL,
} from "@claudeforge/forge-shared/constants";

/**
 * Rough token estimation based on character count
 * Average ~4 chars per token for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for input tokens only
 */
export function estimateInputCost(
  inputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  return calculateTokenCost(inputTokens, 0, model);
}

/**
 * Estimate cost for output tokens only
 */
export function estimateOutputCost(
  outputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  return calculateTokenCost(0, outputTokens, model);
}

/**
 * Estimate total cost from token counts
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = DEFAULT_MODEL
): number {
  return calculateTokenCost(inputTokens, outputTokens, model);
}

/**
 * Get pricing info for a model
 */
export function getModelCost(model: string = DEFAULT_MODEL) {
  return getModelPricing(model);
}

/**
 * Estimate cost from total token count
 * Uses 1:3 input:output ratio as approximation for Claude responses
 */
export function estimateCostFromTotal(
  totalTokens: number,
  model: string = DEFAULT_MODEL
): number {
  // Approximate: 25% input, 75% output (typical for Claude responses)
  const inputTokens = Math.floor(totalTokens * 0.25);
  const outputTokens = totalTokens - inputTokens;
  return calculateTokenCost(inputTokens, outputTokens, model);
}

/**
 * Format cost as USD string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

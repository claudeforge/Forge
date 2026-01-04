/**
 * FORGE default values
 */

import type { ForgeState } from "../types/state.js";

/** Control Center default URL */
export const CONTROL_CENTER_URL = "http://localhost:3344";

/** Default state (excluding task) */
export const DEFAULT_STATE: Omit<ForgeState, "task"> = {
  version: "1.0.0",
  iteration: {
    current: 1,
    max: 0,
    currentStartedAt: "",
    history: [],
  },
  criteria: {
    mode: "all",
    requiredScore: 0.8,
    items: [],
  },
  budget: {
    maxCost: null,
    maxDuration: null,
    maxTokens: null,
  },
  checkpoints: {
    auto: {
      enabled: true,
      interval: 10,
      keep: 3,
    },
    items: [],
  },
  stuckDetection: {
    enabled: true,
    sameOutputThreshold: 3,
    noProgressThreshold: 5,
    strategy: "retry-variation",
  },
  qualityGates: [],
  metrics: {
    totalTokens: 0,
    estimatedCost: 0,
    totalDuration: 0,
    filesCreated: [],
    filesModified: [],
  },
  controlCenter: {
    enabled: false,
    url: null,
    projectId: null,
    taskId: null,
  },
};

/** Token costs per model (USD per 1M tokens) */
export interface ModelPricing {
  input: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 4.5 series
  "claude-opus-4-5-20251101": { input: 5, output: 25 },
  // Claude 4.1 series
  "claude-opus-4-1-20250414": { input: 15, output: 75 },
  "claude-sonnet-4-1-20250414": { input: 5, output: 25 },
  // Claude 4 series
  "claude-opus-4-20250514": { input: 15, output: 75 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  // Claude 3.5 series
  "claude-haiku-4-5-20251101": { input: 1, output: 5 },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  // Legacy Claude 3
  "claude-3-opus-20240229": { input: 15, output: 75 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
};

/** Default model for cost estimation */
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/** Get pricing for a model (falls back to default) */
export function getModelPricing(modelId: string): ModelPricing {
  return MODEL_PRICING[modelId] ?? MODEL_PRICING[DEFAULT_MODEL] ?? { input: 3, output: 15 };
}

/** Calculate cost for tokens (USD) */
export function calculateTokenCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string = DEFAULT_MODEL
): number {
  const pricing = getModelPricing(modelId);
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/** @deprecated Use MODEL_PRICING instead */
export const TOKEN_COSTS: Record<string, number> = {
  // Average of input+output for backwards compatibility
  "claude-opus-4-5-20251101": 15,
  "claude-sonnet-4-20250514": 9,
  "claude-3-5-haiku-20241022": 2.4,
  default: 9,
};

/** Default checkpoint interval */
export const DEFAULT_CHECKPOINT_INTERVAL = 10;

/** Default number of checkpoints to keep */
export const DEFAULT_CHECKPOINTS_KEEP = 3;

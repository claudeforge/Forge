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
export const TOKEN_COSTS: Record<string, number> = {
  "claude-sonnet-4-20250514": 0.009,
  "claude-opus-4-20250514": 0.045,
  "claude-haiku-3-5-20241022": 0.002,
  default: 0.009,
};

/** Default checkpoint interval */
export const DEFAULT_CHECKPOINT_INTERVAL = 10;

/** Default number of checkpoints to keep */
export const DEFAULT_CHECKPOINTS_KEEP = 3;

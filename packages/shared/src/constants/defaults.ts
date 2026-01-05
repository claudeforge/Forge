/**
 * FORGE default values
 */

import type { ForgeState } from "../types/state.js";

/** Control Center default URL */
export const CONTROL_CENTER_URL = "http://127.0.0.1:3344";

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

/** Default checkpoint interval */
export const DEFAULT_CHECKPOINT_INTERVAL = 10;

/** Default number of checkpoints to keep */
export const DEFAULT_CHECKPOINTS_KEEP = 3;

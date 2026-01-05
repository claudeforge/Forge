import { describe, it, expect, vi, beforeEach } from "vitest";
import { applyRecovery } from "./recovery.js";
import type { ForgeState } from "@claudeforge/forge-shared";
import type { StuckResult } from "./stuck.js";

// Mock checkpoint manager
vi.mock("../checkpoints/manager.js", () => ({
  rollbackToLatestCheckpoint: vi.fn(),
}));

import { rollbackToLatestCheckpoint } from "../checkpoints/manager.js";

const mockRollback = vi.mocked(rollbackToLatestCheckpoint);

function createMinimalState(strategy: ForgeState["stuckDetection"]["strategy"]): ForgeState {
  return {
    version: "1.0.0",
    task: {
      id: "test-task",
      name: "Test Task",
      prompt: "Test prompt",
      startedAt: new Date().toISOString(),
      status: "running",
    },
    iteration: {
      current: 5,
      max: 30,
      currentStartedAt: new Date().toISOString(),
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
      auto: { enabled: true, interval: 10, keep: 5 },
      items: [],
    },
    stuckDetection: {
      enabled: true,
      sameOutputThreshold: 3,
      noProgressThreshold: 5,
      strategy,
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
}

describe("Recovery Strategies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyRecovery", () => {
    it("should apply retry-variation strategy", async () => {
      const state = createMinimalState("retry-variation");
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "same-output",
        details: "Same output repeated 3 times",
      };

      const result = await applyRecovery(state, stuck);

      expect(result.action).toBe("continue");
      expect(result.promptSuffix).toContain("STUCK DETECTED");
      expect(result.promptSuffix).toContain("COMPLETELY DIFFERENT approach");
    });

    it("should apply simplify strategy", async () => {
      const state = createMinimalState("simplify");
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "no-progress",
        details: "No progress for 5 iterations",
      };

      const result = await applyRecovery(state, stuck);

      expect(result.action).toBe("continue");
      expect(result.promptSuffix).toContain("STUCK DETECTED");
      expect(result.promptSuffix).toContain("too complex");
      expect(result.promptSuffix).toContain("ONE smallest change");
    });

    it("should apply rollback strategy when checkpoint available", async () => {
      const state = createMinimalState("rollback");
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "repeating-error",
        details: "Same error repeated",
      };
      mockRollback.mockResolvedValue(true);

      const result = await applyRecovery(state, stuck);

      expect(result.action).toBe("continue");
      expect(result.promptSuffix).toContain("ROLLBACK PERFORMED");
      expect(result.promptSuffix).toContain("fresh start");
    });

    it("should fallback to variation when rollback fails", async () => {
      const state = createMinimalState("rollback");
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "same-output",
        details: "Same output repeated",
      };
      mockRollback.mockResolvedValue(false);

      const result = await applyRecovery(state, stuck);

      expect(result.action).toBe("continue");
      expect(result.promptSuffix).toContain("no checkpoint available");
      expect(result.promptSuffix).toContain("different approach");
    });

    it("should apply abort strategy", async () => {
      const state = createMinimalState("abort");
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "same-output",
        details: "Same output repeated 3 times",
      };

      const result = await applyRecovery(state, stuck);

      expect(result.action).toBe("abort");
      expect(result.reason).toBe("Same output repeated 3 times");
    });

    it("should handle unknown strategy gracefully", async () => {
      const state = createMinimalState("retry-variation");
      // @ts-expect-error - testing invalid strategy
      state.stuckDetection.strategy = "unknown-strategy";
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "same-output",
        details: "Test",
      };

      const result = await applyRecovery(state, stuck);

      expect(result.action).toBe("continue");
    });

    it("retry-variation should include specific guidance", async () => {
      const state = createMinimalState("retry-variation");
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "same-output",
        details: "Test details",
      };

      const result = await applyRecovery(state, stuck);

      expect(result.promptSuffix).toContain("top-down, try bottom-up");
      expect(result.promptSuffix).toContain("read error messages carefully");
      expect(result.promptSuffix).toContain("**DO NOT**");
    });

    it("simplify should include step-by-step guidance", async () => {
      const state = createMinimalState("simplify");
      const stuck: StuckResult = {
        isStuck: true,
        pattern: "no-progress",
        details: "Test",
      };

      const result = await applyRecovery(state, stuck);

      expect(result.promptSuffix).toContain("STOP");
      expect(result.promptSuffix).toContain("LIST");
      expect(result.promptSuffix).toContain("IDENTIFY");
      expect(result.promptSuffix).toContain("IMPLEMENT");
      expect(result.promptSuffix).toContain("VERIFY");
    });
  });
});

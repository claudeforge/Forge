import { describe, it, expect } from "vitest";
import { detectStuck } from "./stuck.js";
import type { ForgeState, IterationRecord, CriterionResult } from "@claudeforge/forge-shared";

function createIterationRecord(
  n: number,
  summary: string,
  criteriaResults: CriterionResult[] = [],
  outcome: "progress" | "error" = "progress",
  error?: string
): IterationRecord {
  return {
    n,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    duration: 10,
    tokens: 100,
    outcome,
    criteriaResults,
    summary,
    error,
  };
}

function createCriterionResult(passed: boolean): CriterionResult {
  return {
    criterion: {
      id: "1",
      name: "Test",
      type: "command",
      config: {},
      required: true,
      weight: 1,
    },
    passed,
  };
}

function createMinimalState(history: IterationRecord[]): ForgeState {
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
      current: history.length + 1,
      max: 30,
      currentStartedAt: new Date().toISOString(),
      history,
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
        keep: 5,
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
}

describe("Stuck Detection", () => {
  describe("detectStuck", () => {
    it("should return not stuck when detection is disabled", () => {
      const state = createMinimalState([
        createIterationRecord(1, "same output"),
        createIterationRecord(2, "same output"),
        createIterationRecord(3, "same output"),
      ]);
      state.stuckDetection.enabled = false;

      const result = detectStuck(state);

      expect(result.isStuck).toBe(false);
    });

    it("should return not stuck when history is too short", () => {
      const state = createMinimalState([
        createIterationRecord(1, "output"),
      ]);

      const result = detectStuck(state);

      expect(result.isStuck).toBe(false);
    });

    it("should detect same output pattern", () => {
      const state = createMinimalState([
        createIterationRecord(1, "Making progress"),
        createIterationRecord(2, "Same output repeated"),
        createIterationRecord(3, "Same output repeated"),
        createIterationRecord(4, "Same output repeated"),
      ]);
      state.stuckDetection.sameOutputThreshold = 3;

      const result = detectStuck(state);

      expect(result.isStuck).toBe(true);
      expect(result.pattern).toBe("same-output");
    });

    it("should detect same output with case insensitivity", () => {
      const state = createMinimalState([
        createIterationRecord(1, "Starting"),
        createIterationRecord(2, "SAME OUTPUT"),
        createIterationRecord(3, "same output"),
        createIterationRecord(4, "Same Output"),
      ]);
      state.stuckDetection.sameOutputThreshold = 3;

      const result = detectStuck(state);

      expect(result.isStuck).toBe(true);
      expect(result.pattern).toBe("same-output");
    });

    it("should not detect stuck when outputs vary", () => {
      const state = createMinimalState([
        createIterationRecord(1, "First attempt"),
        createIterationRecord(2, "Second attempt"),
        createIterationRecord(3, "Third attempt"),
        createIterationRecord(4, "Fourth attempt"),
      ]);

      const result = detectStuck(state);

      expect(result.isStuck).toBe(false);
    });

    it("should detect no progress when pass rates are stagnant", () => {
      const results = [createCriterionResult(true), createCriterionResult(false)];

      const state = createMinimalState([
        createIterationRecord(1, "Attempt 1", results),
        createIterationRecord(2, "Attempt 2", results),
        createIterationRecord(3, "Attempt 3", results),
        createIterationRecord(4, "Attempt 4", results),
        createIterationRecord(5, "Attempt 5", results),
      ]);
      state.stuckDetection.noProgressThreshold = 5;

      const result = detectStuck(state);

      expect(result.isStuck).toBe(true);
      expect(result.pattern).toBe("no-progress");
    });

    it("should not detect no-progress when criteria are empty", () => {
      // This tests the fix for false positive when no criteria defined
      const state = createMinimalState([
        createIterationRecord(1, "Attempt 1", []),
        createIterationRecord(2, "Attempt 2", []),
        createIterationRecord(3, "Attempt 3", []),
        createIterationRecord(4, "Attempt 4", []),
        createIterationRecord(5, "Attempt 5", []),
      ]);
      state.stuckDetection.noProgressThreshold = 5;

      const result = detectStuck(state);

      // Should NOT be stuck due to no-progress since there are no criteria
      expect(result.pattern).not.toBe("no-progress");
    });

    it("should not detect no-progress when all criteria pass (100%)", () => {
      const results = [createCriterionResult(true), createCriterionResult(true)];

      const state = createMinimalState([
        createIterationRecord(1, "Attempt 1", results),
        createIterationRecord(2, "Attempt 2", results),
        createIterationRecord(3, "Attempt 3", results),
        createIterationRecord(4, "Attempt 4", results),
        createIterationRecord(5, "Attempt 5", results),
      ]);
      state.stuckDetection.noProgressThreshold = 5;

      const result = detectStuck(state);

      // Should NOT be stuck since pass rate is 100%
      expect(result.isStuck).toBe(false);
    });

    it("should detect progress when pass rate improves", () => {
      const state = createMinimalState([
        createIterationRecord(1, "Attempt 1", [createCriterionResult(false)]),
        createIterationRecord(2, "Attempt 2", [createCriterionResult(false)]),
        createIterationRecord(3, "Attempt 3", [createCriterionResult(true)]),
        createIterationRecord(4, "Attempt 4", [createCriterionResult(true)]),
        createIterationRecord(5, "Attempt 5", [createCriterionResult(true)]),
      ]);
      state.stuckDetection.noProgressThreshold = 5;

      const result = detectStuck(state);

      expect(result.isStuck).toBe(false);
    });

    it("should detect repeating error pattern", () => {
      const state = createMinimalState([
        createIterationRecord(1, "Try 1", [], "error", "Connection refused"),
        createIterationRecord(2, "Try 2", [], "error", "Connection refused"),
        createIterationRecord(3, "Try 3", [], "error", "Connection refused"),
      ]);

      const result = detectStuck(state);

      expect(result.isStuck).toBe(true);
      expect(result.pattern).toBe("repeating-error");
    });

    it("should not detect repeating error when errors are different", () => {
      const state = createMinimalState([
        createIterationRecord(1, "Try 1", [], "error", "Error A"),
        createIterationRecord(2, "Try 2", [], "error", "Error B"),
        createIterationRecord(3, "Try 3", [], "error", "Error C"),
      ]);

      const result = detectStuck(state);

      // Different errors shouldn't trigger repeating-error pattern
      expect(result.pattern).not.toBe("repeating-error");
    });

    it("should prioritize same-output over no-progress", () => {
      const results = [createCriterionResult(true), createCriterionResult(false)];

      const state = createMinimalState([
        createIterationRecord(1, "Same output", results),
        createIterationRecord(2, "Same output", results),
        createIterationRecord(3, "Same output", results),
        createIterationRecord(4, "Same output", results),
        createIterationRecord(5, "Same output", results),
      ]);
      state.stuckDetection.sameOutputThreshold = 3;
      state.stuckDetection.noProgressThreshold = 5;

      const result = detectStuck(state);

      // same-output should be detected first (more specific)
      expect(result.pattern).toBe("same-output");
    });
  });
});

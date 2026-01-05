import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCheckpoint,
  rollbackToCheckpoint,
  rollbackToLatestCheckpoint,
  listCheckpoints,
} from "./manager.js";
import type { ForgeState, Checkpoint } from "@claudeforge/forge-shared";

// Mock fs
vi.mock("node:fs", () => ({
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock path
vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
}));

// Mock git utils
vi.mock("../utils/git.js", () => ({
  createStash: vi.fn(),
  applyStash: vi.fn(),
}));

// Mock state
vi.mock("../core/state.js", () => ({
  saveState: vi.fn(),
}));

// Mock shared constants
vi.mock("@claudeforge/forge-shared/constants", () => ({
  CHECKPOINTS_DIR: ".forge/checkpoints",
}));

// Mock shared utils
vi.mock("@claudeforge/forge-shared/utils", () => ({
  generateId: vi.fn(() => "test-checkpoint-id"),
}));

import { mkdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { createStash, applyStash } from "../utils/git.js";
import { saveState } from "../core/state.js";

const mockMkdirSync = vi.mocked(mkdirSync);
const mockExistsSync = vi.mocked(existsSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockUnlinkSync = vi.mocked(unlinkSync);
const mockCreateStash = vi.mocked(createStash);
const mockApplyStash = vi.mocked(applyStash);
const mockSaveState = vi.mocked(saveState);

function createMinimalState(): ForgeState {
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
      strategy: "retry-variation",
    },
    qualityGates: [],
    metrics: {
      totalTokens: 1000,
      totalDuration: 60000,
      filesCreated: ["file1.ts"],
      filesModified: ["file2.ts"],
    },
    controlCenter: {
      enabled: false,
      url: null,
      projectId: null,
      taskId: null,
    },
  };
}

describe("Checkpoint Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCheckpoint", () => {
    it("should create checkpoint directory if not exists", async () => {
      mockExistsSync.mockReturnValue(false);
      mockCreateStash.mockReturnValue("stash-ref-123");
      const state = createMinimalState();

      await createCheckpoint(state, "auto");

      expect(mockMkdirSync).toHaveBeenCalledWith(".forge/checkpoints", { recursive: true });
    });

    it("should create git stash for code snapshot", async () => {
      mockExistsSync.mockReturnValue(true);
      mockCreateStash.mockReturnValue("stash-ref-123");
      const state = createMinimalState();

      const checkpoint = await createCheckpoint(state, "auto");

      expect(mockCreateStash).toHaveBeenCalledWith("forge-checkpoint-iter-5");
      expect(checkpoint?.gitRef).toBe("stash-ref-123");
    });

    it("should handle stash failure gracefully", async () => {
      mockExistsSync.mockReturnValue(true);
      mockCreateStash.mockReturnValue(null);
      const state = createMinimalState();

      const checkpoint = await createCheckpoint(state, "auto");

      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.gitRef).toBe("none");
    });

    it("should save checkpoint metadata to file", async () => {
      mockExistsSync.mockReturnValue(true);
      mockCreateStash.mockReturnValue("stash-ref");
      const state = createMinimalState();

      await createCheckpoint(state, "manual");

      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should add checkpoint to state", async () => {
      mockExistsSync.mockReturnValue(true);
      mockCreateStash.mockReturnValue("stash-ref");
      const state = createMinimalState();

      await createCheckpoint(state, "auto");

      expect(state.checkpoints.items).toHaveLength(1);
      expect(state.checkpoints.items[0]?.type).toBe("auto");
    });

    it("should save updated state", async () => {
      mockExistsSync.mockReturnValue(true);
      mockCreateStash.mockReturnValue("stash-ref");
      const state = createMinimalState();

      await createCheckpoint(state, "auto");

      expect(mockSaveState).toHaveBeenCalledWith(state);
    });

    it("should prune old checkpoints when exceeding keep limit", async () => {
      mockExistsSync.mockReturnValue(true);
      mockCreateStash.mockReturnValue("stash-ref");
      const state = createMinimalState();
      state.checkpoints.auto.keep = 2;
      state.checkpoints.items = [
        { id: "old-1", iteration: 1, createdAt: "", type: "auto", gitRef: "", metrics: state.metrics },
        { id: "old-2", iteration: 2, createdAt: "", type: "auto", gitRef: "", metrics: state.metrics },
      ];

      await createCheckpoint(state, "auto");

      // Should keep only 2 (the limit)
      expect(state.checkpoints.items).toHaveLength(2);
      expect(mockUnlinkSync).toHaveBeenCalled();
    });
  });

  describe("rollbackToCheckpoint", () => {
    it("should return false when checkpoint not found", async () => {
      const state = createMinimalState();

      const result = await rollbackToCheckpoint("nonexistent", state);

      expect(result).toBe(false);
    });

    it("should apply git stash when available", async () => {
      const state = createMinimalState();
      const checkpoint: Checkpoint = {
        id: "cp-1",
        iteration: 3,
        createdAt: new Date().toISOString(),
        type: "auto",
        gitRef: "stash-ref-abc",
        metrics: { totalTokens: 500, totalDuration: 30000, filesCreated: [], filesModified: [] },
      };
      state.checkpoints.items.push(checkpoint);
      mockApplyStash.mockReturnValue(true);

      const result = await rollbackToCheckpoint("cp-1", state);

      expect(result).toBe(true);
      expect(mockApplyStash).toHaveBeenCalledWith("stash-ref-abc");
    });

    it("should skip stash apply when ref is none", async () => {
      const state = createMinimalState();
      const checkpoint: Checkpoint = {
        id: "cp-1",
        iteration: 3,
        createdAt: new Date().toISOString(),
        type: "auto",
        gitRef: "none",
        metrics: { totalTokens: 500, totalDuration: 30000, filesCreated: [], filesModified: [] },
      };
      state.checkpoints.items.push(checkpoint);

      const result = await rollbackToCheckpoint("cp-1", state);

      expect(result).toBe(true);
      expect(mockApplyStash).not.toHaveBeenCalled();
    });

    it("should continue even when stash apply fails", async () => {
      const state = createMinimalState();
      const checkpoint: Checkpoint = {
        id: "cp-1",
        iteration: 3,
        createdAt: new Date().toISOString(),
        type: "auto",
        gitRef: "stash-ref",
        metrics: { totalTokens: 500, totalDuration: 30000, filesCreated: [], filesModified: [] },
      };
      state.checkpoints.items.push(checkpoint);
      mockApplyStash.mockReturnValue(false);

      const result = await rollbackToCheckpoint("cp-1", state);

      // Should still succeed (state rollback works)
      expect(result).toBe(true);
    });

    it("should restore metrics from checkpoint", async () => {
      const state = createMinimalState();
      const checkpointMetrics = {
        totalTokens: 500,
        totalDuration: 30000,
        filesCreated: ["old.ts"],
        filesModified: ["mod.ts"],
      };
      const checkpoint: Checkpoint = {
        id: "cp-1",
        iteration: 3,
        createdAt: new Date().toISOString(),
        type: "auto",
        gitRef: "none",
        metrics: checkpointMetrics,
      };
      state.checkpoints.items.push(checkpoint);

      await rollbackToCheckpoint("cp-1", state);

      expect(state.metrics).toEqual(checkpointMetrics);
    });

    it("should reset iteration to checkpoint", async () => {
      const state = createMinimalState();
      state.iteration.current = 10;
      const checkpoint: Checkpoint = {
        id: "cp-1",
        iteration: 3,
        createdAt: new Date().toISOString(),
        type: "auto",
        gitRef: "none",
        metrics: state.metrics,
      };
      state.checkpoints.items.push(checkpoint);

      await rollbackToCheckpoint("cp-1", state);

      expect(state.iteration.current).toBe(3);
    });

    it("should save state after rollback", async () => {
      const state = createMinimalState();
      const checkpoint: Checkpoint = {
        id: "cp-1",
        iteration: 3,
        createdAt: new Date().toISOString(),
        type: "auto",
        gitRef: "none",
        metrics: state.metrics,
      };
      state.checkpoints.items.push(checkpoint);

      await rollbackToCheckpoint("cp-1", state);

      expect(mockSaveState).toHaveBeenCalledWith(state);
    });
  });

  describe("rollbackToLatestCheckpoint", () => {
    it("should return false when no checkpoints exist", async () => {
      const state = createMinimalState();

      const result = await rollbackToLatestCheckpoint(state);

      expect(result).toBe(false);
    });

    it("should rollback to most recent checkpoint by iteration", async () => {
      const state = createMinimalState();
      state.checkpoints.items = [
        { id: "cp-1", iteration: 3, createdAt: "", type: "auto", gitRef: "none", metrics: state.metrics },
        { id: "cp-2", iteration: 7, createdAt: "", type: "auto", gitRef: "none", metrics: state.metrics },
        { id: "cp-3", iteration: 5, createdAt: "", type: "auto", gitRef: "none", metrics: state.metrics },
      ];

      await rollbackToLatestCheckpoint(state);

      expect(state.iteration.current).toBe(7); // Highest iteration
    });
  });

  describe("listCheckpoints", () => {
    it("should return checkpoints sorted by iteration descending", () => {
      const state = createMinimalState();
      state.checkpoints.items = [
        { id: "cp-1", iteration: 3, createdAt: "", type: "auto", gitRef: "", metrics: state.metrics },
        { id: "cp-2", iteration: 7, createdAt: "", type: "auto", gitRef: "", metrics: state.metrics },
        { id: "cp-3", iteration: 5, createdAt: "", type: "auto", gitRef: "", metrics: state.metrics },
      ];

      const result = listCheckpoints(state);

      expect(result[0]?.iteration).toBe(7);
      expect(result[1]?.iteration).toBe(5);
      expect(result[2]?.iteration).toBe(3);
    });

    it("should return empty array when no checkpoints", () => {
      const state = createMinimalState();

      const result = listCheckpoints(state);

      expect(result).toEqual([]);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadState, saveState, deleteState, isForgeActive } from "./state.js";
import type { ForgeState } from "@claudeforge/forge-shared";

// Mock fs
vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock path
vi.mock("node:path", () => ({
  dirname: vi.fn(() => ".claude"),
}));

// Mock shared utils
vi.mock("@claudeforge/forge-shared/utils", () => ({
  validateState: vi.fn(),
}));

// Mock shared constants
vi.mock("@claudeforge/forge-shared/constants", () => ({
  STATE_FILE: ".claude/forge-state.json",
}));

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import { validateState } from "@claudeforge/forge-shared/utils";

const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockExistsSync = vi.mocked(existsSync);
const mockUnlinkSync = vi.mocked(unlinkSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockValidateState = vi.mocked(validateState);

const createValidState = (): ForgeState => ({
  version: "1.0.0",
  task: {
    id: "test-task",
    name: "Test Task",
    prompt: "Test prompt",
    startedAt: new Date().toISOString(),
    status: "running",
  },
  iteration: {
    current: 1,
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
});

describe("State Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadState", () => {
    it("should return null when state file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadState();

      expect(result).toBeNull();
    });

    it("should return state when file exists and is valid", () => {
      const validState = createValidState();
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(validState));
      mockValidateState.mockReturnValue(true);

      const result = loadState();

      expect(result).toEqual(validState);
    });

    it("should return null when state is invalid", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ invalid: true }));
      mockValidateState.mockReturnValue(false);

      const result = loadState();

      expect(result).toBeNull();
    });

    it("should return null when JSON parsing fails", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("not valid json");

      const result = loadState();

      expect(result).toBeNull();
    });

    it("should return null when file read throws", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Read error");
      });

      const result = loadState();

      expect(result).toBeNull();
    });
  });

  describe("saveState", () => {
    it("should save state to file and return true", () => {
      const state = createValidState();
      mockExistsSync.mockReturnValue(true);

      const result = saveState(state);

      expect(result).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should create directory if it does not exist", () => {
      const state = createValidState();
      mockExistsSync.mockReturnValue(false);

      saveState(state);

      expect(mockMkdirSync).toHaveBeenCalledWith(".claude", { recursive: true });
    });

    it("should return false when write fails", () => {
      const state = createValidState();
      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Write error");
      });

      const result = saveState(state);

      expect(result).toBe(false);
    });
  });

  describe("deleteState", () => {
    it("should delete state file when it exists", () => {
      mockExistsSync.mockReturnValue(true);

      deleteState();

      expect(mockUnlinkSync).toHaveBeenCalledWith(".claude/forge-state.json");
    });

    it("should not throw when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => deleteState()).not.toThrow();
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });
  });

  describe("isForgeActive", () => {
    it("should return true when state exists and status is running", () => {
      const state = createValidState();
      state.task.status = "running";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));
      mockValidateState.mockReturnValue(true);

      const result = isForgeActive();

      expect(result).toBe(true);
    });

    it("should return false when state does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = isForgeActive();

      expect(result).toBe(false);
    });

    it("should return false when status is not running", () => {
      const state = createValidState();
      state.task.status = "completed";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(state));
      mockValidateState.mockReturnValue(true);

      const result = isForgeActive();

      expect(result).toBe(false);
    });
  });
});

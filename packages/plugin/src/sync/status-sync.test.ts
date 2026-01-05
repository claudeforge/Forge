import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  syncTaskStatus,
  syncTaskComplete,
  processPendingSync,
  getPendingSyncCount,
  hasPendingSync,
  completeQueueTask,
} from "./status-sync.js";
import type { ForgeState, CriterionResult } from "@claudeforge/forge-shared";

// Mock fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock path
vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
  dirname: vi.fn(() => ".forge"),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

function createMinimalState(enabled: boolean = true): ForgeState {
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
      enabled,
      url: "http://localhost:3344",
      projectId: "project-123",
      taskId: "task-456",
    },
  };
}

describe("Status Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  describe("syncTaskStatus", () => {
    it("should return true when control center is not enabled", async () => {
      const state = createMinimalState(false);

      const result = await syncTaskStatus(state, "running");

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return true when url is missing", async () => {
      const state = createMinimalState();
      state.controlCenter.url = null;

      const result = await syncTaskStatus(state, "running");

      expect(result).toBe(true);
    });

    it("should return true when projectId is missing", async () => {
      const state = createMinimalState();
      state.controlCenter.projectId = null;

      const result = await syncTaskStatus(state, "running");

      expect(result).toBe(true);
    });

    it("should send status update to correct endpoint", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();

      await syncTaskStatus(state, "completed");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3344/api/projects/project-123/task-defs/test-task/status",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should include status and result in body", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();
      const result = {
        success: true,
        iterations: 5,
        duration: 60000,
        tokens: 1000,
        filesCreated: ["file.ts"],
        filesModified: [],
        summary: "Completed",
      };

      await syncTaskStatus(state, "completed", result);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body);
      expect(body.status).toBe("completed");
      expect(body.result).toEqual(result);
    });

    it("should return true on successful response", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();

      const result = await syncTaskStatus(state, "running");

      expect(result).toBe(true);
    });

    it("should retry on failure and queue if all retries fail", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ updates: [] }));
      const state = createMinimalState();

      const result = await syncTaskStatus(state, "running");

      expect(result).toBe(false);
      // Should have tried 3 times
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Should have queued the update
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should remove from queue on successful sync", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [{ update: { taskId: "test-task" }, controlUrl: "", attempts: 0, lastAttempt: "" }]
      }));
      const state = createMinimalState();

      await syncTaskStatus(state, "running");

      // Should write queue without this task
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should handle fetch error (network error) and queue for retry", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ updates: [] }));
      const state = createMinimalState();

      const result = await syncTaskStatus(state, "running");

      expect(result).toBe(false);
      // Should have tried 3 times
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Should have queued the update
      expect(mockWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("syncTaskComplete", () => {
    it("should include criteria results in sync", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();
      state.task.status = "completed";
      const criteriaResults: CriterionResult[] = [
        {
          criterion: { id: "1", name: "Test", type: "command", config: {}, required: true, weight: 1 },
          passed: true,
        },
      ];

      await syncTaskComplete(state, criteriaResults);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body);
      expect(body.result.criteriaResults).toBeDefined();
      expect(body.result.criteriaResults[0].passed).toBe(true);
    });
  });

  describe("processPendingSync", () => {
    it("should return zeros when no pending syncs", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await processPendingSync();

      expect(result).toEqual({ processed: 0, failed: 0 });
    });

    it("should process pending syncs", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [
          {
            update: { taskId: "task-1", projectId: "proj", status: "completed", timestamp: "" },
            controlUrl: "http://localhost:3344",
            attempts: 0,
            lastAttempt: "",
          },
        ],
      }));
      mockFetch.mockResolvedValue({ ok: true });

      const result = await processPendingSync();

      expect(result.processed).toBe(1);
    });

    it("should skip updates that exceeded max retries", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [
          {
            update: { taskId: "task-1", projectId: "proj", status: "completed", timestamp: "" },
            controlUrl: "http://localhost:3344",
            attempts: 10, // Max attempts
            lastAttempt: "",
          },
        ],
      }));

      const result = await processPendingSync();

      expect(result.failed).toBe(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should increment attempt count on failure", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [
          {
            update: { taskId: "task-1", projectId: "proj", status: "completed", timestamp: "" },
            controlUrl: "http://localhost:3344",
            attempts: 5,
            lastAttempt: "",
          },
        ],
      }));
      mockFetch.mockResolvedValue({ ok: false });

      await processPendingSync();

      // Should have updated the queue with incremented attempt
      expect(mockWriteFileSync).toHaveBeenCalled();
    });
  });

  describe("getPendingSyncCount", () => {
    it("should return 0 when no pending file", () => {
      mockExistsSync.mockReturnValue(false);

      const count = getPendingSyncCount();

      expect(count).toBe(0);
    });

    it("should return count of pending updates", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [{ update: {} }, { update: {} }],
      }));

      const count = getPendingSyncCount();

      expect(count).toBe(2);
    });

    it("should return 0 when file is corrupted", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("corrupted json {{{");

      const count = getPendingSyncCount();

      expect(count).toBe(0);
    });
  });

  describe("queueUpdate edge cases", () => {
    it("should replace existing pending update for same task", async () => {
      // First sync will fail and queue
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [{
          update: { taskId: "test-task", projectId: "project-123", status: "running", timestamp: "" },
          controlUrl: "http://localhost:3344",
          attempts: 1,
          lastAttempt: "",
        }]
      }));
      const state = createMinimalState();

      await syncTaskStatus(state, "completed");

      // The queue should have been updated (replaced) not appended
      expect(mockWriteFileSync).toHaveBeenCalled();
      const written = JSON.parse(mockWriteFileSync.mock.calls[mockWriteFileSync.mock.calls.length - 1][1] as string);
      // Should still have only 1 update (replaced, not appended)
      expect(written.updates.length).toBe(1);
      expect(written.updates[0].update.status).toBe("completed");
    });
  });

  describe("hasPendingSync", () => {
    it("should return false when no pending file", () => {
      mockExistsSync.mockReturnValue(false);

      const result = hasPendingSync("task-1");

      expect(result).toBe(false);
    });

    it("should return true when task has pending sync", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [{ update: { taskId: "task-1" } }],
      }));

      const result = hasPendingSync("task-1");

      expect(result).toBe(true);
    });

    it("should return false when task has no pending sync", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        updates: [{ update: { taskId: "other-task" } }],
      }));

      const result = hasPendingSync("task-1");

      expect(result).toBe(false);
    });
  });

  describe("completeQueueTask", () => {
    it("should return true when control center is not enabled", async () => {
      const state = createMinimalState(false);

      const result = await completeQueueTask(state, []);

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should return true when taskId is missing", async () => {
      const state = createMinimalState();
      state.controlCenter.taskId = null;

      const result = await completeQueueTask(state, []);

      expect(result).toBe(true);
    });

    it("should send complete request to correct endpoint", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();

      await completeQueueTask(state, []);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3344/api/tasks/task-456/complete",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should return false on failed response", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      const state = createMinimalState();

      const result = await completeQueueTask(state, []);

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const state = createMinimalState();

      const result = await completeQueueTask(state, []);

      expect(result).toBe(false);
    });

    it("should include criteria results in complete request", async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const state = createMinimalState();
      const criteriaResults: CriterionResult[] = [
        {
          criterion: { id: "crit-1", name: "Test Criterion", type: "command", config: {}, required: true, weight: 1 },
          passed: true,
        },
        {
          criterion: { id: "crit-2", name: "Another Criterion", type: "test-pass", config: {}, required: false, weight: 2 },
          passed: false,
        },
      ];

      const result = await completeQueueTask(state, criteriaResults);

      expect(result).toBe(true);
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body);
      expect(body.result.criteriaResults).toHaveLength(2);
      expect(body.result.criteriaResults[0].id).toBe("crit-1");
      expect(body.result.criteriaResults[0].name).toBe("Test Criterion");
      expect(body.result.criteriaResults[0].passed).toBe(true);
      expect(body.result.criteriaResults[1].id).toBe("crit-2");
      expect(body.result.criteriaResults[1].passed).toBe(false);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadExecution,
  saveExecution,
  initExecution,
  updateTaskStatus,
  updateIteration,
  getNextQueuedTask,
  setQueuePaused,
  syncQueueFromServer,
  getExecutionSummary,
} from "./execution.js";
import type { ExecutionFile } from "@claudeforge/forge-shared";

// Mock fs
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Mock shared constants
vi.mock("@claudeforge/forge-shared/constants", () => ({
  EXECUTION_FILE: ".forge/execution.json",
  FORGE_DIR: ".forge",
}));

// Mock shared defaults
vi.mock("@claudeforge/forge-shared", () => ({
  DEFAULT_EXECUTION: {
    projectId: null,
    controlUrl: null,
    queue: [],
    current: {
      taskId: null,
      iteration: 0,
      startedAt: null,
      isPaused: false,
    },
    lastUpdated: null,
    lastUpdatedBy: null,
  },
}));

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

function createDefaultExecution(): ExecutionFile {
  return {
    version: "1.0",
    projectId: "",
    controlUrl: "",
    queue: [],
    current: {
      taskId: null,
      iteration: 0,
      startedAt: null,
      isPaused: false,
    },
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: "server",
  };
}

function createExecutionWithTasks(): ExecutionFile {
  return {
    version: "1.0",
    projectId: "proj-1",
    controlUrl: "http://localhost:3344",
    queue: [
      {
        id: "task-1",
        name: "Task 1",
        status: "queued",
        priority: 0,
        prompt: "Do task 1",
        queuedAt: "2024-01-01",
        startedAt: null,
        completedAt: null,
        iteration: 0,
        maxIterations: 30,
      },
      {
        id: "task-2",
        name: "Task 2",
        status: "queued",
        priority: 1,
        prompt: "Do task 2",
        queuedAt: "2024-01-01",
        startedAt: null,
        completedAt: null,
        iteration: 0,
        maxIterations: 30,
      },
    ],
    current: {
      taskId: null,
      iteration: 0,
      startedAt: null,
      isPaused: false,
    },
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: "server",
  };
}

describe("Execution File Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadExecution", () => {
    it("should return default when file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const result = loadExecution();

      expect(result.queue).toEqual([]);
      expect(result.current.taskId).toBeNull();
    });

    it("should load and parse existing file", () => {
      const execution = createExecutionWithTasks();
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      const result = loadExecution();

      expect(result.queue).toHaveLength(2);
      expect(result.projectId).toBe("proj-1");
    });

    it("should return default on parse error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("invalid json");

      const result = loadExecution();

      expect(result.queue).toEqual([]);
    });

    it("should return default on read error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Read error");
      });

      const result = loadExecution();

      expect(result.queue).toEqual([]);
    });
  });

  describe("saveExecution", () => {
    it("should create directory if not exists", () => {
      mockExistsSync.mockReturnValue(false);
      const execution = createDefaultExecution();

      saveExecution(execution);

      expect(mockMkdirSync).toHaveBeenCalledWith(".forge", { recursive: true });
    });

    it("should update lastUpdated and lastUpdatedBy", () => {
      mockExistsSync.mockReturnValue(true);
      const execution = createDefaultExecution();

      saveExecution(execution);

      expect(mockWriteFileSync).toHaveBeenCalled();
      const call = mockWriteFileSync.mock.calls[0];
      const saved = JSON.parse(call?.[1] as string);
      expect(saved.lastUpdated).toBeDefined();
      expect(saved.lastUpdatedBy).toBe("plugin");
    });

    it("should not throw on write error", () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Write error");
      });
      const execution = createDefaultExecution();

      expect(() => saveExecution(execution)).not.toThrow();
    });
  });

  describe("initExecution", () => {
    it("should initialize execution with project and task", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(createDefaultExecution()));

      const result = initExecution("proj-1", "http://localhost", {
        id: "task-1",
        name: "Task 1",
        prompt: "Do task 1",
        maxIterations: 30,
      });

      expect(result.projectId).toBe("proj-1");
      expect(result.controlUrl).toBe("http://localhost");
      expect(result.queue).toHaveLength(1);
      expect(result.current.taskId).toBe("task-1");
    });

    it("should update existing task if already in queue", () => {
      const execution = createExecutionWithTasks();
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      const result = initExecution("proj-1", "http://localhost", {
        id: "task-1",
        name: "Task 1",
        prompt: "Do task 1",
        maxIterations: 30,
      });

      expect(result.queue).toHaveLength(2); // Same count
      expect(result.queue[0]?.status).toBe("running");
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status", () => {
      const execution = createExecutionWithTasks();
      execution.queue[0]!.status = "running";
      execution.current.taskId = "task-1";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      updateTaskStatus("task-1", "completed", { success: true, iterations: 5, duration: 60, summary: "Done" });

      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it("should clear current when task completes", () => {
      const execution = createExecutionWithTasks();
      execution.queue[0]!.status = "running";
      execution.current.taskId = "task-1";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      updateTaskStatus("task-1", "completed");

      const call = mockWriteFileSync.mock.calls[0];
      const saved = JSON.parse(call?.[1] as string);
      expect(saved.current.taskId).toBeNull();
    });

    it("should do nothing if task not found", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(createDefaultExecution()));

      updateTaskStatus("nonexistent", "completed");

      // Should still save (but without changes to a task)
    });
  });

  describe("updateIteration", () => {
    it("should update iteration in task and current", () => {
      const execution = createExecutionWithTasks();
      execution.queue[0]!.status = "running";
      execution.current.taskId = "task-1";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      updateIteration("task-1", 5);

      const call = mockWriteFileSync.mock.calls[0];
      const saved = JSON.parse(call?.[1] as string);
      expect(saved.queue[0].iteration).toBe(5);
      expect(saved.current.iteration).toBe(5);
    });
  });

  describe("getNextQueuedTask", () => {
    it("should return first queued task by priority", () => {
      const execution = createExecutionWithTasks();
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      const next = getNextQueuedTask();

      expect(next?.id).toBe("task-1");
      expect(next?.priority).toBe(0);
    });

    it("should return null when no queued tasks", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(createDefaultExecution()));

      const next = getNextQueuedTask();

      expect(next).toBeNull();
    });

    it("should skip running and completed tasks", () => {
      const execution = createExecutionWithTasks();
      execution.queue[0]!.status = "running";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      const next = getNextQueuedTask();

      expect(next?.id).toBe("task-2");
    });
  });

  describe("setQueuePaused", () => {
    it("should set isPaused to true", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(createDefaultExecution()));

      setQueuePaused(true);

      const call = mockWriteFileSync.mock.calls[0];
      const saved = JSON.parse(call?.[1] as string);
      expect(saved.current.isPaused).toBe(true);
    });

    it("should set isPaused to false", () => {
      const execution = createDefaultExecution();
      execution.current.isPaused = true;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      setQueuePaused(false);

      const call = mockWriteFileSync.mock.calls[0];
      const saved = JSON.parse(call?.[1] as string);
      expect(saved.current.isPaused).toBe(false);
    });
  });

  describe("syncQueueFromServer", () => {
    it("should merge server queue with local state", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(createDefaultExecution()));

      syncQueueFromServer([
        { id: "new-1", name: "New Task", prompt: "Do it", priority: 0, status: "queued", maxIterations: 30 },
      ]);

      const call = mockWriteFileSync.mock.calls[0];
      const saved = JSON.parse(call?.[1] as string);
      expect(saved.queue).toHaveLength(1);
      expect(saved.queue[0].id).toBe("new-1");
    });

    it("should preserve local state for running tasks", () => {
      const execution = createExecutionWithTasks();
      execution.queue[0]!.status = "running";
      execution.queue[0]!.iteration = 5;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      syncQueueFromServer([
        { id: "task-1", name: "Task 1", prompt: "Do it", priority: 2, status: "queued", maxIterations: 30 },
      ]);

      const call = mockWriteFileSync.mock.calls[0];
      const saved = JSON.parse(call?.[1] as string);
      expect(saved.queue[0].status).toBe("running"); // Preserved
      expect(saved.queue[0].iteration).toBe(5); // Preserved
      expect(saved.queue[0].priority).toBe(2); // Updated
    });
  });

  describe("getExecutionSummary", () => {
    it("should return summary of execution state", () => {
      const execution = createExecutionWithTasks();
      execution.queue[0]!.status = "running";
      execution.current.taskId = "task-1";
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(execution));

      const summary = getExecutionSummary();

      expect(summary.total).toBe(2);
      expect(summary.queued).toBe(1);
      expect(summary.running).toBe(1);
      expect(summary.completed).toBe(0);
      expect(summary.failed).toBe(0);
      expect(summary.currentTask).toBe("task-1");
    });

    it("should return zeros for empty queue", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(createDefaultExecution()));

      const summary = getExecutionSummary();

      expect(summary.total).toBe(0);
      expect(summary.currentTask).toBeNull();
    });
  });
});

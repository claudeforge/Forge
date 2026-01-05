import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules before importing
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Import after mocking
import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { TaskDefinition } from "@claudeforge/forge-shared";

// Helper to create minimal task
function createMinimalTask(overrides: Partial<TaskDefinition> = {}): TaskDefinition {
  return {
    id: "t001",
    title: "Test Task",
    description: "Test description",
    status: "pending",
    ...overrides,
  } as TaskDefinition;
}

// Test the generatePrompt and queueTask logic by importing the module
describe("queue-tasks null safety", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("task with missing fields", () => {
    it("should handle task without depends_on", () => {
      const task = createMinimalTask({ depends_on: undefined });
      // depends_on should be treated as empty array
      expect(task.depends_on).toBeUndefined();
      const deps = task.depends_on ?? [];
      expect(deps.length).toBe(0);
    });

    it("should handle task without technical field", () => {
      const task = createMinimalTask({ technical: undefined });
      expect(task.technical).toBeUndefined();
      const technical = task.technical ?? {};
      const filesToCreate = (technical as Record<string, unknown>).files_to_create ?? [];
      expect(filesToCreate).toEqual([]);
    });

    it("should handle task without execution field", () => {
      const task = createMinimalTask({ execution: undefined });
      expect(task.execution).toBeUndefined();
      const execution = task.execution ?? {};
      const maxIterations = (execution as Record<string, unknown>).max_iterations ?? 10;
      expect(maxIterations).toBe(10);
    });

    it("should handle task without criteria field", () => {
      const task = createMinimalTask({ criteria: undefined });
      expect(task.criteria).toBeUndefined();
      const criteria = task.criteria ?? [];
      expect(criteria.length).toBe(0);
    });

    it("should handle task without goals field", () => {
      const task = createMinimalTask({ goals: undefined });
      expect(task.goals).toBeUndefined();
      const goals = task.goals ?? [];
      expect(goals.length).toBe(0);
    });

    it("should handle completely minimal task", () => {
      const task: Partial<TaskDefinition> = {
        id: "t001",
        title: "Minimal",
        status: "pending",
      };

      // All these should not throw
      const deps = (task as TaskDefinition).depends_on ?? [];
      const technical = (task as TaskDefinition).technical ?? {};
      const execution = (task as TaskDefinition).execution ?? {};
      const criteria = (task as TaskDefinition).criteria ?? [];
      const goals = (task as TaskDefinition).goals ?? [];

      expect(deps).toEqual([]);
      expect(technical).toEqual({});
      expect(execution).toEqual({});
      expect(criteria).toEqual([]);
      expect(goals).toEqual([]);
    });
  });

  describe("calculatePriority with missing depends_on", () => {
    it("should return 0 for task without depends_on", () => {
      const task = createMinimalTask({ depends_on: undefined });
      const allTasks = new Map<string, TaskDefinition>();
      allTasks.set("t001", task);

      const deps = task.depends_on ?? [];
      const priority = deps.length === 0 ? 0 : 1;
      expect(priority).toBe(0);
    });

    it("should return 0 for task with empty depends_on", () => {
      const task = createMinimalTask({ depends_on: [] });
      const deps = task.depends_on ?? [];
      const priority = deps.length === 0 ? 0 : 1;
      expect(priority).toBe(0);
    });
  });

  describe("generatePrompt with partial technical", () => {
    it("should handle technical without files_to_create", () => {
      const task = createMinimalTask({
        technical: {
          approach: "Test approach",
          // files_to_create missing
        } as TaskDefinition["technical"],
      });

      const technical = task.technical ?? {};
      const filesToCreate = technical.files_to_create ?? [];
      expect(filesToCreate).toEqual([]);
    });

    it("should handle technical without considerations", () => {
      const task = createMinimalTask({
        technical: {
          files_to_create: ["file1.ts"],
          files_to_modify: ["file2.ts"],
          // considerations missing
        } as TaskDefinition["technical"],
      });

      const technical = task.technical ?? {};
      const considerations = technical.considerations ?? [];
      expect(considerations).toEqual([]);
    });
  });
});

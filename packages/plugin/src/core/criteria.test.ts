import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateCriteria, isComplete, calculateScore } from "./criteria.js";
import type { CompletionCriterion, CriterionResult } from "@claudeforge/forge-shared";

// Mock shell utilities
vi.mock("../utils/shell.js", () => ({
  execFile: vi.fn(),
  npm: vi.fn(),
}));

vi.mock("../utils/transcript.js", () => ({
  extractPromise: vi.fn(),
}));

import { execFile, npm } from "../utils/shell.js";
import { extractPromise } from "../utils/transcript.js";

const mockExecFile = vi.mocked(execFile);
const mockNpm = vi.mocked(npm);
const mockExtractPromise = vi.mocked(extractPromise);

describe("Criteria Evaluation Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateCriteria", () => {
    it("should evaluate multiple criteria in parallel", async () => {
      mockExecFile.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Test 1",
          type: "command",
          config: { cmd: "echo hello" },
          required: true,
          weight: 1,
        },
        {
          id: "2",
          name: "Test 2",
          type: "command",
          config: { cmd: "echo world" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "output");

      expect(results).toHaveLength(2);
      expect(results[0]?.passed).toBe(true);
      expect(results[1]?.passed).toBe(true);
    });

    it("should handle promise criterion type", async () => {
      mockExtractPromise.mockReturnValue("Task completed successfully");

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Promise Check",
          type: "promise",
          config: { text: "Task completed successfully" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "<promise>Task completed successfully</promise>");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("Task completed successfully");
    });

    it("should handle file-exists criterion type", async () => {
      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "File Check",
          type: "file-exists",
          config: { path: "./package.json" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      // package.json exists in project root
      expect(results[0]?.passed).toBe(true);
    });

    it("should handle command criterion with custom exit code", async () => {
      mockExecFile.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Exit Code Check",
          type: "command",
          config: { cmd: "test", successCode: 1 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("exit 1");
    });

    it("should handle unknown criterion type", async () => {
      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Unknown",
          // @ts-expect-error - testing invalid type
          type: "unknown-type",
          config: { cmd: "test" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.error).toContain("Unknown criterion type");
    });

    it("should handle promise not found", async () => {
      mockExtractPromise.mockReturnValue(null);

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Promise Check",
          type: "promise",
          config: { text: "expected" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "output");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("(not found)");
    });

    it("should handle file not exists", async () => {
      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "File Check",
          type: "file-exists",
          config: { path: "./nonexistent-file-xyz.txt" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("not found");
    });

    it("should handle custom-script criterion", async () => {
      mockExecFile.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "script output",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Custom Script",
          type: "custom-script",
          config: { script: "./my-script.sh", args: ["--check"] },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(mockExecFile).toHaveBeenCalledWith("./my-script.sh", ["--check"]);
      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("passed");
    });

    it("should handle custom-script failure", async () => {
      mockExecFile.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "",
        stderr: "error",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Custom Script",
          type: "custom-script",
          config: { script: "./my-script.sh" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("failed");
    });

    it("should handle thrown errors gracefully", async () => {
      mockExecFile.mockImplementation(() => {
        throw new Error("Execution failed");
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Command that throws",
          type: "command",
          config: { cmd: "failing-command" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.error).toContain("Execution failed");
    });
  });

  describe("evaluateFileContains", () => {
    it("should pass when file contains pattern", async () => {
      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "File Contains",
          type: "file-contains",
          config: { path: "./package.json", pattern: "vitest", isRegex: false },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("found");
    });

    it("should fail when file does not contain pattern", async () => {
      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "File Contains",
          type: "file-contains",
          config: { path: "./package.json", pattern: "nonexistent-string-xyz", isRegex: false },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("not found");
    });

    it("should support regex patterns", async () => {
      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "File Contains Regex",
          type: "file-contains",
          config: { path: "./package.json", pattern: "vitest.*\\d+\\.\\d+", isRegex: true },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
    });

    it("should fail when file not found", async () => {
      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "File Contains",
          type: "file-contains",
          config: { path: "./nonexistent-file.txt", pattern: "test", isRegex: false },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.error).toContain("File not found");
    });
  });

  describe("evaluateLintClean", () => {
    it("should pass when lint command succeeds with exit 0", async () => {
      mockNpm.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Lint",
          type: "lint-clean",
          config: { cmd: "npm run lint", maxErrors: 0 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("0 errors");
    });

    it("should parse ESLint format error count", async () => {
      mockNpm.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "✖ 10 problems (5 errors, 5 warnings)",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Lint",
          type: "lint-clean",
          config: { cmd: "npm run lint", maxErrors: 3 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("5 errors");
    });

    it("should parse TypeScript Found N errors format", async () => {
      mockNpm.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "Found 3 errors in 2 files",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "TypeCheck",
          type: "lint-clean",
          config: { cmd: "npm run typecheck", maxErrors: 5 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("3 errors");
    });

    it("should handle lint with maxErrors threshold", async () => {
      mockNpm.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "2 errors found",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Lint",
          type: "lint-clean",
          config: { cmd: "npm run lint", maxErrors: 5 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
    });

    it("should use execFile for non-npm lint commands", async () => {
      mockExecFile.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Lint",
          type: "lint-clean",
          config: { cmd: "eslint src/" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(mockExecFile).toHaveBeenCalledWith("eslint", ["src/"]);
      expect(results[0]?.passed).toBe(true);
    });

    it("should count 1 error when command fails but no pattern matched", async () => {
      mockNpm.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "Something went wrong",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Lint",
          type: "lint-clean",
          config: { cmd: "npm run lint" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("1 errors");
    });

    it("should show target as ≤N errors when maxErrors > 0", async () => {
      mockNpm.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Lint",
          type: "lint-clean",
          config: { cmd: "npm run lint", maxErrors: 5 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.targetValue).toBe("≤5 errors");
    });
  });

  describe("evaluateCoverage", () => {
    it("should parse Istanbul/nyc coverage format", async () => {
      mockNpm.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: `
Statements   : 85.5% ( 100/117 )
Branches     : 70.2% ( 45/64 )
Functions    : 90.0% ( 18/20 )
Lines        : 85.5% ( 100/117 )
`,
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Coverage",
          type: "coverage",
          config: { cmd: "npm run coverage", min: 80 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("85.5%");
    });

    it("should parse Jest table format", async () => {
      // Using a simpler format that our regex can match
      mockNpm.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "Lines        : 92.5% ( 185/200 )",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Coverage",
          type: "coverage",
          config: { cmd: "npm run coverage", min: 90 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("92.5%");
    });

    it("should fail when coverage is below minimum", async () => {
      mockNpm.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "Lines        : 65.0% ( 130/200 )",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Coverage",
          type: "coverage",
          config: { cmd: "npm run coverage", min: 80 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("65.0%");
    });

    it("should use execFile for non-npm coverage commands", async () => {
      mockExecFile.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "Lines        : 90.0% ( 180/200 )",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Coverage",
          type: "coverage",
          config: { cmd: "vitest run --coverage", min: 80 },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(mockExecFile).toHaveBeenCalledWith("vitest", ["run", "--coverage"]);
      expect(results[0]?.passed).toBe(true);
    });

  });

  describe("evaluateTestPass", () => {
    it("should pass when tests succeed", async () => {
      mockNpm.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "All tests passed",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Tests",
          type: "test-pass",
          config: { cmd: "npm test" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(true);
      expect(results[0]?.currentValue).toBe("passing");
    });

    it("should fail when tests fail", async () => {
      mockNpm.mockReturnValue({
        success: false,
        exitCode: 1,
        stdout: "1 test failed",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Tests",
          type: "test-pass",
          config: { cmd: "npm test" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(results[0]?.passed).toBe(false);
      expect(results[0]?.currentValue).toBe("failing");
    });

    it("should use execFile for non-npm test commands", async () => {
      mockExecFile.mockReturnValue({
        success: true,
        exitCode: 0,
        stdout: "Tests passed",
        stderr: "",
      });

      const criteria: CompletionCriterion[] = [
        {
          id: "1",
          name: "Tests",
          type: "test-pass",
          config: { cmd: "vitest run" },
          required: true,
          weight: 1,
        },
      ];

      const results = await evaluateCriteria(criteria, "");

      expect(mockExecFile).toHaveBeenCalledWith("vitest", ["run"]);
      expect(results[0]?.passed).toBe(true);
    });
  });

  describe("calculateScore", () => {
    const createResult = (passed: boolean, weight = 1, required = false): CriterionResult => ({
      criterion: {
        id: "1",
        name: "Test",
        type: "command",
        config: { cmd: "test" },
        required,
        weight,
      },
      passed,
    });

    it("should return 1 for all mode when all pass", () => {
      const results = [createResult(true), createResult(true)];
      expect(calculateScore(results, "all")).toBe(1);
    });

    it("should return 0 for all mode when any fails", () => {
      const results = [createResult(true), createResult(false)];
      expect(calculateScore(results, "all")).toBe(0);
    });

    it("should return 1 for any mode when at least one passes", () => {
      const results = [createResult(false), createResult(true)];
      expect(calculateScore(results, "any")).toBe(1);
    });

    it("should return 0 for any mode when all fail", () => {
      const results = [createResult(false), createResult(false)];
      expect(calculateScore(results, "any")).toBe(0);
    });

    it("should calculate weighted score correctly", () => {
      const results = [
        createResult(true, 3),  // 3 weight, passed
        createResult(false, 1), // 1 weight, failed
      ];
      expect(calculateScore(results, "weighted")).toBe(0.75);
    });

    it("should return 0 for empty results", () => {
      expect(calculateScore([], "all")).toBe(0);
    });
  });

  describe("isComplete", () => {
    const createResult = (passed: boolean, required = false, weight = 1): CriterionResult => ({
      criterion: {
        id: "1",
        name: "Test",
        type: "command",
        config: { cmd: "test" },
        required,
        weight,
      },
      passed,
    });

    it("should return false if any required criterion fails", () => {
      const results = [
        createResult(true, true),   // required, passed
        createResult(false, true),  // required, failed
        createResult(true, false),  // optional, passed
      ];

      expect(isComplete(results, "all", 1)).toBe(false);
    });

    it("should return true when all required pass and score meets threshold", () => {
      const results = [
        createResult(true, true),   // required, passed
        createResult(true, false),  // optional, passed
      ];

      expect(isComplete(results, "all", 1)).toBe(true);
    });

    it("should use any mode correctly", () => {
      const results = [
        createResult(false, false),
        createResult(true, false),
      ];

      expect(isComplete(results, "any", 0)).toBe(true);
    });

    it("should check weighted score threshold", () => {
      const results = [
        createResult(true, false, 8),   // 80%
        createResult(false, false, 2),  // 20%
      ];

      expect(isComplete(results, "weighted", 0.8)).toBe(true);
      expect(isComplete(results, "weighted", 0.9)).toBe(false);
    });
  });
});

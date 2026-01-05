/**
 * Criteria evaluation engine
 */

import { existsSync, readFileSync } from "node:fs";
import type {
  CompletionCriterion,
  CriterionResult,
  CriteriaMode,
  PromiseConfig,
  CommandConfig,
  FileExistsConfig,
  FileContainsConfig,
  TestPassConfig,
  LintCleanConfig,
  CoverageConfig,
  CustomScriptConfig,
} from "@claudeforge/forge-shared";
import { execFile, npm } from "../utils/shell.js";
import { extractPromise } from "../utils/transcript.js";

/**
 * Evaluate all criteria against Claude's output
 * Runs evaluations in parallel for better performance
 */
export async function evaluateCriteria(
  criteria: CompletionCriterion[],
  output: string
): Promise<CriterionResult[]> {
  // Run all evaluations in parallel
  const results = await Promise.all(
    criteria.map((criterion) => evaluateCriterion(criterion, output))
  );

  return results;
}

/**
 * Evaluate a single criterion
 */
async function evaluateCriterion(
  criterion: CompletionCriterion,
  output: string
): Promise<CriterionResult> {
  try {
    switch (criterion.type) {
      case "promise":
        return evaluatePromise(criterion, output);
      case "command":
        return evaluateCommand(criterion);
      case "file-exists":
        return evaluateFileExists(criterion);
      case "file-contains":
        return evaluateFileContains(criterion);
      case "test-pass":
        return evaluateTestPass(criterion);
      case "lint-clean":
        return evaluateLintClean(criterion);
      case "coverage":
        return evaluateCoverage(criterion);
      case "custom-script":
        return evaluateCustomScript(criterion);
      default:
        return {
          criterion,
          passed: false,
          error: `Unknown criterion type: ${criterion.type}`,
        };
    }
  } catch (error) {
    return {
      criterion,
      passed: false,
      error: String(error),
    };
  }
}

// ============================================
// INDIVIDUAL EVALUATORS
// ============================================

function evaluatePromise(
  criterion: CompletionCriterion,
  output: string
): CriterionResult {
  const config = criterion.config as PromiseConfig;
  const promiseText = extractPromise(output);

  return {
    criterion,
    passed: promiseText === config.text,
    currentValue: promiseText ?? "(not found)",
    targetValue: config.text,
  };
}

function evaluateCommand(criterion: CompletionCriterion): CriterionResult {
  const config = criterion.config as CommandConfig;
  const expectedCode = config.successCode ?? 0;

  // Parse command and args
  const parts = config.cmd.split(" ");
  const cmd = parts[0] ?? "";
  const args = parts.slice(1);

  const result = execFile(cmd, args);

  return {
    criterion,
    passed: result.exitCode === expectedCode,
    currentValue: `exit ${result.exitCode}`,
    targetValue: `exit ${expectedCode}`,
  };
}

function evaluateFileExists(criterion: CompletionCriterion): CriterionResult {
  const config = criterion.config as FileExistsConfig;
  const exists = existsSync(config.path);

  return {
    criterion,
    passed: exists,
    currentValue: exists ? "exists" : "not found",
    targetValue: "exists",
  };
}

function evaluateFileContains(criterion: CompletionCriterion): CriterionResult {
  const config = criterion.config as FileContainsConfig;

  if (!existsSync(config.path)) {
    return {
      criterion,
      passed: false,
      error: `File not found: ${config.path}`,
    };
  }

  const content = readFileSync(config.path, "utf-8");
  const found = config.isRegex
    ? new RegExp(config.pattern).test(content)
    : content.includes(config.pattern);

  return {
    criterion,
    passed: found,
    currentValue: found ? "found" : "not found",
    targetValue: "contains pattern",
  };
}

function evaluateTestPass(criterion: CompletionCriterion): CriterionResult {
  const config = criterion.config as TestPassConfig;

  // Parse command - default to npm test
  const parts = config.cmd.split(" ");
  const cmd = parts[0] ?? "npm";
  let result;

  if (cmd === "npm") {
    result = npm(parts.slice(1));
  } else {
    result = execFile(cmd, parts.slice(1));
  }

  return {
    criterion,
    passed: result.success,
    currentValue: result.success ? "passing" : "failing",
    targetValue: "all tests pass",
  };
}

function evaluateLintClean(criterion: CompletionCriterion): CriterionResult {
  const config = criterion.config as LintCleanConfig;
  const maxErrors = config.maxErrors ?? 0;

  // Parse command
  const parts = config.cmd.split(" ");
  const cmd = parts[0] ?? "npm";
  let result;

  if (cmd === "npm") {
    result = npm(parts.slice(1));
  } else {
    result = execFile(cmd, parts.slice(1));
  }

  // If command succeeded with exit 0, there are no errors
  if (result.success) {
    return {
      criterion,
      passed: true,
      currentValue: "0 errors",
      targetValue: maxErrors === 0 ? "no errors" : `≤${maxErrors} errors`,
    };
  }

  // Parse error count from common lint output formats:
  // ESLint: "✖ 5 problems (3 errors, 2 warnings)"
  // TSC: "Found 5 errors"
  // Biome: "5 errors"
  const allOutput = result.stdout + "\n" + result.stderr;

  // Try common patterns
  const patterns = [
    /(\d+)\s+error/i,                           // "5 errors" or "5 error"
    /✖\s*(\d+)\s+problems?\s*\((\d+)\s+errors?/i, // ESLint format
    /Found\s+(\d+)\s+errors?/i,                 // TSC format
    /(\d+)\s+problems?\s+found/i,               // Generic
  ];

  let errorCount = 0;
  for (const pattern of patterns) {
    const match = allOutput.match(pattern);
    if (match) {
      // For ESLint format, use the second capture group (actual errors)
      errorCount = parseInt(match[2] ?? match[1] ?? "0", 10);
      break;
    }
  }

  // If no pattern matched but command failed, count as at least 1 error
  if (errorCount === 0 && !result.success) {
    errorCount = 1;
  }

  return {
    criterion,
    passed: errorCount <= maxErrors,
    currentValue: `${errorCount} errors`,
    targetValue: maxErrors === 0 ? "no errors" : `≤${maxErrors} errors`,
  };
}

function evaluateCoverage(criterion: CompletionCriterion): CriterionResult {
  const config = criterion.config as CoverageConfig;

  // Parse command
  const parts = config.cmd.split(" ");
  const cmd = parts[0] ?? "npm";
  let result;

  if (cmd === "npm") {
    result = npm(parts.slice(1));
  } else {
    result = execFile(cmd, parts.slice(1));
  }

  // Try to extract coverage percentage from output
  // Common formats:
  // - Jest: "All files | 85.5 | 90 | 80 | 85 |"
  // - Istanbul/nyc: "Statements : 85.5% ( 100/117 )"
  // - Vitest: "Coverage: 85.5%"
  // - Generic: "Total coverage: 85.5%"
  const allOutput = result.stdout + "\n" + result.stderr;

  // Try specific patterns first (more accurate)
  const patterns = [
    // Istanbul/nyc summary line: "Statements   : 85.5% ( 100/117 )"
    /(?:Statements|Branches|Functions|Lines)\s*:\s*(\d+(?:\.\d+)?)\s*%/gi,
    // Jest table format - look for "All files" row
    /All files[^|]*\|\s*(\d+(?:\.\d+)?)/i,
    // Vitest/generic "coverage: XX%"
    /(?:coverage|total)[:=]\s*(\d+(?:\.\d+)?)\s*%/i,
    // C8/V8 format: "Lines: 85.5%"
    /Lines\s*:\s*(\d+(?:\.\d+)?)\s*%/i,
  ];

  let coverage = 0;
  let foundMatch = false;

  for (const pattern of patterns) {
    const matches = allOutput.matchAll(pattern);
    const matchArray = [...matches];
    if (matchArray.length > 0) {
      // For multi-match patterns (like istanbul), take the average or use first
      // Most tools report "Statements" as the primary coverage metric
      const lastMatch = matchArray[matchArray.length - 1];
      if (lastMatch?.[1]) {
        coverage = parseFloat(lastMatch[1]);
        foundMatch = true;
        break;
      }
    }
  }

  // Fallback: try to find any percentage (but prefer ones near the end of output)
  if (!foundMatch) {
    const percentMatches = [...allOutput.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
    if (percentMatches.length > 0) {
      // Use the last percentage found (usually the summary)
      const lastMatch = percentMatches[percentMatches.length - 1];
      if (lastMatch?.[1]) {
        coverage = parseFloat(lastMatch[1]);
      }
    }
  }

  return {
    criterion,
    passed: coverage >= config.min,
    currentValue: `${coverage.toFixed(1)}%`,
    targetValue: `≥${config.min}%`,
  };
}

function evaluateCustomScript(criterion: CompletionCriterion): CriterionResult {
  const config = criterion.config as CustomScriptConfig;
  const args = config.args ?? [];
  const result = execFile(config.script, args);

  return {
    criterion,
    passed: result.success,
    currentValue: result.success ? "passed" : "failed",
    targetValue: "exit 0",
  };
}

// ============================================
// SCORE CALCULATION
// ============================================

/**
 * Calculate overall score from results
 */
export function calculateScore(
  results: CriterionResult[],
  mode: CriteriaMode
): number {
  if (results.length === 0) return 0;

  switch (mode) {
    case "all":
      return results.every((r) => r.passed) ? 1 : 0;
    case "any":
      return results.some((r) => r.passed) ? 1 : 0;
    case "weighted": {
      let totalWeight = 0;
      let passedWeight = 0;
      for (const r of results) {
        totalWeight += r.criterion.weight;
        if (r.passed) passedWeight += r.criterion.weight;
      }
      return totalWeight > 0 ? passedWeight / totalWeight : 0;
    }
  }
}

/**
 * Check if completion conditions are met
 */
export function isComplete(
  results: CriterionResult[],
  mode: CriteriaMode,
  requiredScore: number
): boolean {
  // All required criteria must pass
  const allRequiredPassed = results
    .filter((r) => r.criterion.required)
    .every((r) => r.passed);

  if (!allRequiredPassed) return false;

  const score = calculateScore(results, mode);

  switch (mode) {
    case "all":
      return score === 1;
    case "any":
      return score > 0;
    case "weighted":
      return score >= requiredScore;
  }
}

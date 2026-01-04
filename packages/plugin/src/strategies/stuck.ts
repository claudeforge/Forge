/**
 * Stuck detection strategies
 */

import type { ForgeState, IterationRecord } from "@claudeforge/forge-shared";

export interface StuckResult {
  isStuck: boolean;
  pattern?: "same-output" | "no-progress" | "repeating-error";
  details?: string;
}

/**
 * Detect if the loop is stuck
 */
export function detectStuck(state: ForgeState): StuckResult {
  const { history } = state.iteration;
  const config = state.stuckDetection;

  if (!config.enabled || history.length < 2) {
    return { isStuck: false };
  }

  // Check patterns in order of specificity
  const sameOutput = detectSameOutput(history, config.sameOutputThreshold);
  if (sameOutput.isStuck) return sameOutput;

  const noProgress = detectNoProgress(history, config.noProgressThreshold);
  if (noProgress.isStuck) return noProgress;

  const repeatingError = detectRepeatingError(history);
  if (repeatingError.isStuck) return repeatingError;

  return { isStuck: false };
}

/**
 * Detect same output repeated N times
 */
function detectSameOutput(
  history: IterationRecord[],
  threshold: number
): StuckResult {
  if (history.length < threshold) return { isStuck: false };

  const recent = history.slice(-threshold);
  const summaries = recent.map((r) => r.summary.toLowerCase().trim());
  const uniqueSummaries = new Set(summaries);

  if (uniqueSummaries.size === 1) {
    return {
      isStuck: true,
      pattern: "same-output",
      details: `Same output repeated ${threshold} times`,
    };
  }

  return { isStuck: false };
}

/**
 * Detect no progress for N iterations
 */
function detectNoProgress(
  history: IterationRecord[],
  threshold: number
): StuckResult {
  if (history.length < threshold) return { isStuck: false };

  const recent = history.slice(-threshold);

  // Calculate pass rate for each iteration
  const passRates = recent.map((r) => {
    const passed = r.criteriaResults.filter((c) => c.passed).length;
    const total = r.criteriaResults.length;
    return total > 0 ? passed / total : 0;
  });

  // Check if pass rates haven't improved
  const maxRate = Math.max(...passRates);
  const minRate = Math.min(...passRates);

  if (maxRate - minRate < 0.05) {
    // Less than 5% improvement
    return {
      isStuck: true,
      pattern: "no-progress",
      details: `No progress for ${threshold} iterations`,
    };
  }

  return { isStuck: false };
}

/**
 * Detect same error repeated 3+ times
 */
function detectRepeatingError(history: IterationRecord[]): StuckResult {
  const errorIterations = history.filter((r) => r.outcome === "error");

  if (errorIterations.length < 3) return { isStuck: false };

  const recentErrors = errorIterations.slice(-3);
  const errorMessages = recentErrors.map((r) => r.error ?? "unknown");
  const uniqueErrors = new Set(errorMessages);

  if (uniqueErrors.size === 1 && errorMessages[0] !== "unknown") {
    return {
      isStuck: true,
      pattern: "repeating-error",
      details: `Same error repeated 3 times: ${errorMessages[0].slice(0, 50)}`,
    };
  }

  return { isStuck: false };
}

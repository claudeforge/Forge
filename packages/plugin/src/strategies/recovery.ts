/**
 * Recovery strategies for stuck states
 */

import type { ForgeState } from "@claudeforge/forge-shared";
import type { StuckResult } from "./stuck.js";
import { rollbackToLatestCheckpoint } from "../checkpoints/manager.js";

export interface RecoveryResult {
  action: "continue" | "abort";
  promptSuffix?: string;
  reason?: string;
}

/**
 * Apply recovery strategy based on state config
 */
export async function applyRecovery(
  state: ForgeState,
  stuck: StuckResult
): Promise<RecoveryResult> {
  const strategy = state.stuckDetection.strategy;

  switch (strategy) {
    case "retry-variation":
      return retryWithVariation(stuck);

    case "simplify":
      return simplifyTask(stuck);

    case "rollback":
      return rollbackAndRetry(state);

    case "abort":
      return { action: "abort", reason: stuck.details };

    default:
      return { action: "continue" };
  }
}

/**
 * Strategy: Ask Claude to try a different approach
 */
function retryWithVariation(stuck: StuckResult): RecoveryResult {
  const suffix = `

**STUCK DETECTED**: ${stuck.details}

Your previous attempts are repeating the same pattern. You MUST try a COMPLETELY DIFFERENT approach:

- If you were writing code top-down, try bottom-up
- If tests are failing, read error messages carefully
- Consider simplifying the implementation
- Break the problem into smaller, testable pieces
- Look for edge cases you might have missed

**DO NOT** repeat your previous approach. Try something genuinely different.`;

  return { action: "continue", promptSuffix: suffix };
}

/**
 * Strategy: Ask Claude to break down the task
 */
function simplifyTask(stuck: StuckResult): RecoveryResult {
  const suffix = `

**STUCK DETECTED**: ${stuck.details}

The task appears too complex. Please:

1. **STOP** and assess what's already working
2. **LIST** the specific blockers (what exactly is failing?)
3. **IDENTIFY** the ONE smallest change that would help
4. **IMPLEMENT** only that one change
5. **VERIFY** it works before moving on

Focus on incremental progress. Don't try to solve everything at once.`;

  return { action: "continue", promptSuffix: suffix };
}

/**
 * Strategy: Rollback to last checkpoint and retry
 */
async function rollbackAndRetry(state: ForgeState): Promise<RecoveryResult> {
  const success = await rollbackToLatestCheckpoint(state);

  if (success) {
    return {
      action: "continue",
      promptSuffix: `

**ROLLBACK PERFORMED**: Reverted to last checkpoint.

Your previous approach led to a stuck state. With this fresh start, try a fundamentally different strategy.`,
    };
  }

  // No checkpoint available, fall back to variation strategy
  return {
    action: "continue",
    promptSuffix: `

**STUCK DETECTED** (no checkpoint available for rollback)

Try a completely different approach to solve the problem.`,
  };
}

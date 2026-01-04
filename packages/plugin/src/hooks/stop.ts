#!/usr/bin/env node
/**
 * FORGE Stop Hook
 *
 * This is the CORE of FORGE. It runs every time Claude tries to exit.
 *
 * Flow:
 * 1. Load state file
 * 2. If no active forge, allow exit
 * 3. Check for external commands (pause/abort)
 * 4. Parse transcript, get last output
 * 5. Update metrics
 * 6. Check budget/iteration limits
 * 7. Evaluate completion criteria
 * 8. Check for stuck patterns
 * 9. Auto-checkpoint if needed
 * 10. Run quality gates
 * 11. If complete: allow exit with success message
 * 12. If not: block exit, feed prompt back
 */

import { readFileSync, existsSync, unlinkSync } from "node:fs";
import type {
  ForgeState,
  IterationRecord,
  IterationOutcome,
  CriterionResult,
} from "@claudeforge/forge-shared";
import { COMMAND_FILE } from "@claudeforge/forge-shared/constants";
import { loadState, saveState } from "../core/state.js";
import {
  evaluateCriteria,
  isComplete,
} from "../core/criteria.js";
import { generateIterationSummary } from "../core/summary.js";
import { detectStuck } from "../strategies/stuck.js";
import { applyRecovery } from "../strategies/recovery.js";
import { createCheckpoint } from "../checkpoints/manager.js";
import { sendWebhook } from "../sync/webhook.js";
import {
  parseTranscript,
  extractLastAssistantOutput,
} from "../utils/transcript.js";
import { estimateTokens, estimateCost } from "../utils/cost.js";
import { execFile } from "../utils/shell.js";
import { getChangedFiles } from "../utils/git.js";

// ============================================
// TYPES
// ============================================

interface HookInput {
  transcript_path: string;
}

interface HookOutput {
  decision: "allow" | "block";
  reason?: string;
  systemMessage?: string;
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  try {
    // Read input from stdin
    const inputRaw = readFileSync(0, "utf-8");
    const input: HookInput = JSON.parse(inputRaw);

    // Run hook logic
    const output = await stopHook(input);

    // Output result
    console.log(JSON.stringify(output));
  } catch (error) {
    // On any error, allow exit to prevent getting stuck
    console.error("[FORGE] Hook error:", error);
    console.log(JSON.stringify({ decision: "allow" }));
  }
}

// ============================================
// STOP HOOK LOGIC
// ============================================

async function stopHook(input: HookInput): Promise<HookOutput> {
  // 1. Load state
  const state = loadState();
  if (!state || state.task.status !== "running") {
    return { decision: "allow" };
  }

  // 2. Check for external commands (pause, abort)
  const command = checkExternalCommand();
  if (command) {
    return handleExternalCommand(state, command);
  }

  // 3. Parse transcript and get last output
  const transcript = parseTranscript(input.transcript_path);
  const lastOutput = extractLastAssistantOutput(transcript);

  if (!lastOutput) {
    console.error("[FORGE] No assistant output found in transcript");
    return { decision: "allow", reason: "No output found" };
  }

  // 4. Calculate iteration metrics
  const tokens = estimateTokens(lastOutput);
  const iterStartTime = new Date(state.iteration.currentStartedAt).getTime();
  const iterDuration = Date.now() - iterStartTime;

  // Update cumulative metrics
  state.metrics.totalTokens += tokens;
  state.metrics.estimatedCost = estimateCost(state.metrics.totalTokens);
  state.metrics.totalDuration += iterDuration;

  // Track file changes
  const changes = getChangedFiles();
  for (const file of changes.created) {
    if (!state.metrics.filesCreated.includes(file)) {
      state.metrics.filesCreated.push(file);
    }
  }
  for (const file of changes.modified) {
    if (!state.metrics.filesModified.includes(file)) {
      state.metrics.filesModified.push(file);
    }
  }

  // 5. Check budget limits
  const budgetResult = checkBudgetLimits(state);
  if (budgetResult) {
    state.task.status = "failed";
    saveState(state);
    await sendWebhook(state, {
      type: "task:failed",
      reason: budgetResult.reason as "budget" | "timeout",
      message: budgetResult.message,
      metrics: state.metrics,
    });
    return { decision: "allow", reason: budgetResult.message };
  }

  // 6. Check max iterations
  if (
    state.iteration.max > 0 &&
    state.iteration.current >= state.iteration.max
  ) {
    state.task.status = "failed";
    saveState(state);
    await sendWebhook(state, {
      type: "task:failed",
      reason: "max-iterations",
      message: `Reached maximum iterations (${state.iteration.max})`,
      metrics: state.metrics,
    });
    return {
      decision: "allow",
      reason: `Max iterations (${state.iteration.max}) reached`,
    };
  }

  // 7. Evaluate completion criteria
  const criteriaResults = await evaluateCriteria(
    state.criteria.items,
    lastOutput
  );

  // 8. Build iteration record
  const outcome: IterationOutcome = "progress";
  const iterRecord: IterationRecord = {
    n: state.iteration.current,
    startedAt: state.iteration.currentStartedAt,
    endedAt: new Date().toISOString(),
    duration: iterDuration / 1000,
    tokens,
    outcome,
    criteriaResults,
    summary: await generateIterationSummary(lastOutput),
  };

  // 9. Check if complete
  const complete = isComplete(
    criteriaResults,
    state.criteria.mode,
    state.criteria.requiredScore
  );

  if (complete) {
    state.task.status = "completed";
    state.iteration.history.push(iterRecord);
    saveState(state);
    await sendWebhook(state, {
      type: "task:completed",
      iterations: state.iteration.current,
      metrics: state.metrics,
      criteriaResults,
    });
    return {
      decision: "allow",
      reason: buildCompletionMessage(criteriaResults),
    };
  }

  // 10. Add iteration to history
  state.iteration.history.push(iterRecord);

  // 11. Stuck detection
  let promptSuffix = "";
  if (state.stuckDetection.enabled) {
    const stuckResult = detectStuck(state);

    if (stuckResult.isStuck) {
      iterRecord.outcome = "stuck";

      await sendWebhook(state, {
        type: "task:stuck",
        iteration: state.iteration.current,
        pattern: stuckResult.pattern!,
        recovery: state.stuckDetection.strategy,
      });

      const recovery = await applyRecovery(state, stuckResult);

      if (recovery.action === "abort") {
        state.task.status = "stuck";
        saveState(state);
        return {
          decision: "allow",
          reason: `Task stuck and aborted: ${recovery.reason}`,
        };
      }

      promptSuffix = recovery.promptSuffix ?? "";
    }
  }

  // 12. Auto-checkpoint
  if (
    state.checkpoints.auto.enabled &&
    state.iteration.current % state.checkpoints.auto.interval === 0
  ) {
    const checkpoint = await createCheckpoint(state, "auto");
    if (checkpoint) {
      await sendWebhook(state, {
        type: "checkpoint:created",
        checkpoint,
      });
    }
  }

  // 13. Quality gates
  for (const gate of state.qualityGates) {
    if (state.iteration.current % gate.runEvery === 0) {
      const parts = gate.command.split(" ");
      const result = execFile(parts[0], parts.slice(1));
      if (!result.success) {
        iterRecord.outcome = "gate-failed";
        if (gate.autoFix) {
          const fixParts = gate.autoFix.split(" ");
          execFile(fixParts[0], fixParts.slice(1));
        }
      }
    }
  }

  // 14. Prepare next iteration
  state.iteration.current++;
  state.iteration.currentStartedAt = new Date().toISOString();
  saveState(state);

  // 15. Send progress webhook
  await sendWebhook(state, {
    type: "task:progress",
    iteration: state.iteration.current - 1,
    iterationRecord: iterRecord,
    metrics: state.metrics,
    criteriaResults,
  });

  // 16. Return block decision with prompt
  return {
    decision: "block",
    reason: state.task.prompt + promptSuffix,
    systemMessage: buildSystemMessage(state, criteriaResults),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function checkExternalCommand(): { command: string; [key: string]: unknown } | null {
  if (!existsSync(COMMAND_FILE)) return null;

  try {
    const content = readFileSync(COMMAND_FILE, "utf-8");
    unlinkSync(COMMAND_FILE); // Delete after reading
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function handleExternalCommand(
  state: ForgeState,
  command: { command: string }
): HookOutput {
  switch (command.command) {
    case "pause":
      state.task.status = "paused";
      saveState(state);
      sendWebhook(state, {
        type: "task:paused",
        iteration: state.iteration.current,
      });
      return { decision: "allow", reason: "FORGE paused by user" };

    case "abort":
      state.task.status = "aborted";
      saveState(state);
      sendWebhook(state, {
        type: "task:failed",
        reason: "aborted",
        message: "Aborted by user",
        metrics: state.metrics,
      });
      return { decision: "allow", reason: "FORGE aborted by user" };

    default:
      return { decision: "allow" };
  }
}

function checkBudgetLimits(
  state: ForgeState
): { reason: string; message: string } | null {
  if (
    state.budget.maxCost !== null &&
    state.metrics.estimatedCost > state.budget.maxCost
  ) {
    return {
      reason: "budget",
      message: `Budget exceeded: $${state.metrics.estimatedCost.toFixed(2)} > $${state.budget.maxCost}`,
    };
  }

  if (
    state.budget.maxDuration !== null &&
    state.metrics.totalDuration > state.budget.maxDuration * 1000
  ) {
    const minutes = Math.round(state.metrics.totalDuration / 60000);
    const maxMinutes = Math.round(state.budget.maxDuration / 60);
    return {
      reason: "timeout",
      message: `Duration exceeded: ${minutes}min > ${maxMinutes}min`,
    };
  }

  if (
    state.budget.maxTokens !== null &&
    state.metrics.totalTokens > state.budget.maxTokens
  ) {
    return {
      reason: "tokens",
      message: `Token limit exceeded: ${state.metrics.totalTokens} > ${state.budget.maxTokens}`,
    };
  }

  return null;
}

function buildCompletionMessage(results: CriterionResult[]): string {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const names = results.filter((r) => r.passed).map((r) => r.criterion.name);

  return `
**FORGE COMPLETE!**

${passed}/${total} criteria passed
${names.map((n) => `   - ${n}`).join("\n")}

Great work!`;
}

function buildSystemMessage(
  state: ForgeState,
  results: CriterionResult[]
): string {
  const lines: string[] = [
    `FORGE Iteration ${state.iteration.current}`,
    "",
    "**Criteria Status:**",
  ];

  for (const r of results) {
    const icon = r.passed ? "[PASS]" : "[FAIL]";
    const req = r.criterion.required ? "(required)" : `(w:${r.criterion.weight})`;
    const value = r.currentValue ? ` -> ${r.currentValue}` : "";
    lines.push(`${icon} ${r.criterion.name} ${req}${value}`);
  }

  lines.push("");
  lines.push("**Metrics:**");
  lines.push(`- Tokens: ${state.metrics.totalTokens.toLocaleString()}`);
  lines.push(`- Cost: $${state.metrics.estimatedCost.toFixed(4)}`);
  lines.push(`- Duration: ${Math.round(state.metrics.totalDuration / 1000)}s`);

  if (state.iteration.max > 0) {
    lines.push(
      `- Progress: ${state.iteration.current}/${state.iteration.max} iterations`
    );
  }

  return lines.join("\n");
}

// ============================================
// RUN
// ============================================

main();

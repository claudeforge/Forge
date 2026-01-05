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

import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import type {
  ForgeState,
  IterationRecord,
  IterationOutcome,
  CriterionResult,
  CompletionCriterion,
  IterationFile,
  TaskResultFile,
  TaskFile,
} from "@claudeforge/forge-shared";
import {
  COMMAND_FILE,
  DEFAULT_STATE,
  getIterationPath,
  getTaskResultPath,
  getTaskConfigPath,
  getTaskDir,
  getIterationsDir,
  getTaskCheckpointsDir,
} from "@claudeforge/forge-shared/constants";
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
import { execFile } from "../utils/shell.js";

/** Estimate token count from text (rough approximation) */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}
import { getChangedFiles } from "../utils/git.js";

// ============================================
// TYPES
// ============================================

interface HookInput {
  transcript_path: string;
}

interface HookOutput {
  decision: "approve" | "block";
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
    console.log(JSON.stringify({ decision: "approve" }));
  }
}

// ============================================
// STOP HOOK LOGIC
// ============================================

async function stopHook(input: HookInput): Promise<HookOutput> {
  // 1. Load state
  const state = loadState();
  if (!state || state.task.status !== "running") {
    return { decision: "approve" };
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
    return { decision: "approve", reason: "No output found" };
  }

  // 4. Calculate iteration metrics
  const tokens = estimateTokens(lastOutput);
  const iterStartTime = new Date(state.iteration.currentStartedAt).getTime();
  const iterDuration = Date.now() - iterStartTime;

  // Update cumulative metrics
  state.metrics.totalTokens += tokens;
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
    writeTaskResult(state, []);
    await sendWebhook(state, {
      type: "task:failed",
      reason: budgetResult.reason as "budget" | "timeout",
      message: budgetResult.message,
      metrics: state.metrics,
    });
    return { decision: "approve", reason: budgetResult.message };
  }

  // 6. Check max iterations
  if (
    state.iteration.max > 0 &&
    state.iteration.current >= state.iteration.max
  ) {
    state.task.status = "failed";
    saveState(state);
    writeTaskResult(state, []);
    await sendWebhook(state, {
      type: "task:failed",
      reason: "max-iterations",
      message: `Reached maximum iterations (${state.iteration.max})`,
      metrics: state.metrics,
    });
    return {
      decision: "approve",
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

  // 8.5 Write iteration file
  const filesChanged = [...changes.created, ...changes.modified];
  writeIterationFile(
    state.task.id,
    state.iteration.current,
    iterRecord,
    tokens,
    filesChanged
  );

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

    // Write task result file
    writeTaskResult(state, criteriaResults);

    await sendWebhook(state, {
      type: "task:completed",
      iterations: state.iteration.current,
      metrics: state.metrics,
      criteriaResults,
    });

    // Auto-advance: Check for next task in queue if using Control Center
    if (state.controlCenter.enabled && state.controlCenter.url && state.controlCenter.projectId) {
      const nextTask = await claimNextTask(state.controlCenter.url, state.controlCenter.projectId);

      if (nextTask) {
        // Initialize new state for the next task
        const newState = initializeNewTask(nextTask, state.controlCenter);
        saveState(newState);

        console.error(`[FORGE] Auto-advancing to next task: ${nextTask.name}`);

        // Block exit and start working on the new task
        return {
          decision: "block",
          reason: nextTask.prompt,
          systemMessage: `**FORGE Auto-Advance**\n\nPrevious task completed successfully!\nNow starting: "${nextTask.name}"\n\nTask prompt: ${nextTask.prompt}`,
        };
      }
    }

    return {
      decision: "approve",
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
        writeTaskResult(state, criteriaResults);
        return {
          decision: "approve",
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
      const cmd = parts[0] ?? "";
      const result = execFile(cmd, parts.slice(1));
      if (!result.success) {
        iterRecord.outcome = "gate-failed";
        if (gate.autoFix) {
          const fixParts = gate.autoFix.split(" ");
          const fixCmd = fixParts[0] ?? "";
          execFile(fixCmd, fixParts.slice(1));
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

interface ServerTask {
  id: string;
  name: string;
  prompt: string;
  criteria: CompletionCriterion[];
  maxIterations: number;
}

async function claimNextTask(controlUrl: string, projectId: string): Promise<ServerTask | null> {
  try {
    const response = await fetch(`${controlUrl}/api/projects/${projectId}/claim-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.error("[FORGE] No more tasks in queue");
        return null;
      }
      console.error(`[FORGE] Failed to claim next task: ${response.status}`);
      return null;
    }

    return await response.json() as ServerTask;
  } catch (error) {
    console.error("[FORGE] Failed to connect to Control Center:", error);
    return null;
  }
}

function initializeNewTask(
  task: ServerTask,
  controlCenter: ForgeState["controlCenter"]
): ForgeState {
  const now = new Date().toISOString();

  // Create task folder structure
  createTaskFolderStructure(task, controlCenter, now);

  return {
    ...DEFAULT_STATE,
    version: "1.0.0",
    task: {
      id: task.id,
      name: task.name,
      prompt: task.prompt,
      startedAt: now,
      status: "running",
    },
    iteration: {
      ...DEFAULT_STATE.iteration,
      current: 1,
      max: task.maxIterations,
      currentStartedAt: now,
    },
    criteria: {
      mode: "all",
      requiredScore: 0.8,
      items: task.criteria,
    },
    budget: {
      maxDuration: null,
      maxTokens: null,
    },
    controlCenter: {
      enabled: true,
      url: controlCenter.url,
      projectId: controlCenter.projectId,
      taskId: task.id,
    },
  };
}

/**
 * Create task folder structure for auto-advance
 */
function createTaskFolderStructure(
  task: ServerTask,
  controlCenter: ForgeState["controlCenter"],
  startedAt: string
): void {
  const taskDir = getTaskDir(task.id);
  const iterationsDir = getIterationsDir(task.id);
  const checkpointsDir = getTaskCheckpointsDir(task.id);

  // Create directories
  mkdirSync(taskDir, { recursive: true });
  mkdirSync(iterationsDir, { recursive: true });
  mkdirSync(checkpointsDir, { recursive: true });

  // Write task.json
  const taskFile: TaskFile = {
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    startedAt,
    endedAt: null,
    status: "running",
    project: {
      id: controlCenter.projectId,
      controlUrl: controlCenter.url,
    },
    config: {
      criteria: task.criteria,
      maxIterations: task.maxIterations,
      maxDuration: null,
      checkpointInterval: 10,
      stuckStrategy: "retry-variation",
    },
  };

  writeFileSync(getTaskConfigPath(task.id), JSON.stringify(taskFile, null, 2));
}

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
      return { decision: "approve", reason: "FORGE paused by user" };

    case "abort":
      state.task.status = "aborted";
      saveState(state);
      sendWebhook(state, {
        type: "task:failed",
        reason: "aborted",
        message: "Aborted by user",
        metrics: state.metrics,
      });
      return { decision: "approve", reason: "FORGE aborted by user" };

    default:
      return { decision: "approve" };
  }
}

function checkBudgetLimits(
  state: ForgeState
): { reason: string; message: string } | null {
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

/**
 * Write iteration result to file
 */
function writeIterationFile(
  taskId: string,
  iterNum: number,
  record: IterationRecord,
  tokens: number,
  filesChanged: string[]
): void {
  const iterFile: IterationFile = {
    num: iterNum,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    duration: record.duration,
    tokens: {
      input: Math.floor(tokens * 0.3), // Estimate
      output: Math.floor(tokens * 0.7), // Estimate
      total: tokens,
    },
    outcome: record.outcome,
    criteriaResults: record.criteriaResults.map((r) => ({
      id: r.criterion.id,
      name: r.criterion.name,
      passed: r.passed,
      output: r.currentValue ?? r.error ?? "",
      duration: 0, // TODO: track per-criterion duration
    })),
    summary: record.summary,
    filesChanged,
    error: record.error,
  };

  // Ensure directory exists
  const iterDir = getIterationsDir(taskId);
  if (!existsSync(iterDir)) {
    mkdirSync(iterDir, { recursive: true });
  }

  const path = getIterationPath(taskId, iterNum);
  writeFileSync(path, JSON.stringify(iterFile, null, 2));
}

/**
 * Write task result file when task completes/fails
 */
function writeTaskResult(
  state: ForgeState,
  criteriaResults: CriterionResult[]
): void {
  const taskId = state.task.id;

  const result: TaskResultFile = {
    status: state.task.status,
    iterations: state.iteration.current,
    duration: state.metrics.totalDuration / 1000,
    tokens: state.metrics.totalTokens,
    criteriaResults: criteriaResults.map((r) => ({
      id: r.criterion.id,
      name: r.criterion.name,
      passed: r.passed,
    })),
    summary: `Task ${state.task.status} after ${state.iteration.current} iterations`,
    filesCreated: state.metrics.filesCreated,
    filesModified: state.metrics.filesModified,
    completedAt: new Date().toISOString(),
  };

  // Ensure directory exists
  const taskDir = getTaskDir(taskId);
  if (!existsSync(taskDir)) {
    mkdirSync(taskDir, { recursive: true });
  }

  const path = getTaskResultPath(taskId);
  writeFileSync(path, JSON.stringify(result, null, 2));

  // Also update task.json with endedAt and status
  const configPath = getTaskConfigPath(taskId);
  if (existsSync(configPath)) {
    try {
      const taskFile: TaskFile = JSON.parse(readFileSync(configPath, "utf-8"));
      taskFile.endedAt = result.completedAt;
      taskFile.status = state.task.status;
      writeFileSync(configPath, JSON.stringify(taskFile, null, 2));
    } catch {
      // Ignore errors updating task.json
    }
  }
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

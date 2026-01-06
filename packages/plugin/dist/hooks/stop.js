#!/usr/bin/env node
import {
  generateId,
  validateState
} from "../chunk-MDTJ7MHC.js";
import {
  CHECKPOINTS_DIR,
  COMMAND_FILE,
  DEFAULT_STATE,
  EXECUTION_FILE,
  FORGE_DIR,
  STATE_FILE,
  getIterationPath,
  getIterationsDir,
  getTaskCheckpointsDir,
  getTaskConfigPath,
  getTaskDir,
  getTaskResultPath
} from "../chunk-FJGGFLPX.js";

// src/hooks/stop.ts
import { readFileSync as readFileSync6, writeFileSync as writeFileSync5, existsSync as existsSync6, unlinkSync as unlinkSync3, mkdirSync as mkdirSync5 } from "fs";

// src/core/state.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { dirname } from "path";
function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const content = readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(content);
    if (!validateState(state)) {
      console.error("[FORGE] Invalid state file format");
      return null;
    }
    return state;
  } catch (error) {
    console.error("[FORGE] Failed to load state:", error);
    return null;
  }
}
function saveState(state) {
  try {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    console.error("[FORGE] Failed to save state:", error);
    return false;
  }
}

// src/core/criteria.ts
import { existsSync as existsSync2, readFileSync as readFileSync3 } from "fs";

// src/utils/shell.ts
import { execFileSync } from "child_process";
function execFile(command, args = [], options) {
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 6e4,
      // 1 minute timeout
      shell: false,
      ...options
    });
    return {
      success: true,
      exitCode: 0,
      stdout: String(stdout).trim(),
      stderr: ""
    };
  } catch (error) {
    const e = error;
    return {
      success: false,
      exitCode: e.status ?? 1,
      stdout: String(e.stdout ?? "").trim(),
      stderr: String(e.stderr ?? "").trim()
    };
  }
}
function git(args, options) {
  return execFile("git", args, options);
}
function npm(args, options) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return execFile(npmCmd, args, options);
}

// src/utils/transcript.ts
import { readFileSync as readFileSync2 } from "fs";
function parseTranscript(path) {
  const content = readFileSync2(path, "utf-8");
  const lines = content.trim().split("\n");
  const messages = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      messages.push(msg);
    } catch {
    }
  }
  return messages;
}
function extractLastAssistantOutput(messages) {
  const assistantMessages = messages.filter(
    (m) => m.role === "assistant" && m.message?.content
  );
  if (assistantMessages.length === 0) return null;
  const last = assistantMessages[assistantMessages.length - 1];
  if (!last?.message?.content) return null;
  const textBlocks = last.message.content.filter((block) => block.type === "text" && block.text).map((block) => block.text ?? "");
  return textBlocks.join("\n");
}
function extractPromise(output) {
  const match = output.match(/<promise>([\s\S]*?)<\/promise>/);
  return match?.[1]?.trim() ?? null;
}

// src/core/criteria.ts
async function evaluateCriteria(criteria, output) {
  const results = await Promise.all(
    criteria.map((criterion) => evaluateCriterion(criterion, output))
  );
  return results;
}
async function evaluateCriterion(criterion, output) {
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
          error: `Unknown criterion type: ${criterion.type}`
        };
    }
  } catch (error) {
    return {
      criterion,
      passed: false,
      error: String(error)
    };
  }
}
function evaluatePromise(criterion, output) {
  const config = criterion.config;
  const promiseText = extractPromise(output);
  return {
    criterion,
    passed: promiseText === config.text,
    currentValue: promiseText ?? "(not found)",
    targetValue: config.text
  };
}
function evaluateCommand(criterion) {
  const config = criterion.config;
  const expectedCode = config.successCode ?? 0;
  const parts = config.cmd.split(" ");
  const cmd = parts[0] ?? "";
  const args = parts.slice(1);
  const result = execFile(cmd, args);
  return {
    criterion,
    passed: result.exitCode === expectedCode,
    currentValue: `exit ${result.exitCode}`,
    targetValue: `exit ${expectedCode}`
  };
}
function evaluateFileExists(criterion) {
  const config = criterion.config;
  const exists = existsSync2(config.path);
  return {
    criterion,
    passed: exists,
    currentValue: exists ? "exists" : "not found",
    targetValue: "exists"
  };
}
function evaluateFileContains(criterion) {
  const config = criterion.config;
  if (!existsSync2(config.path)) {
    return {
      criterion,
      passed: false,
      error: `File not found: ${config.path}`
    };
  }
  const content = readFileSync3(config.path, "utf-8");
  const found = config.isRegex ? new RegExp(config.pattern).test(content) : content.includes(config.pattern);
  return {
    criterion,
    passed: found,
    currentValue: found ? "found" : "not found",
    targetValue: "contains pattern"
  };
}
function evaluateTestPass(criterion) {
  const config = criterion.config;
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
    targetValue: "all tests pass"
  };
}
function evaluateLintClean(criterion) {
  const config = criterion.config;
  const maxErrors = config.maxErrors ?? 0;
  const parts = config.cmd.split(" ");
  const cmd = parts[0] ?? "npm";
  let result;
  if (cmd === "npm") {
    result = npm(parts.slice(1));
  } else {
    result = execFile(cmd, parts.slice(1));
  }
  if (result.success) {
    return {
      criterion,
      passed: true,
      currentValue: "0 errors",
      targetValue: maxErrors === 0 ? "no errors" : `\u2264${maxErrors} errors`
    };
  }
  const allOutput = result.stdout + "\n" + result.stderr;
  const patterns = [
    /(\d+)\s+error/i,
    // "5 errors" or "5 error"
    /✖\s*(\d+)\s+problems?\s*\((\d+)\s+errors?/i,
    // ESLint format
    /Found\s+(\d+)\s+errors?/i,
    // TSC format
    /(\d+)\s+problems?\s+found/i
    // Generic
  ];
  let errorCount = 0;
  for (const pattern of patterns) {
    const match = allOutput.match(pattern);
    if (match) {
      errorCount = parseInt(match[2] ?? match[1] ?? "0", 10);
      break;
    }
  }
  if (errorCount === 0 && !result.success) {
    errorCount = 1;
  }
  return {
    criterion,
    passed: errorCount <= maxErrors,
    currentValue: `${errorCount} errors`,
    targetValue: maxErrors === 0 ? "no errors" : `\u2264${maxErrors} errors`
  };
}
function evaluateCoverage(criterion) {
  const config = criterion.config;
  const parts = config.cmd.split(" ");
  const cmd = parts[0] ?? "npm";
  let result;
  if (cmd === "npm") {
    result = npm(parts.slice(1));
  } else {
    result = execFile(cmd, parts.slice(1));
  }
  const allOutput = result.stdout + "\n" + result.stderr;
  const patterns = [
    // Istanbul/nyc summary line: "Statements   : 85.5% ( 100/117 )"
    /(?:Statements|Branches|Functions|Lines)\s*:\s*(\d+(?:\.\d+)?)\s*%/gi,
    // Jest table format - look for "All files" row
    /All files[^|]*\|\s*(\d+(?:\.\d+)?)/i,
    // Vitest/generic "coverage: XX%"
    /(?:coverage|total)[:=]\s*(\d+(?:\.\d+)?)\s*%/i,
    // C8/V8 format: "Lines: 85.5%"
    /Lines\s*:\s*(\d+(?:\.\d+)?)\s*%/i
  ];
  let coverage = 0;
  let foundMatch = false;
  for (const pattern of patterns) {
    const matches = allOutput.matchAll(pattern);
    const matchArray = [...matches];
    if (matchArray.length > 0) {
      const lastMatch = matchArray[matchArray.length - 1];
      if (lastMatch?.[1]) {
        coverage = parseFloat(lastMatch[1]);
        foundMatch = true;
        break;
      }
    }
  }
  if (!foundMatch) {
    const percentMatches = [...allOutput.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];
    if (percentMatches.length > 0) {
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
    targetValue: `\u2265${config.min}%`
  };
}
function evaluateCustomScript(criterion) {
  const config = criterion.config;
  const args = config.args ?? [];
  const result = execFile(config.script, args);
  return {
    criterion,
    passed: result.success,
    currentValue: result.success ? "passed" : "failed",
    targetValue: "exit 0"
  };
}
function calculateScore(results, mode) {
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
function isComplete(results, mode, requiredScore) {
  const allRequiredPassed = results.filter((r) => r.criterion.required).every((r) => r.passed);
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

// src/core/summary.ts
async function generateIterationSummary(output) {
  const lines = output.split("\n").filter((l) => l.trim());
  for (const line of lines.slice(0, 10)) {
    const lower = line.toLowerCase();
    if (lower.startsWith("i ") || lower.startsWith("let me") || lower.startsWith("i'll")) {
      continue;
    }
    const actionKeywords = [
      "created",
      "added",
      "fixed",
      "implemented",
      "updated",
      "refactored",
      "removed",
      "deleted",
      "modified",
      "wrote",
      "built",
      "configured",
      "installed",
      "set up",
      "completed"
    ];
    if (actionKeywords.some((kw) => lower.includes(kw))) {
      const clean2 = line.replace(/^[\s\-\*•>]+/, "").trim();
      return clean2.slice(0, 100) + (clean2.length > 100 ? "..." : "");
    }
  }
  const first = lines[0] ?? "No output";
  const clean = first.replace(/^[\s\-\*•>]+/, "").trim();
  return clean.slice(0, 100) + (clean.length > 100 ? "..." : "");
}

// src/strategies/stuck.ts
function detectStuck(state) {
  const { history } = state.iteration;
  const config = state.stuckDetection;
  if (!config.enabled || history.length < 2) {
    return { isStuck: false };
  }
  const sameOutput = detectSameOutput(history, config.sameOutputThreshold);
  if (sameOutput.isStuck) return sameOutput;
  const noProgress = detectNoProgress(history, config.noProgressThreshold);
  if (noProgress.isStuck) return noProgress;
  const repeatingError = detectRepeatingError(history);
  if (repeatingError.isStuck) return repeatingError;
  return { isStuck: false };
}
function detectSameOutput(history, threshold) {
  if (history.length < threshold) return { isStuck: false };
  const recent = history.slice(-threshold);
  const summaries = recent.map((r) => r.summary.toLowerCase().trim());
  const uniqueSummaries = new Set(summaries);
  if (uniqueSummaries.size === 1) {
    return {
      isStuck: true,
      pattern: "same-output",
      details: `Same output repeated ${threshold} times`
    };
  }
  return { isStuck: false };
}
function detectNoProgress(history, threshold) {
  if (history.length < threshold) return { isStuck: false };
  const recent = history.slice(-threshold);
  const passRates = recent.map((r) => {
    const passed = r.criteriaResults.filter((c) => c.passed).length;
    const total = r.criteriaResults.length;
    return total > 0 ? passed / total : 0;
  });
  const hasCriteria = recent.some((r) => r.criteriaResults.length > 0);
  if (!hasCriteria) {
    return { isStuck: false };
  }
  const maxRate = Math.max(...passRates);
  const minRate = Math.min(...passRates);
  if (maxRate === 1) {
    return { isStuck: false };
  }
  if (maxRate - minRate < 0.05) {
    return {
      isStuck: true,
      pattern: "no-progress",
      details: `No progress for ${threshold} iterations (pass rate: ${(maxRate * 100).toFixed(0)}%)`
    };
  }
  return { isStuck: false };
}
function detectRepeatingError(history) {
  const errorIterations = history.filter((r) => r.outcome === "error");
  if (errorIterations.length < 3) return { isStuck: false };
  const recentErrors = errorIterations.slice(-3);
  const errorMessages = recentErrors.map((r) => r.error ?? "unknown");
  const uniqueErrors = new Set(errorMessages);
  const firstError = errorMessages[0];
  if (uniqueErrors.size === 1 && firstError && firstError !== "unknown") {
    return {
      isStuck: true,
      pattern: "repeating-error",
      details: `Same error repeated 3 times: ${firstError.slice(0, 50)}`
    };
  }
  return { isStuck: false };
}

// src/checkpoints/manager.ts
import {
  mkdirSync as mkdirSync2,
  existsSync as existsSync3,
  writeFileSync as writeFileSync2,
  unlinkSync as unlinkSync2
} from "fs";
import { join } from "path";

// src/utils/git.ts
function isGitRepo() {
  const result = git(["rev-parse", "--is-inside-work-tree"]);
  return result.success && result.stdout === "true";
}
function createStash(message) {
  if (!isGitRepo()) return null;
  const statusResult = git(["status", "--porcelain"]);
  if (!statusResult.success || !statusResult.stdout.trim()) {
    return "clean";
  }
  git(["add", "-A"]);
  const result = git(["stash", "push", "-m", message, "--include-untracked"]);
  if (!result.success || result.stdout.includes("No local changes to save")) {
    return "clean";
  }
  const refResult = git(["rev-parse", "stash@{0}"]);
  if (refResult.success && refResult.stdout.trim()) {
    return refResult.stdout.trim();
  }
  return "stash@{0}";
}
function applyStash(ref) {
  if (ref === "clean" || ref === "none") {
    return true;
  }
  const result = git(["stash", "apply", ref]);
  return result.success;
}
function getChangedFiles() {
  const created = [];
  const modified = [];
  if (!isGitRepo()) return { created, modified };
  const untrackedResult = git(["ls-files", "--others", "--exclude-standard"]);
  if (untrackedResult.success && untrackedResult.stdout) {
    created.push(...untrackedResult.stdout.split("\n").filter(Boolean));
  }
  const modifiedResult = git(["diff", "--name-only"]);
  if (modifiedResult.success && modifiedResult.stdout) {
    modified.push(...modifiedResult.stdout.split("\n").filter(Boolean));
  }
  const stagedResult = git(["diff", "--cached", "--name-only"]);
  if (stagedResult.success && stagedResult.stdout) {
    const staged = stagedResult.stdout.split("\n").filter(Boolean);
    for (const file of staged) {
      if (!modified.includes(file)) {
        modified.push(file);
      }
    }
  }
  return { created, modified };
}

// src/checkpoints/manager.ts
async function createCheckpoint(state, type) {
  if (!existsSync3(CHECKPOINTS_DIR)) {
    mkdirSync2(CHECKPOINTS_DIR, { recursive: true });
  }
  const stashMessage = `forge-checkpoint-iter-${state.iteration.current}`;
  const gitRef = createStash(stashMessage);
  if (!gitRef) {
    console.error("[FORGE] Failed to create git stash for checkpoint");
  }
  const checkpoint = {
    id: generateId(),
    iteration: state.iteration.current,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    type,
    gitRef: gitRef ?? "none",
    metrics: { ...state.metrics }
  };
  const checkpointFile = join(CHECKPOINTS_DIR, `${checkpoint.id}.json`);
  writeFileSync2(checkpointFile, JSON.stringify(checkpoint, null, 2));
  state.checkpoints.items.push(checkpoint);
  pruneOldCheckpoints(state);
  saveState(state);
  return checkpoint;
}
async function rollbackToCheckpoint(checkpointId, state) {
  const checkpoint = state.checkpoints.items.find((c) => c.id === checkpointId);
  if (!checkpoint) {
    console.error(`[FORGE] Checkpoint not found: ${checkpointId}`);
    return false;
  }
  if (checkpoint.gitRef && checkpoint.gitRef !== "none") {
    const success = applyStash(checkpoint.gitRef);
    if (!success) {
      console.error("[FORGE] Failed to apply git stash");
    }
  }
  state.metrics = { ...checkpoint.metrics };
  state.iteration.current = checkpoint.iteration;
  state.iteration.history = state.iteration.history.filter(
    (h) => h.n <= checkpoint.iteration
  );
  saveState(state);
  return true;
}
async function rollbackToLatestCheckpoint(state) {
  if (state.checkpoints.items.length === 0) {
    return false;
  }
  const sorted = [...state.checkpoints.items].sort(
    (a, b) => b.iteration - a.iteration
  );
  const latest = sorted[0];
  if (!latest) return false;
  return rollbackToCheckpoint(latest.id, state);
}
function pruneOldCheckpoints(state) {
  const keep = state.checkpoints.auto.keep;
  const items = state.checkpoints.items;
  if (items.length <= keep) return;
  items.sort((a, b) => a.iteration - b.iteration);
  while (items.length > keep) {
    const removed = items.shift();
    if (removed) {
      const checkpointFile = join(CHECKPOINTS_DIR, `${removed.id}.json`);
      if (existsSync3(checkpointFile)) {
        unlinkSync2(checkpointFile);
      }
    }
  }
}

// src/strategies/recovery.ts
async function applyRecovery(state, stuck) {
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
function retryWithVariation(stuck) {
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
function simplifyTask(stuck) {
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
async function rollbackAndRetry(state) {
  const success = await rollbackToLatestCheckpoint(state);
  if (success) {
    return {
      action: "continue",
      promptSuffix: `

**ROLLBACK PERFORMED**: Reverted to last checkpoint.

Your previous approach led to a stuck state. With this fresh start, try a fundamentally different strategy.`
    };
  }
  return {
    action: "continue",
    promptSuffix: `

**STUCK DETECTED** (no checkpoint available for rollback)

Try a completely different approach to solve the problem.`
  };
}

// src/sync/webhook.ts
async function sendWebhook(state, eventData) {
  const config = state.controlCenter;
  if (!config.enabled || !config.url) {
    return false;
  }
  const event = {
    ...eventData,
    projectId: config.projectId ?? "unknown",
    taskId: state.task.id,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const response = await fetch(`${config.url}/api/webhooks/forge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// src/sync/status-sync.ts
import { existsSync as existsSync4, readFileSync as readFileSync4, writeFileSync as writeFileSync3, mkdirSync as mkdirSync3 } from "fs";
import { join as join2, dirname as dirname2 } from "path";
var FORGE_DIR2 = ".forge";
var PENDING_SYNC_FILE = join2(FORGE_DIR2, "pending-sync.json");
var MAX_RETRY_ATTEMPTS = 10;
var RETRY_DELAY_MS = 1e3;
function loadPendingQueue() {
  try {
    if (existsSync4(PENDING_SYNC_FILE)) {
      return JSON.parse(readFileSync4(PENDING_SYNC_FILE, "utf-8"));
    }
  } catch {
  }
  return { updates: [] };
}
function savePendingQueue(queue) {
  const dir = dirname2(PENDING_SYNC_FILE);
  if (!existsSync4(dir)) {
    mkdirSync3(dir, { recursive: true });
  }
  writeFileSync3(PENDING_SYNC_FILE, JSON.stringify(queue, null, 2));
}
function queueUpdate(update, controlUrl) {
  const queue = loadPendingQueue();
  const existingIndex = queue.updates.findIndex(
    (u) => u.update.taskId === update.taskId
  );
  if (existingIndex >= 0) {
    queue.updates[existingIndex] = {
      update,
      controlUrl,
      attempts: 0,
      lastAttempt: (/* @__PURE__ */ new Date()).toISOString()
    };
  } else {
    queue.updates.push({
      update,
      controlUrl,
      attempts: 0,
      lastAttempt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  savePendingQueue(queue);
}
function removeFromQueue(taskId) {
  const queue = loadPendingQueue();
  queue.updates = queue.updates.filter((u) => u.update.taskId !== taskId);
  savePendingQueue(queue);
}
async function sendStatusUpdate(controlUrl, update) {
  try {
    const response = await fetch(
      `${controlUrl}/api/projects/${update.projectId}/task-defs/${update.taskId}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: update.status,
          result: update.result
        }),
        signal: AbortSignal.timeout(1e4)
        // 10 second timeout
      }
    );
    if (!response.ok) {
      console.error(
        `[FORGE] Status sync failed: ${response.status} ${response.statusText}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("[FORGE] Status sync error:", error);
    return false;
  }
}
async function syncTaskStatus(state, status, result) {
  const config = state.controlCenter;
  if (!config.enabled || !config.url || !config.projectId) {
    return true;
  }
  const update = {
    taskId: state.task.id,
    projectId: config.projectId,
    status,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    result
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const success = await sendStatusUpdate(config.url, update);
    if (success) {
      removeFromQueue(update.taskId);
      console.error(`[FORGE] Status synced: ${status}`);
      return true;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
  }
  console.error(`[FORGE] Status sync failed after 3 attempts, queuing for retry`);
  queueUpdate(update, config.url);
  return false;
}
async function syncTaskComplete(state, criteriaResults) {
  return syncTaskStatus(state, state.task.status, {
    success: state.task.status === "completed",
    iterations: state.iteration.current,
    duration: state.metrics.totalDuration,
    tokens: state.metrics.totalTokens,
    filesCreated: state.metrics.filesCreated,
    filesModified: state.metrics.filesModified,
    summary: `Task ${state.task.status} after ${state.iteration.current} iterations`,
    criteriaResults: criteriaResults.map((r) => ({
      id: r.criterion.id,
      name: r.criterion.name,
      passed: r.passed
    }))
  });
}
async function processPendingSync() {
  const queue = loadPendingQueue();
  if (queue.updates.length === 0) {
    return { processed: 0, failed: 0 };
  }
  console.error(`[FORGE] Processing ${queue.updates.length} pending status syncs...`);
  let processed = 0;
  let failed = 0;
  for (const item of queue.updates) {
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      console.error(
        `[FORGE] Giving up on task ${item.update.taskId} after ${item.attempts} attempts`
      );
      failed++;
      continue;
    }
    const success = await sendStatusUpdate(item.controlUrl, item.update);
    if (success) {
      removeFromQueue(item.update.taskId);
      processed++;
    } else {
      item.attempts++;
      item.lastAttempt = (/* @__PURE__ */ new Date()).toISOString();
      savePendingQueue(queue);
      failed++;
    }
  }
  const updatedQueue = loadPendingQueue();
  updatedQueue.updates = updatedQueue.updates.filter(
    (u) => u.attempts < MAX_RETRY_ATTEMPTS
  );
  savePendingQueue(updatedQueue);
  return { processed, failed };
}
async function completeQueueTask(state, criteriaResults) {
  const config = state.controlCenter;
  if (!config.enabled || !config.url || !config.taskId) {
    return true;
  }
  try {
    const response = await fetch(
      `${config.url}/api/tasks/${config.taskId}/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: state.task.status,
          result: {
            success: state.task.status === "completed",
            iterations: state.iteration.current,
            duration: state.metrics.totalDuration,
            tokens: state.metrics.totalTokens,
            filesCreated: state.metrics.filesCreated,
            filesModified: state.metrics.filesModified,
            summary: `Task ${state.task.status} after ${state.iteration.current} iterations`,
            criteriaResults: criteriaResults.map((r) => ({
              id: r.criterion.id,
              name: r.criterion.name,
              passed: r.passed
            }))
          }
        }),
        signal: AbortSignal.timeout(1e4)
      }
    );
    if (!response.ok) {
      console.error(`[FORGE] Queue task complete failed: ${response.status}`);
      return false;
    }
    console.error("[FORGE] Queue task marked as complete");
    return true;
  } catch (error) {
    console.error("[FORGE] Queue task complete error:", error);
    return false;
  }
}

// src/sync/execution.ts
import { existsSync as existsSync5, readFileSync as readFileSync5, writeFileSync as writeFileSync4, mkdirSync as mkdirSync4 } from "fs";

// ../shared/dist/chunk-5MUQE3RX.js
var DEFAULT_EXECUTION = {
  version: "1.0",
  projectId: "",
  controlUrl: "",
  queue: [],
  current: {
    taskId: null,
    iteration: 0,
    startedAt: null,
    isPaused: false
  },
  lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
  lastUpdatedBy: "server"
};
var DEFAULT_LOCK_DURATION_MS = 5 * 60 * 1e3;
var LOCK_RENEWAL_THRESHOLD_MS = 60 * 1e3;

// src/sync/execution.ts
function loadExecution() {
  try {
    if (existsSync5(EXECUTION_FILE)) {
      const content = readFileSync5(EXECUTION_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("[FORGE] Failed to load execution file:", error);
  }
  return { ...DEFAULT_EXECUTION };
}
function saveExecution(execution) {
  try {
    if (!existsSync5(FORGE_DIR)) {
      mkdirSync4(FORGE_DIR, { recursive: true });
    }
    execution.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    execution.lastUpdatedBy = "plugin";
    writeFileSync4(EXECUTION_FILE, JSON.stringify(execution, null, 2));
  } catch (error) {
    console.error("[FORGE] Failed to save execution file:", error);
  }
}
function updateTaskStatus(taskId, status, result) {
  const execution = loadExecution();
  const task = execution.queue.find((t) => t.id === taskId);
  if (!task) {
    console.error(`[FORGE] Task ${taskId} not found in execution queue`);
    return;
  }
  task.status = status;
  if (status === "completed" || status === "failed" || status === "aborted") {
    task.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    task.result = result;
    if (execution.current.taskId === taskId) {
      execution.current = {
        taskId: null,
        iteration: 0,
        startedAt: null,
        isPaused: false
      };
    }
  }
  saveExecution(execution);
}
function updateIteration(taskId, iteration) {
  const execution = loadExecution();
  const task = execution.queue.find((t) => t.id === taskId);
  if (task) {
    task.iteration = iteration;
  }
  if (execution.current.taskId === taskId) {
    execution.current.iteration = iteration;
  }
  saveExecution(execution);
}

// src/hooks/stop.ts
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
async function main() {
  try {
    const inputRaw = readFileSync6(0, "utf-8");
    const input = JSON.parse(inputRaw);
    const output = await stopHook(input);
    console.log(JSON.stringify(output));
  } catch (error) {
    console.error("[FORGE] Hook error:", error);
    console.log(JSON.stringify({ decision: "approve" }));
  }
}
async function stopHook(input) {
  await processPendingSync();
  const state = loadState();
  if (!state || state.task.status !== "running") {
    return { decision: "approve" };
  }
  const command = checkExternalCommand();
  if (command) {
    return await handleExternalCommand(state, command);
  }
  const transcript = parseTranscript(input.transcript_path);
  const lastOutput = extractLastAssistantOutput(transcript);
  if (!lastOutput) {
    console.error("[FORGE] No assistant output found in transcript");
    return { decision: "approve", reason: "No output found" };
  }
  const tokens = estimateTokens(lastOutput);
  const iterStartTime = new Date(state.iteration.currentStartedAt).getTime();
  const iterDuration = Date.now() - iterStartTime;
  state.metrics.totalTokens += tokens;
  state.metrics.totalDuration += iterDuration;
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
  const budgetResult = checkBudgetLimits(state);
  if (budgetResult) {
    state.task.status = "failed";
    saveState(state);
    writeTaskResult(state, []);
    await syncTaskStatus(state, "failed", {
      success: false,
      iterations: state.iteration.current,
      duration: state.metrics.totalDuration,
      tokens: state.metrics.totalTokens,
      filesCreated: state.metrics.filesCreated,
      filesModified: state.metrics.filesModified,
      summary: budgetResult.message,
      error: budgetResult.message
    });
    await completeQueueTask(state, []);
    updateTaskStatus(state.task.id, "failed", {
      success: false,
      iterations: state.iteration.current,
      duration: state.metrics.totalDuration / 1e3,
      summary: budgetResult.message,
      error: budgetResult.message
    });
    await sendWebhook(state, {
      type: "task:failed",
      reason: budgetResult.reason,
      message: budgetResult.message,
      metrics: state.metrics
    });
    return { decision: "approve", reason: budgetResult.message };
  }
  if (state.iteration.max > 0 && state.iteration.current >= state.iteration.max) {
    state.task.status = "failed";
    saveState(state);
    writeTaskResult(state, []);
    const maxIterMsg = `Reached maximum iterations (${state.iteration.max})`;
    await syncTaskStatus(state, "failed", {
      success: false,
      iterations: state.iteration.current,
      duration: state.metrics.totalDuration,
      tokens: state.metrics.totalTokens,
      filesCreated: state.metrics.filesCreated,
      filesModified: state.metrics.filesModified,
      summary: maxIterMsg,
      error: maxIterMsg
    });
    await completeQueueTask(state, []);
    updateTaskStatus(state.task.id, "failed", {
      success: false,
      iterations: state.iteration.current,
      duration: state.metrics.totalDuration / 1e3,
      summary: maxIterMsg,
      error: maxIterMsg
    });
    await sendWebhook(state, {
      type: "task:failed",
      reason: "max-iterations",
      message: maxIterMsg,
      metrics: state.metrics
    });
    return {
      decision: "approve",
      reason: `Max iterations (${state.iteration.max}) reached`
    };
  }
  const criteriaResults = await evaluateCriteria(
    state.criteria.items,
    lastOutput
  );
  const outcome = "progress";
  const iterRecord = {
    n: state.iteration.current,
    startedAt: state.iteration.currentStartedAt,
    endedAt: (/* @__PURE__ */ new Date()).toISOString(),
    duration: iterDuration / 1e3,
    tokens,
    outcome,
    criteriaResults,
    summary: await generateIterationSummary(lastOutput)
  };
  const filesChanged = [...changes.created, ...changes.modified];
  writeIterationFile(
    state.task.id,
    state.iteration.current,
    iterRecord,
    tokens,
    filesChanged
  );
  const complete = isComplete(
    criteriaResults,
    state.criteria.mode,
    state.criteria.requiredScore
  );
  if (complete) {
    state.task.status = "completed";
    state.iteration.history.push(iterRecord);
    saveState(state);
    writeTaskResult(state, criteriaResults);
    await syncTaskComplete(state, criteriaResults);
    await completeQueueTask(state, criteriaResults);
    updateTaskStatus(state.task.id, "completed", {
      success: true,
      iterations: state.iteration.current,
      duration: state.metrics.totalDuration / 1e3,
      summary: `Completed after ${state.iteration.current} iterations`
    });
    await sendWebhook(state, {
      type: "task:completed",
      iterations: state.iteration.current,
      metrics: state.metrics,
      criteriaResults
    });
    console.error("[FORGE] Task completed! Checking for auto-advance...");
    console.error("[FORGE] Control Center config:", JSON.stringify({
      enabled: state.controlCenter.enabled,
      url: state.controlCenter.url,
      projectId: state.controlCenter.projectId
    }));
    if (state.controlCenter.enabled && state.controlCenter.url && state.controlCenter.projectId) {
      console.error("[FORGE] Attempting to claim next task...");
      const nextTask = await claimNextTask(state.controlCenter.url, state.controlCenter.projectId);
      if (nextTask) {
        console.error("[FORGE] \u2705 Next task claimed:", nextTask.name);
        const newState = initializeNewTask(nextTask, state.controlCenter);
        saveState(newState);
        console.error(`[FORGE] Auto-advancing to next task: ${nextTask.name}`);
        return {
          decision: "block",
          reason: nextTask.prompt,
          systemMessage: `**FORGE Auto-Advance**

Previous task completed successfully!
Now starting: "${nextTask.name}"

Task prompt: ${nextTask.prompt}`
        };
      }
    }
    console.error("[FORGE] No more tasks in queue. Allowing exit.");
    return {
      decision: "approve",
      reason: buildCompletionMessage(criteriaResults)
    };
  }
  state.iteration.history.push(iterRecord);
  let promptSuffix = "";
  if (state.stuckDetection.enabled) {
    const stuckResult = detectStuck(state);
    if (stuckResult.isStuck) {
      iterRecord.outcome = "stuck";
      await sendWebhook(state, {
        type: "task:stuck",
        iteration: state.iteration.current,
        pattern: stuckResult.pattern,
        recovery: state.stuckDetection.strategy
      });
      const recovery = await applyRecovery(state, stuckResult);
      if (recovery.action === "abort") {
        state.task.status = "stuck";
        saveState(state);
        writeTaskResult(state, criteriaResults);
        await syncTaskStatus(state, "stuck", {
          success: false,
          iterations: state.iteration.current,
          duration: state.metrics.totalDuration,
          tokens: state.metrics.totalTokens,
          filesCreated: state.metrics.filesCreated,
          filesModified: state.metrics.filesModified,
          summary: `Task stuck: ${recovery.reason}`,
          error: recovery.reason
        });
        return {
          decision: "approve",
          reason: `Task stuck and aborted: ${recovery.reason}`
        };
      }
      promptSuffix = recovery.promptSuffix ?? "";
    }
  }
  if (state.checkpoints.auto.enabled && state.iteration.current % state.checkpoints.auto.interval === 0) {
    const checkpoint = await createCheckpoint(state, "auto");
    if (checkpoint) {
      await sendWebhook(state, {
        type: "checkpoint:created",
        checkpoint
      });
    }
  }
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
  state.iteration.current++;
  state.iteration.currentStartedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveState(state);
  updateIteration(state.task.id, state.iteration.current);
  await sendWebhook(state, {
    type: "task:progress",
    iteration: state.iteration.current - 1,
    iterationRecord: iterRecord,
    metrics: state.metrics,
    criteriaResults
  });
  return {
    decision: "block",
    reason: state.task.prompt + promptSuffix,
    systemMessage: buildSystemMessage(state, criteriaResults)
  };
}
async function claimNextTask(controlUrl, projectId) {
  try {
    const response = await fetch(`${controlUrl}/api/projects/${projectId}/claim-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.error("[FORGE] No more tasks in queue");
        return null;
      }
      console.error(`[FORGE] Failed to claim next task: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("[FORGE] Failed to connect to Control Center:", error);
    return null;
  }
}
function initializeNewTask(task, controlCenter) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  createTaskFolderStructure(task, controlCenter, now);
  return {
    ...DEFAULT_STATE,
    version: "1.0.0",
    task: {
      id: task.id,
      name: task.name,
      prompt: task.prompt,
      startedAt: now,
      status: "running"
    },
    iteration: {
      ...DEFAULT_STATE.iteration,
      current: 1,
      max: task.maxIterations,
      currentStartedAt: now
    },
    criteria: {
      mode: "all",
      requiredScore: 0.8,
      items: task.criteria
    },
    budget: {
      maxDuration: null,
      maxTokens: null
    },
    controlCenter: {
      enabled: true,
      url: controlCenter.url,
      projectId: controlCenter.projectId,
      taskId: task.id
    }
  };
}
function createTaskFolderStructure(task, controlCenter, startedAt) {
  const taskDir = getTaskDir(task.id);
  const iterationsDir = getIterationsDir(task.id);
  const checkpointsDir = getTaskCheckpointsDir(task.id);
  mkdirSync5(taskDir, { recursive: true });
  mkdirSync5(iterationsDir, { recursive: true });
  mkdirSync5(checkpointsDir, { recursive: true });
  const taskFile = {
    id: task.id,
    name: task.name,
    prompt: task.prompt,
    startedAt,
    endedAt: null,
    status: "running",
    project: {
      id: controlCenter.projectId,
      controlUrl: controlCenter.url
    },
    config: {
      criteria: task.criteria,
      maxIterations: task.maxIterations,
      maxDuration: null,
      checkpointInterval: 10,
      stuckStrategy: "retry-variation"
    }
  };
  writeFileSync5(getTaskConfigPath(task.id), JSON.stringify(taskFile, null, 2));
}
function checkExternalCommand() {
  if (!existsSync6(COMMAND_FILE)) return null;
  try {
    const content = readFileSync6(COMMAND_FILE, "utf-8");
    unlinkSync3(COMMAND_FILE);
    return JSON.parse(content);
  } catch {
    return null;
  }
}
async function handleExternalCommand(state, command) {
  switch (command.command) {
    case "complete":
      state.task.status = "completed";
      saveState(state);
      writeTaskResult(state, []);
      await syncTaskComplete(state, []);
      await completeQueueTask(state, []);
      updateTaskStatus(state.task.id, "completed", {
        success: true,
        iterations: state.iteration.current,
        duration: state.metrics.totalDuration / 1e3,
        summary: "Completed by explicit command"
      });
      await sendWebhook(state, {
        type: "task:completed",
        iterations: state.iteration.current,
        metrics: state.metrics,
        criteriaResults: []
      });
      if (state.controlCenter.enabled && state.controlCenter.url && state.controlCenter.projectId) {
        const nextTask = await claimNextTask(state.controlCenter.url, state.controlCenter.projectId);
        if (nextTask) {
          const newState = initializeNewTask(nextTask, state.controlCenter);
          saveState(newState);
          return {
            decision: "block",
            reason: nextTask.prompt,
            systemMessage: `**FORGE Auto-Advance**

Previous task completed!
Now starting: "${nextTask.name}"

Task prompt: ${nextTask.prompt}`
          };
        }
      }
      return { decision: "approve", reason: "Task completed by explicit command" };
    case "pause":
      state.task.status = "paused";
      saveState(state);
      await syncTaskStatus(state, "paused");
      updateTaskStatus(state.task.id, "paused");
      await sendWebhook(state, {
        type: "task:paused",
        iteration: state.iteration.current
      });
      return { decision: "approve", reason: "FORGE paused by user" };
    case "abort":
      state.task.status = "aborted";
      saveState(state);
      await syncTaskStatus(state, "aborted", {
        success: false,
        iterations: state.iteration.current,
        duration: state.metrics.totalDuration,
        tokens: state.metrics.totalTokens,
        filesCreated: state.metrics.filesCreated,
        filesModified: state.metrics.filesModified,
        summary: "Aborted by user",
        error: "Aborted by user"
      });
      updateTaskStatus(state.task.id, "aborted", {
        success: false,
        iterations: state.iteration.current,
        duration: state.metrics.totalDuration / 1e3,
        summary: "Aborted by user",
        error: "Aborted by user"
      });
      await sendWebhook(state, {
        type: "task:failed",
        reason: "aborted",
        message: "Aborted by user",
        metrics: state.metrics
      });
      return { decision: "approve", reason: "FORGE aborted by user" };
    default:
      return { decision: "approve" };
  }
}
function checkBudgetLimits(state) {
  if (state.budget.maxDuration !== null && state.metrics.totalDuration > state.budget.maxDuration * 1e3) {
    const minutes = Math.round(state.metrics.totalDuration / 6e4);
    const maxMinutes = Math.round(state.budget.maxDuration / 60);
    return {
      reason: "timeout",
      message: `Duration exceeded: ${minutes}min > ${maxMinutes}min`
    };
  }
  if (state.budget.maxTokens !== null && state.metrics.totalTokens > state.budget.maxTokens) {
    return {
      reason: "tokens",
      message: `Token limit exceeded: ${state.metrics.totalTokens} > ${state.budget.maxTokens}`
    };
  }
  return null;
}
function buildCompletionMessage(results) {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const names = results.filter((r) => r.passed).map((r) => r.criterion.name);
  return `
**FORGE COMPLETE!**

${passed}/${total} criteria passed
${names.map((n) => `   - ${n}`).join("\n")}

Great work!`;
}
function writeIterationFile(taskId, iterNum, record, tokens, filesChanged) {
  const iterFile = {
    num: iterNum,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    duration: record.duration,
    tokens: {
      input: Math.floor(tokens * 0.3),
      // Estimate
      output: Math.floor(tokens * 0.7),
      // Estimate
      total: tokens
    },
    outcome: record.outcome,
    criteriaResults: record.criteriaResults.map((r) => ({
      id: r.criterion.id,
      name: r.criterion.name,
      passed: r.passed,
      output: r.currentValue ?? r.error ?? "",
      duration: 0
      // TODO: track per-criterion duration
    })),
    summary: record.summary,
    filesChanged,
    error: record.error
  };
  const iterDir = getIterationsDir(taskId);
  if (!existsSync6(iterDir)) {
    mkdirSync5(iterDir, { recursive: true });
  }
  const path = getIterationPath(taskId, iterNum);
  writeFileSync5(path, JSON.stringify(iterFile, null, 2));
}
function writeTaskResult(state, criteriaResults) {
  const taskId = state.task.id;
  const result = {
    status: state.task.status,
    iterations: state.iteration.current,
    duration: state.metrics.totalDuration / 1e3,
    tokens: state.metrics.totalTokens,
    criteriaResults: criteriaResults.map((r) => ({
      id: r.criterion.id,
      name: r.criterion.name,
      passed: r.passed
    })),
    summary: `Task ${state.task.status} after ${state.iteration.current} iterations`,
    filesCreated: state.metrics.filesCreated,
    filesModified: state.metrics.filesModified,
    completedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const taskDir = getTaskDir(taskId);
  if (!existsSync6(taskDir)) {
    mkdirSync5(taskDir, { recursive: true });
  }
  const path = getTaskResultPath(taskId);
  writeFileSync5(path, JSON.stringify(result, null, 2));
  const configPath = getTaskConfigPath(taskId);
  if (existsSync6(configPath)) {
    try {
      const taskFile = JSON.parse(readFileSync6(configPath, "utf-8"));
      taskFile.endedAt = result.completedAt;
      taskFile.status = state.task.status;
      writeFileSync5(configPath, JSON.stringify(taskFile, null, 2));
    } catch {
    }
  }
}
function buildSystemMessage(state, results) {
  const lines = [
    `FORGE Iteration ${state.iteration.current}`,
    "",
    "**Criteria Status:**"
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
  lines.push(`- Duration: ${Math.round(state.metrics.totalDuration / 1e3)}s`);
  if (state.iteration.max > 0) {
    lines.push(
      `- Progress: ${state.iteration.current}/${state.iteration.max} iterations`
    );
  }
  return lines.join("\n");
}
main();

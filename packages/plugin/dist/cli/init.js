#!/usr/bin/env node
import {
  generateId
} from "../chunk-MDTJ7MHC.js";
import {
  DEFAULT_STATE,
  FORGE_DIR,
  STATE_FILE,
  getIterationsDir,
  getTaskCheckpointsDir,
  getTaskConfigPath,
  getTaskDir
} from "../chunk-FJGGFLPX.js";

// src/cli/init.ts
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
function loadConfig() {
  const configPath = join(process.cwd(), ".forge.json");
  if (!existsSync(configPath)) return {};
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
function loadExistingState() {
  try {
    if (existsSync(STATE_FILE)) {
      const content = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch {
  }
  return null;
}
async function completePreviousTask(state) {
  const config = state.controlCenter;
  if (!config.enabled || !config.url || !config.taskId) {
    console.log("[FORGE] No previous task to complete");
    return;
  }
  if (state.task.status !== "running") {
    console.log("[FORGE] Previous task already " + state.task.status);
    return;
  }
  console.log("[FORGE] Completing previous task: " + state.task.name);
  try {
    const response = await fetch(
      config.url + "/api/tasks/" + config.taskId + "/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          result: {
            success: true,
            iterations: state.iteration.current,
            duration: state.metrics.totalDuration,
            tokens: state.metrics.totalTokens,
            filesCreated: state.metrics.filesCreated,
            filesModified: state.metrics.filesModified,
            summary: "Task completed (manual advance) after " + state.iteration.current + " iterations"
          }
        }),
        signal: AbortSignal.timeout(1e4)
      }
    );
    if (response.ok) {
      console.log("[FORGE] Previous task marked as complete");
    } else {
      console.error("[FORGE] Failed to complete previous task: " + response.status);
    }
  } catch (error) {
    console.error("[FORGE] Error completing previous task:", error);
  }
}
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: "",
    until: [],
    maxIterations: 0,
    checkpointEvery: 10,
    onStuck: "retry-variation"
  };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--until" && args[i + 1]) {
      result.until.push(args[++i]);
    } else if (arg === "--name" && args[i + 1]) {
      result.name = args[++i];
    } else if (arg === "--max-iterations" && args[i + 1]) {
      result.maxIterations = parseInt(args[++i], 10);
    } else if (arg === "--max-duration" && args[i + 1]) {
      result.maxDuration = parseInt(args[++i], 10);
    } else if (arg === "--checkpoint-every" && args[i + 1]) {
      result.checkpointEvery = parseInt(args[++i], 10);
    } else if (arg === "--on-stuck" && args[i + 1]) {
      result.onStuck = args[++i];
    } else if (arg === "--control" && args[i + 1]) {
      result.control = args[++i];
    } else if (arg === "--project" && args[i + 1]) {
      result.project = args[++i];
    } else if (!arg.startsWith("--")) {
      result.prompt = arg;
    }
    i++;
  }
  return result;
}
function buildCriteria(untilArgs) {
  return untilArgs.map((until, index) => {
    const id = `criterion-${index + 1}`;
    const lower = until.toLowerCase();
    if (lower === "tests pass") {
      return {
        id,
        type: "test-pass",
        name: "Tests Pass",
        config: { cmd: "npm test" },
        weight: 1,
        required: true
      };
    }
    if (lower === "lint clean") {
      return {
        id,
        type: "lint-clean",
        name: "Lint Clean",
        config: { cmd: "npm run lint" },
        weight: 1,
        required: true
      };
    }
    const coverageMatch = lower.match(/coverage\s*[>>=]\s*(\d+)%?/);
    if (coverageMatch) {
      return {
        id,
        type: "coverage",
        name: `Coverage \u2265${coverageMatch[1]}%`,
        config: { cmd: "npm run coverage", min: parseInt(coverageMatch[1], 10) },
        weight: 1,
        required: true
      };
    }
    const fileMatch = until.match(/file exists (.+)/i);
    if (fileMatch) {
      return {
        id,
        type: "file-exists",
        name: `File: ${fileMatch[1]}`,
        config: { path: fileMatch[1] },
        weight: 1,
        required: true
      };
    }
    return {
      id,
      type: "command",
      name: until,
      config: { cmd: until },
      weight: 1,
      required: true
    };
  });
}
async function sendWebhook(url, event) {
  try {
    const response = await fetch(`${url}/api/webhooks/forge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
    return response.ok;
  } catch {
    return false;
  }
}
async function claimTaskFromServer(controlUrl, projectId) {
  try {
    const response = await fetch(`${controlUrl}/api/projects/${projectId}/claim-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) {
      if (response.status === 404) {
        console.log("No queued tasks for this project.");
        return null;
      }
      console.error(`Failed to claim task: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to connect to Control Center:", error);
    return null;
  }
}
async function main() {
  const args = parseArgs();
  const config = loadConfig();
  const projectId = args.project ?? config.projectId;
  const controlUrl = args.control ?? config.controlUrl;
  const existingState = loadExistingState();
  if (existingState && existingState.task.status === "running" && controlUrl) {
    console.log("[FORGE] Found running task: " + existingState.task.name);
    await completePreviousTask(existingState);
  }
  let taskId;
  let taskName;
  let taskPrompt;
  let criteria;
  let maxIterations;
  if (projectId && controlUrl) {
    console.log(`Fetching task from Control Center for project: ${projectId}...`);
    const serverTask = await claimTaskFromServer(controlUrl, projectId);
    if (!serverTask) {
      console.log("No tasks to run. Exiting.");
      process.exit(0);
    }
    taskId = serverTask.id;
    taskName = serverTask.name;
    taskPrompt = serverTask.prompt;
    criteria = serverTask.criteria;
    maxIterations = serverTask.maxIterations;
    args.control = controlUrl;
    args.project = projectId;
    console.log(`Claimed task: ${taskName}`);
  } else {
    if (!args.prompt) {
      console.error("Error: PROMPT is required (or use --project with --control, or link with /forge:forge-link)");
      process.exit(1);
    }
    taskId = generateId();
    taskName = args.name ?? args.prompt.slice(0, 50);
    taskPrompt = args.prompt;
    criteria = buildCriteria(args.until);
    maxIterations = args.maxIterations;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const state = {
    ...DEFAULT_STATE,
    version: "1.0.0",
    task: {
      id: taskId,
      name: taskName,
      prompt: taskPrompt,
      startedAt: now,
      status: "running"
    },
    iteration: {
      ...DEFAULT_STATE.iteration,
      current: 1,
      max: maxIterations,
      currentStartedAt: now
    },
    criteria: {
      mode: "all",
      requiredScore: 0.8,
      items: criteria
    },
    budget: {
      maxDuration: args.maxDuration ?? null,
      maxTokens: null
    },
    checkpoints: {
      auto: {
        enabled: true,
        interval: args.checkpointEvery,
        keep: 3
      },
      items: []
    },
    stuckDetection: {
      enabled: true,
      sameOutputThreshold: 3,
      noProgressThreshold: 5,
      strategy: args.onStuck
    },
    controlCenter: {
      enabled: !!args.control,
      url: args.control ?? null,
      projectId: projectId ?? process.cwd(),
      // Use server projectId or cwd as fallback
      taskId
    }
  };
  if (!existsSync(FORGE_DIR)) {
    mkdirSync(FORGE_DIR, { recursive: true });
  }
  const taskDir = getTaskDir(taskId);
  const iterationsDir = getIterationsDir(taskId);
  const checkpointsDir = getTaskCheckpointsDir(taskId);
  mkdirSync(taskDir, { recursive: true });
  mkdirSync(iterationsDir, { recursive: true });
  mkdirSync(checkpointsDir, { recursive: true });
  const taskFile = {
    id: taskId,
    name: taskName,
    prompt: taskPrompt,
    startedAt: now,
    endedAt: null,
    status: "running",
    project: {
      id: projectId ?? null,
      controlUrl: controlUrl ?? null
    },
    config: {
      criteria,
      maxIterations,
      maxDuration: args.maxDuration ?? null,
      checkpointInterval: args.checkpointEvery,
      stuckStrategy: args.onStuck
    }
  };
  writeFileSync(getTaskConfigPath(taskId), JSON.stringify(taskFile, null, 2));
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  if (args.control && !args.project) {
    const projectPath = process.cwd();
    const projectName = projectPath.split(/[/\\]/).pop() ?? "Unknown Project";
    await sendWebhook(args.control, {
      type: "task:started",
      projectId: projectPath,
      projectPath,
      projectName,
      taskId,
      timestamp: now,
      name: taskName,
      prompt: taskPrompt,
      criteria
    });
  }
  console.log(`
\u{1F525} FORGE Initialized!

Task ID: ${taskId}
Task: "${taskName}"
Prompt: "${taskPrompt}"
Criteria: ${criteria.map((c) => c.name).join(", ") || "none"}
Max Iterations: ${maxIterations || "unlimited"}
${args.control ? `Control Center: ${args.control}` : ""}
${args.project ? `Project: ${args.project}` : ""}

Starting work on the task...
`);
}
main().catch(console.error);

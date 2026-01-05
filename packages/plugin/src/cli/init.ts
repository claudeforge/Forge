#!/usr/bin/env node
/**
 * FORGE Initialize CLI
 * Creates state file and sends task:started webhook
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ForgeState, CompletionCriterion, TaskFile } from "@claudeforge/forge-shared";
import {
  STATE_FILE,
  FORGE_DIR,
  getTaskDir,
  getTaskConfigPath,
  getIterationsDir,
  getTaskCheckpointsDir,
} from "@claudeforge/forge-shared/constants";
import { DEFAULT_STATE } from "@claudeforge/forge-shared/constants";
import { generateId } from "@claudeforge/forge-shared/utils";

interface ForgeConfig {
  projectId?: string;
  controlUrl?: string;
}

function loadConfig(): ForgeConfig {
  const configPath = join(process.cwd(), ".forge.json");
  if (!existsSync(configPath)) return {};

  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

interface InitArgs {
  prompt: string;
  name?: string;
  until: string[];
  maxIterations: number;
  maxDuration?: number;
  checkpointEvery: number;
  onStuck: string;
  control?: string;
  project?: string; // Project ID for fetching task from Control Center
}

function parseArgs(): InitArgs {
  const args = process.argv.slice(2);
  const result: InitArgs = {
    prompt: "",
    until: [],
    maxIterations: 0,
    checkpointEvery: 10,
    onStuck: "retry-variation",
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--until" && args[i + 1]) {
      result.until.push(args[++i]!);
    } else if (arg === "--name" && args[i + 1]) {
      result.name = args[++i];
    } else if (arg === "--max-iterations" && args[i + 1]) {
      result.maxIterations = parseInt(args[++i]!, 10);
    } else if (arg === "--max-duration" && args[i + 1]) {
      result.maxDuration = parseInt(args[++i]!, 10);
    } else if (arg === "--checkpoint-every" && args[i + 1]) {
      result.checkpointEvery = parseInt(args[++i]!, 10);
    } else if (arg === "--on-stuck" && args[i + 1]) {
      result.onStuck = args[++i]!;
    } else if (arg === "--control" && args[i + 1]) {
      result.control = args[++i];
    } else if (arg === "--project" && args[i + 1]) {
      result.project = args[++i];
    } else if (!arg!.startsWith("--")) {
      result.prompt = arg!;
    }
    i++;
  }

  return result;
}

function buildCriteria(untilArgs: string[]): CompletionCriterion[] {
  return untilArgs.map((until, index) => {
    const id = `criterion-${index + 1}`;
    const lower = until.toLowerCase();

    if (lower === "tests pass") {
      return {
        id,
        type: "test-pass" as const,
        name: "Tests Pass",
        config: { cmd: "npm test" },
        weight: 1,
        required: true,
      };
    }

    if (lower === "lint clean") {
      return {
        id,
        type: "lint-clean" as const,
        name: "Lint Clean",
        config: { cmd: "npm run lint" },
        weight: 1,
        required: true,
      };
    }

    const coverageMatch = lower.match(/coverage\s*[>>=]\s*(\d+)%?/);
    if (coverageMatch) {
      return {
        id,
        type: "coverage" as const,
        name: `Coverage ≥${coverageMatch[1]}%`,
        config: { cmd: "npm run coverage", min: parseInt(coverageMatch[1]!, 10) },
        weight: 1,
        required: true,
      };
    }

    const fileMatch = until.match(/file exists (.+)/i);
    if (fileMatch) {
      return {
        id,
        type: "file-exists" as const,
        name: `File: ${fileMatch[1]}`,
        config: { path: fileMatch[1]! },
        weight: 1,
        required: true,
      };
    }

    // Default: command criterion
    return {
      id,
      type: "command" as const,
      name: until,
      config: { cmd: until },
      weight: 1,
      required: true,
    };
  });
}

async function sendWebhook(url: string, event: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/webhooks/forge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface ServerTask {
  id: string;
  name: string;
  prompt: string;
  criteria: CompletionCriterion[];
  maxIterations: number;
}

async function claimTaskFromServer(controlUrl: string, projectId: string): Promise<ServerTask | null> {
  try {
    const response = await fetch(`${controlUrl}/api/projects/${projectId}/claim-task`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log("No queued tasks for this project.");
        return null;
      }
      console.error(`Failed to claim task: ${response.status}`);
      return null;
    }

    return await response.json() as ServerTask;
  } catch (error) {
    console.error("Failed to connect to Control Center:", error);
    return null;
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const config = loadConfig();

  // Use config as fallback for --project and --control
  const projectId = args.project ?? config.projectId;
  const controlUrl = args.control ?? config.controlUrl;

  let taskId: string;
  let taskName: string;
  let taskPrompt: string;
  let criteria: CompletionCriterion[];
  let maxIterations: number;

  // If project is available (from args or config), fetch task from Control Center
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

    // Update args for later use
    args.control = controlUrl;
    args.project = projectId;

    console.log(`Claimed task: ${taskName}`);
  } else {
    // Traditional mode: use command-line args
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

  const now = new Date().toISOString();

  const state: ForgeState = {
    ...DEFAULT_STATE,
    version: "1.0.0",
    task: {
      id: taskId,
      name: taskName,
      prompt: taskPrompt,
      startedAt: now,
      status: "running",
    },
    iteration: {
      ...DEFAULT_STATE.iteration,
      current: 1,
      max: maxIterations,
      currentStartedAt: now,
    },
    criteria: {
      mode: "all",
      requiredScore: 0.8,
      items: criteria,
    },
    budget: {
      maxDuration: args.maxDuration ?? null,
      maxTokens: null,
    },
    checkpoints: {
      auto: {
        enabled: true,
        interval: args.checkpointEvery,
        keep: 3,
      },
      items: [],
    },
    stuckDetection: {
      enabled: true,
      sameOutputThreshold: 3,
      noProgressThreshold: 5,
      strategy: args.onStuck as ForgeState["stuckDetection"]["strategy"],
    },
    controlCenter: {
      enabled: !!args.control,
      url: args.control ?? null,
      projectId: process.cwd(), // Use cwd as project identifier
      taskId: taskId,
    },
  };

  // Create .forge directory if needed
  if (!existsSync(FORGE_DIR)) {
    mkdirSync(FORGE_DIR, { recursive: true });
  }

  // Create task folder structure
  const taskDir = getTaskDir(taskId);
  const iterationsDir = getIterationsDir(taskId);
  const checkpointsDir = getTaskCheckpointsDir(taskId);

  mkdirSync(taskDir, { recursive: true });
  mkdirSync(iterationsDir, { recursive: true });
  mkdirSync(checkpointsDir, { recursive: true });

  // Write task.json
  const taskFile: TaskFile = {
    id: taskId,
    name: taskName,
    prompt: taskPrompt,
    startedAt: now,
    endedAt: null,
    status: "running",
    project: {
      id: projectId ?? null,
      controlUrl: controlUrl ?? null,
    },
    config: {
      criteria: criteria,
      maxIterations: maxIterations,
      maxDuration: args.maxDuration ?? null,
      checkpointInterval: args.checkpointEvery,
      stuckStrategy: args.onStuck as TaskFile["config"]["stuckStrategy"],
    },
  };

  writeFileSync(getTaskConfigPath(taskId), JSON.stringify(taskFile, null, 2));

  // Write state file
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  // Send webhook if control center enabled (but not if we already claimed from server)
  if (args.control && !args.project) {
    const projectPath = process.cwd();
    const projectName = projectPath.split(/[/\\]/).pop() ?? "Unknown Project";

    await sendWebhook(args.control, {
      type: "task:started",
      projectId: projectPath,
      projectPath: projectPath,
      projectName: projectName,
      taskId: taskId,
      timestamp: now,
      name: taskName,
      prompt: taskPrompt,
      criteria: criteria,
    });
  }

  // Output confirmation
  console.log(`
🔥 FORGE Initialized!

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

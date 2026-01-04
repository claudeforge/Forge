#!/usr/bin/env node
/**
 * FORGE Initialize CLI
 * Creates state file and sends task:started webhook
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { ForgeState, CompletionCriterion } from "@claudeforge/forge-shared";
import { STATE_FILE } from "@claudeforge/forge-shared/constants";
import { DEFAULT_STATE } from "@claudeforge/forge-shared/constants";
import { generateId } from "@claudeforge/forge-shared/utils";

interface InitArgs {
  prompt: string;
  name?: string;
  until: string[];
  maxIterations: number;
  maxCost?: number;
  maxDuration?: number;
  checkpointEvery: number;
  onStuck: string;
  control?: string;
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
    } else if (arg === "--max-cost" && args[i + 1]) {
      const cost = args[++i]!.replace("$", "");
      result.maxCost = parseFloat(cost);
    } else if (arg === "--max-duration" && args[i + 1]) {
      result.maxDuration = parseInt(args[++i]!, 10);
    } else if (arg === "--checkpoint-every" && args[i + 1]) {
      result.checkpointEvery = parseInt(args[++i]!, 10);
    } else if (arg === "--on-stuck" && args[i + 1]) {
      result.onStuck = args[++i]!;
    } else if (arg === "--control" && args[i + 1]) {
      result.control = args[++i];
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

async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.prompt) {
    console.error("Error: PROMPT is required");
    process.exit(1);
  }

  const taskId = generateId();
  const now = new Date().toISOString();
  const criteria = buildCriteria(args.until);

  const state: ForgeState = {
    ...DEFAULT_STATE,
    version: "1.0.0",
    task: {
      id: taskId,
      name: args.name ?? args.prompt.slice(0, 50),
      prompt: args.prompt,
      startedAt: now,
      status: "running",
    },
    iteration: {
      ...DEFAULT_STATE.iteration,
      current: 1,
      currentStartedAt: now,
    },
    criteria: {
      mode: "all",
      requiredScore: 0.8,
      items: criteria,
    },
    budget: {
      maxCost: args.maxCost ?? null,
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

  // Create directory if needed
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write state file
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  // Send webhook if control center enabled
  if (args.control) {
    const projectPath = process.cwd();
    const projectName = projectPath.split(/[/\\]/).pop() ?? "Unknown Project";

    await sendWebhook(args.control, {
      type: "task:started",
      projectId: projectPath, // Use path as unique identifier
      projectPath: projectPath,
      projectName: projectName,
      taskId: taskId,
      timestamp: now,
      name: state.task.name,
      prompt: state.task.prompt,
      criteria: criteria,
    });
  }

  // Output confirmation
  console.log(`
🔥 FORGE Initialized!

Task ID: ${taskId}
Prompt: "${args.prompt}"
Criteria: ${criteria.map((c) => c.name).join(", ")}
Max Iterations: ${args.maxIterations || "unlimited"}
${args.control ? `Control Center: ${args.control}` : ""}

Starting work on the task...
`);
}

main().catch(console.error);

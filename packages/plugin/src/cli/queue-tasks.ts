#!/usr/bin/env node
/**
 * FORGE Queue Tasks CLI
 * Sends task definition files to Control Center
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { TaskDefinition } from "@claudeforge/forge-shared";
import { TASK_DEFS_DIR, getTaskDefPath } from "@claudeforge/forge-shared/constants";

interface ForgeConfig {
  projectId?: string;
  controlUrl?: string;
}

interface QueueArgs {
  project: string;
  control: string;
  all: boolean;
  task: string | null;
  plan: string | null;
  dryRun: boolean;
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

function parseArgs(): QueueArgs {
  const args = process.argv.slice(2);
  const result: QueueArgs = {
    project: "",
    control: "",
    all: false,
    task: null,
    plan: null,
    dryRun: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--project" && args[i + 1]) {
      result.project = args[++i]!;
    } else if (arg === "--control" && args[i + 1]) {
      result.control = args[++i]!;
    } else if (arg === "--all") {
      result.all = true;
    } else if (arg === "--task" && args[i + 1]) {
      result.task = args[++i]!;
    } else if (arg === "--plan" && args[i + 1]) {
      result.plan = args[++i]!;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    }
    i++;
  }

  return result;
}

function loadTaskDef(taskId: string): TaskDefinition | null {
  const path = getTaskDefPath(taskId);
  if (!existsSync(path)) {
    console.error(`Task file not found: ${path}`);
    return null;
  }

  try {
    const content = readFileSync(path, "utf-8");
    return parseYaml(content) as TaskDefinition;
  } catch (error) {
    console.error(`Failed to parse ${path}:`, error);
    return null;
  }
}

function findAllTasks(): string[] {
  if (!existsSync(TASK_DEFS_DIR)) return [];

  return readdirSync(TASK_DEFS_DIR)
    .filter(f => f.endsWith(".yaml"))
    .map(f => f.replace(".yaml", ""))
    .sort();
}

function findPlanTasks(planId: string): string[] {
  const metaPath = join(process.cwd(), ".forge", "plans", `${planId}.json`);
  if (!existsSync(metaPath)) {
    console.error(`Plan not found: ${planId}`);
    return [];
  }

  try {
    const content = readFileSync(metaPath, "utf-8");
    const meta = JSON.parse(content);
    return meta.task_ids || [];
  } catch {
    return [];
  }
}

function calculatePriority(task: TaskDefinition, allTasks: Map<string, TaskDefinition>): number {
  const deps = task.depends_on ?? [];
  if (deps.length === 0) return 0;

  let maxDepPriority = 0;
  for (const depId of deps) {
    const dep = allTasks.get(depId);
    if (dep) {
      const depPriority = calculatePriority(dep, allTasks);
      maxDepPriority = Math.max(maxDepPriority, depPriority);
    }
  }
  return maxDepPriority + 1;
}

function generatePrompt(task: TaskDefinition): string {
  const lines: string[] = [
    `# Task: ${task.id} - ${task.title}`,
    "",
    "## Description",
    task.description ?? "",
    "",
  ];

  const technical = task.technical ?? {};
  const filesToCreate = technical.files_to_create ?? [];
  const filesToModify = technical.files_to_modify ?? [];
  const considerations = technical.considerations ?? [];
  const goals = task.goals ?? [];
  const criteria = task.criteria ?? [];
  const dependsOn = task.depends_on ?? [];
  const execution = task.execution ?? {};

  if (technical.approach) {
    lines.push("## Technical Approach", technical.approach, "");
  }

  if (filesToCreate.length > 0) {
    lines.push("## Files to Create");
    filesToCreate.forEach(f => lines.push(`- ${f}`));
    lines.push("");
  }

  if (filesToModify.length > 0) {
    lines.push("## Files to Modify");
    filesToModify.forEach(f => lines.push(`- ${f}`));
    lines.push("");
  }

  if (considerations.length > 0) {
    lines.push("## Considerations");
    considerations.forEach(c => lines.push(`- ${c}`));
    lines.push("");
  }

  if (goals.length > 0) {
    lines.push("## Goals");
    goals.forEach(g => lines.push(`- ${g}`));
    lines.push("");
  }

  if (criteria.length > 0) {
    lines.push("## Success Criteria");
    lines.push("This task is complete when:");
    criteria.forEach(c => lines.push(`- ${c.name}`));
    lines.push("");
  }

  lines.push("---");
  if (task.spec_id) lines.push(`Spec: ${task.spec_id}`);
  if (task.plan_id) lines.push(`Plan: ${task.plan_id}`);
  if (dependsOn.length > 0) {
    lines.push(`Dependencies: ${dependsOn.join(", ")}`);
  }
  if (execution.max_iterations) {
    lines.push(`Max Iterations: ${execution.max_iterations}`);
  }

  return lines.join("\n");
}

async function queueTask(
  controlUrl: string,
  projectId: string,
  task: TaskDefinition,
  priority: number
): Promise<{ id: string; name: string } | null> {
  try {
    const prompt = generatePrompt(task);
    const taskCriteria = task.criteria ?? [];
    const execution = task.execution ?? {};
    const technical = task.technical ?? {};

    const criteria = taskCriteria.map((c, i) => ({
      id: `criterion-${i + 1}`,
      type: c.type,
      name: c.name,
      config: c.config,
      weight: 1,
      required: true,
    }));

    const response = await fetch(`${controlUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: `${task.id}: ${task.title}`,
        prompt,
        priority,
        taskType: task.type ?? null,
        complexity: task.complexity ?? null,
        config: {
          criteria,
          maxIterations: execution.max_iterations ?? 10,
          taskDefId: task.id,
          specId: task.spec_id,
          planId: task.plan_id,
          dependencies: task.depends_on ?? [],
          checkpointEvery: execution.checkpoint_every,
          onStuck: execution.on_stuck,
          technical,
        },
      }),
    });

    if (!response.ok) {
      console.error(`Failed to queue ${task.id}: ${response.status}`);
      return null;
    }

    return await response.json() as { id: string; name: string };
  } catch (error) {
    console.error(`Failed to queue ${task.id}:`, error);
    return null;
  }
}

function updateTaskStatus(taskId: string, status: string): void {
  const path = getTaskDefPath(taskId);
  if (!existsSync(path)) return;

  try {
    const content = readFileSync(path, "utf-8");
    const task = parseYaml(content) as TaskDefinition;
    task.status = status as TaskDefinition["status"];
    task.queued_at = new Date().toISOString();

    writeFileSync(path, stringifyYaml(task));
  } catch {
    // Ignore errors
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const config = loadConfig();

  const projectId = args.project || config.projectId;
  const controlUrl = args.control || config.controlUrl;

  if (!projectId || !controlUrl) {
    console.error("Error: Project not linked. Run /forge:forge-link first.");
    process.exit(1);
  }

  // Find tasks to queue
  let taskIds: string[] = [];

  if (args.all) {
    taskIds = findAllTasks();
  } else if (args.task) {
    taskIds = [args.task];
  } else if (args.plan) {
    taskIds = findPlanTasks(args.plan);
  } else {
    console.error("Error: Specify --all, --task, or --plan");
    process.exit(1);
  }

  if (taskIds.length === 0) {
    console.log("No tasks found to queue.");
    process.exit(0);
  }

  // Load all task definitions
  const tasks = new Map<string, TaskDefinition>();
  const pendingTasks: TaskDefinition[] = [];

  for (const taskId of taskIds) {
    const task = loadTaskDef(taskId);
    if (task) {
      tasks.set(taskId, task);
      if (task.status === "pending") {
        pendingTasks.push(task);
      } else {
        console.log(`  ⏭️  ${taskId}: ${task.status} (skipped)`);
      }
    }
  }

  if (pendingTasks.length === 0) {
    console.log("No pending tasks to queue.");
    process.exit(0);
  }

  // Calculate priorities based on dependencies
  const taskPriorities = new Map<string, number>();
  for (const task of pendingTasks) {
    const priority = calculatePriority(task, tasks);
    taskPriorities.set(task.id, priority);
  }

  // Sort by priority
  pendingTasks.sort((a, b) => {
    const pa = taskPriorities.get(a.id) ?? 0;
    const pb = taskPriorities.get(b.id) ?? 0;
    return pa - pb;
  });

  console.log(`\n📋 Queuing ${pendingTasks.length} tasks...\n`);

  if (args.dryRun) {
    console.log("DRY RUN - Tasks that would be queued:\n");
    for (const task of pendingTasks) {
      const priority = taskPriorities.get(task.id) ?? 0;
      const deps = task.depends_on.length > 0 ? ` (deps: ${task.depends_on.join(", ")})` : "";
      console.log(`  ${task.id}: ${task.title} [priority: ${priority}]${deps}`);
    }
    console.log("\nRun without --dry-run to queue tasks.");
    process.exit(0);
  }

  // Queue tasks - use array index as priority for deterministic order
  const queued: Array<{ id: string; taskId: string; title: string }> = [];
  const failed: string[] = [];

  for (let i = 0; i < pendingTasks.length; i++) {
    const task = pendingTasks[i]!;
    const result = await queueTask(controlUrl, projectId, task, i);

    if (result) {
      queued.push({ id: result.id, taskId: task.id, title: task.title });
      updateTaskStatus(task.id, "queued");
      console.log(`  ✅ #${i + 1} ${task.id}: ${task.title}`);
    } else {
      failed.push(task.id);
      console.log(`  ❌ #${i + 1} ${task.id}: ${task.title} (failed)`);
    }
  }

  // Summary
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Queued: ${queued.length}
  Failed: ${failed.length}
  Total: ${pendingTasks.length}

🔗 View queue: ${controlUrl}/queue

📝 Next steps:
  1. Review queue in WebUI
  2. Adjust order if needed
  3. Run: /forge:forge
`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);

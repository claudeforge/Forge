#!/usr/bin/env node

// src/cli/add-tasks.ts
import { existsSync, readFileSync } from "fs";
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
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    project: "",
    control: "",
    tasksJson: ""
  };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--project" && args[i + 1]) {
      result.project = args[++i];
    } else if (arg === "--control" && args[i + 1]) {
      result.control = args[++i];
    } else if (arg === "--tasks-json" && args[i + 1]) {
      result.tasksJson = args[++i];
    }
    i++;
  }
  return result;
}
function buildCriteria(criteriaNames) {
  return criteriaNames.map((name, index) => {
    const id = `criterion-${index + 1}`;
    const lower = name.toLowerCase();
    if (lower === "tests pass") {
      return {
        id,
        type: "test-pass",
        name: "Tests Pass",
        config: { cmd: "npm test" }
      };
    }
    if (lower === "lint clean") {
      return {
        id,
        type: "lint-clean",
        name: "Lint Clean",
        config: { cmd: "npm run lint" }
      };
    }
    if (lower === "build") {
      return {
        id,
        type: "command",
        name: "Build",
        config: { cmd: "npm run build" }
      };
    }
    if (lower === "typecheck") {
      return {
        id,
        type: "command",
        name: "TypeCheck",
        config: { cmd: "npm run typecheck" }
      };
    }
    return {
      id,
      type: "command",
      name,
      config: { cmd: name }
    };
  });
}
async function addTask(controlUrl, projectId, task, priority) {
  try {
    const criteria = buildCriteria(task.criteria || []);
    const response = await fetch(`${controlUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: task.name,
        prompt: task.prompt,
        priority,
        config: {
          criteria,
          maxIterations: task.maxIterations || 30
        }
      })
    });
    if (!response.ok) {
      console.error(`Failed to add task "${task.name}": ${response.status}`);
      return null;
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Failed to add task "${task.name}":`, error);
    return null;
  }
}
async function main() {
  const args = parseArgs();
  const config = loadConfig();
  const projectId = args.project || config.projectId;
  const controlUrl = args.control || config.controlUrl;
  if (!projectId || !controlUrl || !args.tasksJson) {
    console.error("Usage: add-tasks [--project ID] [--control URL] --tasks-json 'JSON'");
    console.error("");
    console.error("Arguments:");
    console.error("  --project ID       Project ID (optional if linked via .forge.json)");
    console.error("  --control URL      Control Center URL (optional if linked)");
    console.error("  --tasks-json JSON  JSON array of tasks (required)");
    console.error("");
    console.error("Tip: Run /forge:forge-link to save project config");
    process.exit(1);
  }
  let tasks;
  try {
    tasks = JSON.parse(args.tasksJson);
  } catch {
    console.error("Invalid JSON in --tasks-json");
    process.exit(1);
  }
  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.error("--tasks-json must be a non-empty array");
    process.exit(1);
  }
  console.log(`
\u{1F4CB} Adding ${tasks.length} tasks to queue...
`);
  const added = [];
  const failed = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const result = await addTask(controlUrl, projectId, task, i);
    if (result) {
      added.push(result);
      console.log(`  \u2705 ${i + 1}. ${task.name}`);
    } else {
      failed.push(task.name);
      console.log(`  \u274C ${i + 1}. ${task.name} (failed)`);
    }
  }
  console.log(`
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4CA} Summary
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
  Added: ${added.length}
  Failed: ${failed.length}
  Total: ${tasks.length}

${added.length > 0 ? `\u{1F517} Review tasks at: ${controlUrl}

\u{1F4DD} Next steps:
  1. Open the WebUI to review and reorder tasks
  2. Edit any task details if needed
  3. Run: /forge:forge
` : ""}
`);
  if (failed.length > 0) {
    process.exit(1);
  }
}
main().catch(console.error);

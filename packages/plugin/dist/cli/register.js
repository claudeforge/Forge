#!/usr/bin/env node
import {
  FORGE_DIR
} from "../chunk-FJGGFLPX.js";

// src/cli/register.ts
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, basename } from "path";
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    projectName: basename(process.cwd()),
    url: "http://127.0.0.1:3344"
  };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--url" && args[i + 1]) {
      result.url = args[++i];
    } else if (!arg.startsWith("--") && arg) {
      result.projectName = arg;
    }
    i++;
  }
  return result;
}
async function checkControlCenter(url) {
  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3e3)
    });
    return response.ok;
  } catch {
    return false;
  }
}
async function registerProject(url, name, path) {
  try {
    const response = await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, path })
    });
    if (!response.ok) {
      const error = await response.text();
      console.error(`Registration failed: ${response.status} - ${error}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to register:", error);
    return null;
  }
}
function loadExistingConfig() {
  const configPath = join(FORGE_DIR, "config.json");
  if (!existsSync(configPath)) return null;
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}
function saveConfig(config) {
  if (!existsSync(FORGE_DIR)) {
    mkdirSync(FORGE_DIR, { recursive: true });
  }
  const configPath = join(FORGE_DIR, "config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}
async function main() {
  const args = parseArgs();
  const projectPath = process.cwd();
  console.log(`
\u{1F525} FORGE Register
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

Project: ${args.projectName}
Path: ${projectPath}
Control Center: ${args.url}
`);
  console.log("Checking Control Center...");
  const isRunning = await checkControlCenter(args.url);
  if (!isRunning) {
    console.error(`
\u274C Control Center is not running at ${args.url}

Start it with:
  cd path/to/forge && pnpm dev:server

Or use npx:
  npx @claudeforge/forge-server

Then try again:
  /forge:forge-register "${args.projectName}"
`);
    process.exit(1);
  }
  console.log("\u2713 Control Center is running\n");
  const existingConfig = loadExistingConfig();
  if (existingConfig?.controlCenter?.projectId) {
    console.log(
      `Note: Project was previously registered as ${existingConfig.controlCenter.projectId}`
    );
    console.log("Updating registration...\n");
  }
  console.log("Registering project...");
  const result = await registerProject(args.url, args.projectName, projectPath);
  if (!result) {
    console.error("Failed to register project. See error above.");
    process.exit(1);
  }
  const config = {
    controlCenter: {
      enabled: true,
      url: args.url,
      projectId: result.id,
      projectName: result.name,
      registeredAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    autoSync: true,
    webhooksEnabled: true
  };
  saveConfig(config);
  console.log(`
\u2705 Project registered with FORGE Control Center!

Project: ${result.name}
ID: ${result.id}
Path: ${projectPath}
Control Center: ${args.url}

Features enabled:
  \u2713 Real-time task monitoring
  \u2713 Centralized queue management
  \u2713 Token usage analytics
  \u2713 Spec/Plan/Task synchronization

View in dashboard: ${args.url}

Next steps:
  1. Create a spec: /forge:forge-spec "Your feature description"
  2. Open dashboard: ${args.url}
`);
}
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

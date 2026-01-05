#!/usr/bin/env node
/**
 * FORGE Register CLI
 * Registers project with Control Center
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { FORGE_DIR } from "@claudeforge/forge-shared/constants";

interface ForgeConfig {
  controlCenter: {
    enabled: boolean;
    url: string;
    projectId: string;
    projectName: string;
    registeredAt: string;
  };
  autoSync: boolean;
  webhooksEnabled: boolean;
}

interface RegisterArgs {
  projectName: string;
  url: string;
}

function parseArgs(): RegisterArgs {
  const args = process.argv.slice(2);
  const result: RegisterArgs = {
    projectName: basename(process.cwd()),
    url: "http://127.0.0.1:3344",
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--url" && args[i + 1]) {
      result.url = args[++i]!;
    } else if (!arg!.startsWith("--") && arg) {
      result.projectName = arg;
    }
    i++;
  }

  return result;
}

async function checkControlCenter(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface RegisterResponse {
  id: string;
  name: string;
  path: string;
}

async function registerProject(
  url: string,
  name: string,
  path: string
): Promise<RegisterResponse | null> {
  try {
    const response = await fetch(`${url}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, path }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Registration failed: ${response.status} - ${error}`);
      return null;
    }

    return (await response.json()) as RegisterResponse;
  } catch (error) {
    console.error("Failed to register:", error);
    return null;
  }
}

function loadExistingConfig(): Partial<ForgeConfig> | null {
  const configPath = join(FORGE_DIR, "config.json");
  if (!existsSync(configPath)) return null;

  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

function saveConfig(config: ForgeConfig): void {
  if (!existsSync(FORGE_DIR)) {
    mkdirSync(FORGE_DIR, { recursive: true });
  }

  const configPath = join(FORGE_DIR, "config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function main(): Promise<void> {
  const args = parseArgs();
  const projectPath = process.cwd();

  console.log(`
🔥 FORGE Register
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${args.projectName}
Path: ${projectPath}
Control Center: ${args.url}
`);

  // Step 1: Check Control Center
  console.log("Checking Control Center...");
  const isRunning = await checkControlCenter(args.url);

  if (!isRunning) {
    console.error(`
❌ Control Center is not running at ${args.url}

Start it with:
  cd path/to/forge && pnpm dev:server

Or use npx:
  npx @claudeforge/forge-server

Then try again:
  /forge:forge-register "${args.projectName}"
`);
    process.exit(1);
  }

  console.log("✓ Control Center is running\n");

  // Step 2: Check existing registration
  const existingConfig = loadExistingConfig();
  if (existingConfig?.controlCenter?.projectId) {
    console.log(
      `Note: Project was previously registered as ${existingConfig.controlCenter.projectId}`
    );
    console.log("Updating registration...\n");
  }

  // Step 3: Register with server
  console.log("Registering project...");
  const result = await registerProject(args.url, args.projectName, projectPath);

  if (!result) {
    console.error("Failed to register project. See error above.");
    process.exit(1);
  }

  // Step 4: Save configuration
  const config: ForgeConfig = {
    controlCenter: {
      enabled: true,
      url: args.url,
      projectId: result.id,
      projectName: result.name,
      registeredAt: new Date().toISOString(),
    },
    autoSync: true,
    webhooksEnabled: true,
  };

  saveConfig(config);

  console.log(`
✅ Project registered with FORGE Control Center!

Project: ${result.name}
ID: ${result.id}
Path: ${projectPath}
Control Center: ${args.url}

Features enabled:
  ✓ Real-time task monitoring
  ✓ Centralized queue management
  ✓ Token usage analytics
  ✓ Spec/Plan/Task synchronization

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

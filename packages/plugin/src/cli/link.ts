#!/usr/bin/env node
/**
 * FORGE Link CLI
 * Creates .forge.json config file to link directory to a project
 */

import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface LinkArgs {
  project: string;
  control: string;
}

function parseArgs(): LinkArgs {
  const args = process.argv.slice(2);
  const result: LinkArgs = {
    project: "",
    control: "",
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--project" && args[i + 1]) {
      result.project = args[++i]!;
    } else if (arg === "--control" && args[i + 1]) {
      result.control = args[++i]!;
    }
    i++;
  }

  return result;
}

async function verifyProject(controlUrl: string, projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`${controlUrl}/api/projects`);
    if (!response.ok) return false;

    const projects = await response.json() as Array<{ id: string; name: string }>;
    return projects.some(p => p.id === projectId);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.project || !args.control) {
    console.error("Usage: forge-link --project ID --control URL");
    console.error("");
    console.error("Required arguments:");
    console.error("  --project ID    Project ID from Control Center");
    console.error("  --control URL   Control Center URL");
    process.exit(1);
  }

  const configPath = join(process.cwd(), ".forge.json");

  // Verify connection to Control Center
  console.log(`Verifying connection to ${args.control}...`);

  const projectExists = await verifyProject(args.control, args.project);
  if (!projectExists) {
    console.error(`\n❌ Project "${args.project}" not found at ${args.control}`);
    console.error("   Make sure the project ID is correct and Control Center is running.");
    process.exit(1);
  }

  // Check if config already exists
  if (existsSync(configPath)) {
    console.log(`\n⚠️  Updating existing .forge.json`);
  }

  // Write config
  const config = {
    projectId: args.project,
    controlUrl: args.control,
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

  console.log(`
✅ Directory linked to FORGE project!

Config saved to: .forge.json
  Project ID: ${args.project}
  Control URL: ${args.control}

You can now run commands without --project and --control:
  /forge:forge
  /forge:forge-tasks "Your task description"
`);
}

main().catch(console.error);

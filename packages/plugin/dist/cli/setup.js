#!/usr/bin/env node

// src/cli/setup.ts
import { existsSync, mkdirSync, cpSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
var __dirname = dirname(fileURLToPath(import.meta.url));
function main() {
  const targetDir = process.argv[2] || process.cwd();
  const pluginDir = join(targetDir, ".claude", "plugins", "forge");
  console.log(`
\u{1F525} FORGE Setup
`);
  console.log(`Target: ${resolve(targetDir)}`);
  if (!existsSync(pluginDir)) {
    mkdirSync(pluginDir, { recursive: true });
    console.log(`\u2713 Created ${pluginDir}`);
  }
  const pluginRoot = resolve(__dirname, "..", "..");
  const filesToCopy = [
    { src: ".claude-plugin/plugin.json", dest: ".claude-plugin/plugin.json" },
    { src: ".claude-plugin/hooks.json", dest: ".claude-plugin/hooks.json" },
    { src: "hooks/hooks.json", dest: "hooks/hooks.json" },
    { src: "dist/cli/init.js", dest: "dist/cli/init.js" },
    { src: "dist/hooks/stop.js", dest: "dist/hooks/stop.js" }
  ];
  const commandsDir = join(pluginRoot, "commands");
  const targetCommandsDir = join(pluginDir, "commands");
  if (existsSync(commandsDir)) {
    cpSync(commandsDir, targetCommandsDir, { recursive: true });
    console.log(`\u2713 Copied commands/`);
  }
  for (const file of filesToCopy) {
    const srcPath = join(pluginRoot, file.src);
    const destPath = join(pluginDir, file.dest);
    if (existsSync(srcPath)) {
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      cpSync(srcPath, destPath);
      console.log(`\u2713 Copied ${file.src}`);
    }
  }
  console.log(`
\u2705 FORGE installed successfully!

Usage:
  /forge "Your task" --until "tests pass" --control "http://localhost:3344"

Commands:
  /forge        - Start iterative loop
  /forge-status - Check current status
  /forge-stop   - Stop the loop
`);
}
main();

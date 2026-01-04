/**
 * FORGE Setup CLI
 * Adds FORGE plugin to a project's .claude/plugins directory
 */

import { existsSync, mkdirSync, writeFileSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function main(): void {
  const targetDir = process.argv[2] || process.cwd();
  const pluginDir = join(targetDir, ".claude", "plugins", "forge");

  console.log(`\n🔥 FORGE Setup\n`);
  console.log(`Target: ${resolve(targetDir)}`);

  // Create .claude/plugins/forge directory
  if (!existsSync(pluginDir)) {
    mkdirSync(pluginDir, { recursive: true });
    console.log(`✓ Created ${pluginDir}`);
  }

  // Get plugin root (2 levels up from dist/cli)
  const pluginRoot = resolve(__dirname, "..", "..");

  // Copy plugin files
  const filesToCopy = [
    { src: ".claude-plugin/plugin.json", dest: ".claude-plugin/plugin.json" },
    { src: "hooks/hooks.json", dest: "hooks/hooks.json" },
    { src: "dist/cli/init.js", dest: "dist/cli/init.js" },
    { src: "dist/hooks/stop.js", dest: "dist/hooks/stop.js" },
  ];

  // Copy commands folder
  const commandsDir = join(pluginRoot, "commands");
  const targetCommandsDir = join(pluginDir, "commands");
  if (existsSync(commandsDir)) {
    cpSync(commandsDir, targetCommandsDir, { recursive: true });
    console.log(`✓ Copied commands/`);
  }

  // Copy individual files
  for (const file of filesToCopy) {
    const srcPath = join(pluginRoot, file.src);
    const destPath = join(pluginDir, file.dest);

    if (existsSync(srcPath)) {
      const destDir = dirname(destPath);
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      cpSync(srcPath, destPath);
      console.log(`✓ Copied ${file.src}`);
    }
  }

  console.log(`
✅ FORGE installed successfully!

Usage:
  /forge "Your task" --until "tests pass" --control "http://localhost:3344"

Commands:
  /forge        - Start iterative loop
  /forge-status - Check current status
  /forge-stop   - Stop the loop
`);
}

main();

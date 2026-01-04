/**
 * Shell command execution utilities
 * Uses execFileSync for security - prevents shell injection
 */

import { execFileSync, type ExecFileSyncOptions } from "node:child_process";

export interface ShellResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Execute a command with arguments safely using execFileSync
 * This prevents shell injection vulnerabilities
 */
export function execFile(
  command: string,
  args: string[] = [],
  options?: ExecFileSyncOptions
): ShellResult {
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 60000, // 1 minute timeout
      shell: false,
      ...options,
    });

    return {
      success: true,
      exitCode: 0,
      stdout: String(stdout).trim(),
      stderr: "",
    };
  } catch (error: unknown) {
    const e = error as {
      status?: number;
      stdout?: Buffer | string;
      stderr?: Buffer | string;
    };

    return {
      success: false,
      exitCode: e.status ?? 1,
      stdout: String(e.stdout ?? "").trim(),
      stderr: String(e.stderr ?? "").trim(),
    };
  }
}

/**
 * Execute git command with arguments
 */
export function git(args: string[], options?: ExecFileSyncOptions): ShellResult {
  return execFile("git", args, options);
}

/**
 * Execute npm command with arguments
 */
export function npm(args: string[], options?: ExecFileSyncOptions): ShellResult {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return execFile(npmCmd, args, options);
}

/**
 * Check if a command exists in PATH
 */
export function commandExists(cmd: string): boolean {
  const checkCmd = process.platform === "win32" ? "where" : "which";
  const result = execFile(checkCmd, [cmd]);
  return result.success;
}
